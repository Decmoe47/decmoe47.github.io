---
categories:
  - [编程, Go, regexp]
title: go regexp不支持unicode
---

```go
reg := regexp.MustComplie(`[A-Za-z0-9-_\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)`)
```

会报错 ``error parsing regexp: invalid escape sequence: `\u` ``

因为go的regexp不支持 `\u` 。改用 `\x` 或者 `\p{class}`。

***

参考：[regex for Chinese · Issue #257 · google/mtail · GitHub](https://github.com/google/mtail/issues/257)