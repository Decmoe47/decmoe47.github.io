---
categories:
  - - 编程
    - Python
title: python使用dotenv的坑
date: 2025-03-16
abbrlink: 43f1d3a6
---

# 坑一：默认不会更新的配置项

官方文档的例子简单易懂。

```python
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())
```

然而这个例子里面缺隐藏了一个大坑。此时当用户在`.env`中更新配置项的值时，是不会生效的。原因是`load_dotenv`默认不会更新已经存在的配置项。推荐使用`override`参数，推荐代码如下:

```python
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)
```

# 坑二：`#`的处理

考虑`.env`中的如下写法:

```env
BASEURL=http://codehub.com/#/python
```

暂且不讨论在url中带`#`是否优雅。`#`在url中表示锚点，的确是会经常用到的；然而在`Python`中却是表示注释开始。此时`BASEURL`的值会是`http://codehub.com/`。以下写法均符合预期。

```latex
BASEURL="http://codehub.com/#/python"
BASEURL='http://codehub.com/#/python'
```

需要使用双引号/单引号括起来。
