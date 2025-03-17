---
categories:
  - - 编程
    - Go
    - 字符串
  - - 编程
    - Go
    - zerolog
title: go zerolog打印json值内的换行符不起作用——原始字符串转字符串字面量
date: 2025-03-16
abbrlink: 2b8a55e6
---

在使用go zerolog打印json log时发现json值的换行符不起作用。探究源码的时候发现了 `strconv.Quote()` ：

```go
// see https://github.com/rs/zerolog/blob/d894f123bc5c2a887c95e90218b9410563141d67/console.go#L226
switch fValue := evt[field].(type) {
case string:
	if needsQuote(fValue) {
		buf.WriteString(fv(strconv.Quote(fValue)))
	} else {
		buf.WriteString(fv(fValue))
	}
```

于是怀疑跟原始字符串有关。然后查找到如何将原始字符串转换为字符串字面量，知道了应该使用 ``strconv.Unquote(`"` + s + `"`)`` 。

```go
s := `hello\nWorld`
fmt.Println(s)
fmt.Println("----------")
unquoted, err := strconv.Unquote(`"` + s + `"`)
if err != nil {
	painc(err)
}
fmt.Println(unquoted)

// output:
// 
// hello\nWorld
// ----------
// hello
// world
```

***

参考：[Go - Is it possible to convert a raw string literal to an interpreted string literal? - Stack Overflow](https://stackoverflow.com/questions/63971092/go-is-it-possible-to-convert-a-raw-string-literal-to-an-interpreted-string-lit)