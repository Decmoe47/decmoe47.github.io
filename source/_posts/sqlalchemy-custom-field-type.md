---
categories:
  - - 编程
    - Python
    - sqlalchemy
  - - 编程
    - Python
    - sqlmodel
title: sqlalchemy自定义字段类型
date: 2025-03-16
abbrlink: 557ae48e
---

代码示例：

```python
# base.py

import uuid

from pydantic import BaseModel
from sqlmodel import Field, SQLModel, String, TypeDecorator  # type: ignore


class BaseEntity(SQLModel, BaseModel):
    id: str = Field(primary_key=True, default=uuid.uuid4().__str__())

    class Config:  # type: ignore
        arbitrary_types_allowed = True
```

```python
# type.py

from datetime import datetime

from sqlalchemy.engine import Dialect
from sqlmodel import String, TypeDecorator

from util.time import unix_begin_date


class DatetimeToStrType(TypeDecorator[datetime]):
    impl = String
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> str:
        if value is not None:
            return value.strftime("%Y-%m-%d_%H:%M:%S%z")
        else:
            return unix_begin_date

    def process_result_value(self, value: str, dialect: Dialect) -> datetime | None:
        return datetime.strptime(value, "%Y-%m-%d_%H:%M:%S%z")
```

```python
# bilibili.py

from datetime import datetime

from sqlmodel import Column, Field  # type: ignore

from model.dto.bilibili import DynamicType, LiveStatusType
from model.entity.base import BaseEntity
from model.entity.type import DatetimeToStrType
from util.time import unix_begin_date


class BilibiliSubscribeEntity(BaseEntity, table=True):
    __tablename__ = "bilibili_subscribe"  # type: ignore

    uid: str
    uname: str
    last_dynamic_time: datetime = Field(
        default=unix_begin_date, sa_column=Column(DatetimeToStrType)
    )
    last_dynamic_type: DynamicType = Field(default=DynamicType.TEXT_ONLY)
    last_live_status: LiveStatusType = Field(default=LiveStatusType.NoLiveStream)
```


这里 `sa_column=Column(DatetimeToStrType)` 是关键，没有就会抛异常。类型注解依然可以使用 `datetime` ，而 `sa_column` 应该就是指定数据库的数据类型的。


```python
# main.py

import asyncio
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from model.entity.bilibili import BilibiliSubscribeEntity


async def main():
    b = BilibiliSubscribeEntity(
        uid="123", uname="adwjo", last_dynamic_time=datetime.now()
    )
    engine = create_async_engine("sqlite+aiosqlite:///test.db")

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

    async with AsyncSession(engine) as session:
        session.add(b)
        await session.commit()


asyncio.run(main())
```


