---
categories:
  - - 编程
    - Go
title: go如何实现抽象类和抽象方法，父类方法调用子类实现的方法
date: 2025-03-16
abbrlink: 27d41c70
---

代码示例：

```go
package main

import "fmt"

type MyInterface interface {
	Check() bool
	Do()
}

type Abstract struct {
	MyInterface
}

func (a *Abstract) Do() {
	fmt.Println(a.Check())
}

type Impl struct {
	*Abstract
}

func NewImpl() *Impl {
	a := &Abstract{}
	i := &Impl{a}
	a.MyInterface = i
	return i
}

func (i *Impl) Check() bool {
	return true
}

func main() {
	impl := NewImpl()
	impl.Do()
}
```

其实结构体里套接口实际是一个匿名字段，而new时候做的事就是把子类实例自身传进去，好让继承的父类方法能够调用到子类实现的方法。

***

参考：[oop - How to implement an abstract class in Go? - Stack Overflow](https://stackoverflow.com/questions/30261032/how-to-implement-an-abstract-class-in-go)