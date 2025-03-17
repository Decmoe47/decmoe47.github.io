---
categories:
  - - 编程
    - nodejs
title: >-
date: 2025-03-16
  node运行时报错TypeError Class extends value undefined is not a constructor or
  null（循环引用）
abbrlink: 51dd8b8d
---

解决循环引用用`madge`包

```shell
npm install madge -g
madge --circular --extensions ts ./src
```
