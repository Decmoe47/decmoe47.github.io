---
categories: 
  - [编程, Go]
---

开门见上，直接上代码：

```go
import "github.com/cockroachdb/errors"

func GetFirstError(errSlice *[]error) error {
	for _, err := range *errSlice {
		if err != nil {
			return err
		}
	}
	return nil
}

func GatherErrorNoReturn(returnErr error) func(errSlice *[]error) {
	return func(errSlice *[]error) {
		returnErr = errors.WithStack(returnErr)
		*errSlice = append(*errSlice, returnErr)
	}
}

// 收集error至内部error收集器，同时返回函数其他返回值。
//
// 此函数用于解决连续多个函数调用时造成大量iferr的情况，
// 但仅适用于这些连续多个函数调用返回的error不需要用于判断并当即return的情况，
// 也就是说当前即使有error依旧不影响接下来的连续多个函数调用。
// 然后直到再不判断并return就可能会影响接下来的代码执行时，再用GetFirstError取出第一个error。
//
// ※返回的是一个闭包，须继续调用，参数为一个error收集器（类型*[]error）
//
// ※error已附带堆栈
func GatherErrorReturnOne[T any](returnValue T, returnErr error) func(*[]error) T {
	return func(errSlice *[]error) T {
		returnErr = errors.WithStack(returnErr)
		*errSlice = append(*errSlice, returnErr)
		return returnValue
	}
}

func GatherErrorReturnTwo[A1 any, A2 any](returnValue1 A1, returnValue2 A2, returnErr error) func(*[]error) (A1, A2) {
	return func(errSlice *[]error) (A1, A2) {
		returnErr = errors.WithStack(returnErr)
		*errSlice = append(*errSlice, returnErr)
		return returnValue1, returnValue2
	}
}

func GatherErrorReturnThree[A1 any, A2 any, A3 any](returnValue1 A1, returnValue2 A2, returnValue3 A3, returnErr error) func(*[]error) (A1, A2, A3) {
	return func(errSlice *[]error) (A1, A2, A3) {
		returnErr = errors.WithStack(returnErr)
		*errSlice = append(*errSlice, returnErr)
		return returnValue1, returnValue2, returnValue3
	}
}

// 调用

func Test() error {
    var eg []error
    v1 := GatherErrorReturnOne(strconv.ParseInt("1", 10, 32))(&eg)
    v2 := GatherErrorReturnOne(strconv.ParseInt("v2", 10, 32))(&eg)
    v3 := GatherErrorReturnOne(strconv.ParseInt("3", 10, 32))(&eg)
    if err := GetFirstError(&eg); err != nil {
        return err
    }
    fmt.Println(v1, v2, v3)
    return nil
}

```

可以看到，这利用到了go1.18的泛型，使得能够直接获取返回值且不用再类型断言。而其内部也很简单，无反射。<br />当然适用的情形前面也说了，不需要当即判断并return的，不影响接下来几个代码执行的。

至于为何是搞个闭包，是因为像这样函数返回多个值的作为参数，go规定了返回的值的个数和类型必须和参数完全匹配（`...any`这样也算），所以没法做到第一次参数输入error收集器，第二个参数之后输入函数返回值：

```go
func GatherErrorReturnOne[T any](errSlice *[]error, returnValue T, returnErr error) T {
	*errSlice = append(*errSlice, returnErr)
	return returnValue
}

// v1 := errs.GatherErrorReturnOne(&errSlice, strconv.ParseInt("1", 10, 32)) 	这样会报错
```

具体可见官方解释：

> As a special case, if the return values of a function or method `g` are equal in number and individually assignable to the parameters of another function or method `f`, then the call `f(g(parameters_of_g))` will invoke `f` after binding the return values of g to the parameters of `f` in order. The call of `f` must contain no parameters other than the call of `g`, and `g` must have at least one return value. If `f` has a final `...` parameter, it is assigned the return values of `g` that remain after assignment of regular parameters.
>  
> [https://go.dev/ref/spec#Calls](https://go.dev/ref/spec#Calls)

另外也考虑过写成方法，但遗憾的是现在go还不支持对方法的参数泛型。
