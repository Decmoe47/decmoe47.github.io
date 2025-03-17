---
categories:
  - - 编程
    - Python
title: Python为类自身添加类型注解
date: 2025-03-16
abbrlink: '944e0939'
---

只需`from __future__ import annotations`

例如：

```python
from __future__ import annotations

class Position:
    def __add__(self, other: Position) -> Position:
        ...
```

来源：
https://stackoverflow.com/questions/33533148/how-do-i-type-hint-a-method-with-the-type-of-the-enclosing-class/33533514#33533514
