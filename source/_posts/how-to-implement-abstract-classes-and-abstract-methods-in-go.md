---
categories:
  - [编程, Go]
title: go如何实现抽象类和抽象方法，父类方法调用子类实现的方法
---

```go
package main

import "fmt"

type IFace interface {
    check() bool
    do()
}

type Abstract struct {
    IFace
}

func (a *Abstract) add() {
    fmt.Println(a.check())
}

type Impl struct {
    Abstract
}

func (i *Impl) checkId() bool {
    return true
}

func main() {
    i := &Impl{}
    i.IFace = i // 这一步必不可少，否则会panic
    i.add()
}
```

其实结构体里套接口实际是一个匿名字段，而new时候做的事就是把子类实例自身传进去，好让继承的父类方法能够调用到子类实现的方法。

***

参考：[oop - How to implement an abstract class in Go? - Stack Overflow](https://stackoverflow.com/questions/30261032/how-to-implement-an-abstract-class-in-go)