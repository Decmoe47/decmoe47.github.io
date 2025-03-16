---
categories:
  - [编程, Go]
title: go判断struct实例是不是哪个具体的struct
---

```go
// 注意`value`必须是值而不是指针！
//
// 如果判断为false，返回的值是实例化后的struct（字段均为零值）
func AssertStruct[T any](value any) (T, bool) {
	if v, ok := value.(T); ok {
		return v, true
	} else {
		return v, false
	}
}

// 使用
type MyStruct struct {
    Name string
}

func main() {
    myStruct := MyStruct{Name: "hellow"}
    if v, ok := AssertStruct[MyStruct](myStruct); ok {
        fmt.Println("yes")
    }
}
```