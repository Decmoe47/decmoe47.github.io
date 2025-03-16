---
categories:
  - [编程, Go, zerolog]
---

只需实现zerolog的`LevelWriter`接口（[zerolog/writer.go at d894f123bc5c2a887c95e90218b9410563141d67 · rs/zerolog · GitHub](https://github.com/rs/zerolog/blob/d894f123bc5c2a887c95e90218b9410563141d67/writer.go#L15-L18)）即可。

```go
type LevelWriter struct {  
   io.Writer   
   Level       zerolog.Level  
}  
  
func (lw *LevelWriter) WriteLevel(l zerolog.Level, p []byte) (n int, err error) {  
   if l >= lw.Level {  // Notice that it's ">=", not ">"!
	   return lw.Writer.Write(p)  
	}
   return len(p), nil
}
```

之所以和参考的不同，是因为发现了 `zerolog.MultiLevelWriter()` 的注释（[zerolog/writer.go at d894f123bc5c2a887c95e90218b9410563141d67 · rs/zerolog · GitHub](https://github.com/rs/zerolog/blob/d894f123bc5c2a887c95e90218b9410563141d67/writer.go#L90-L93)）里写了如果传入的是实现了 `LevelWriter` 的话，就只会调用 `WriteLevel()` 而不会再调用 `Write()` ，因此只需要一个 `l >= lw.Level` 就行了。

注意一定是 `>=` 而不是 `>` ，否则同等level的log就会被忽略。

而之所以要返回 `len(p)`，是源码（[zerolog/writer.go at d894f123bc5c2a887c95e90218b9410563141d67 · rs/zerolog · GitHub](https://github.com/rs/zerolog/blob/d894f123bc5c2a887c95e90218b9410563141d67/writer.go#L82-L83)）有一个判断返回的 `n` 是不是和传入的 `p` 的长度一致，否则会抛错误。但对于我们来说，如果要打印的log没满足我们设定的最低level要求，就不想让它打印出来，因此应该是直接跳过，所以就有了 `return len(p), nil` 。

<br>

使用例子：

```go
// use case

consoleWriter := zerolog.NewConsoleWriter(  
   func(w *zerolog.ConsoleWriter) {  
      w.Out = os.Stderr  
      w.TimeFormat = time.RFC3339  
      w.FormatErrFieldName = func(i interface{}) string {  
         if i.(string) == "error" {  
            return fmt.Sprintf("\n\n- %s: ", i)  
         }  
         return fmt.Sprintf("\n- %s: ", i)  
      }  
      w.FormatFieldName = func(i interface{}) string {  
         return fmt.Sprintf("\n- %s: ", i)  
      }  
      w.FormatFieldValue = func(i interface{}) string {  
         value := fmt.Sprintf("%s", i)  
         result, err := strconv.Unquote(value)  
         if err != nil {  
            result = value  
         }  
         return result  
      }  
   },  
)  
consoleWriterLeveled := &LevelWriter{Writer: consoleWriter, Level: zerolog.DebugLevel}  // Writer就是struct里的匿名字段io.Writer
  
fileWriter := &lumberjack.Logger{  
   Filename:   "log/server.log",  
   MaxSize:    1,  
   MaxAge:     30,  
   MaxBackups: 5,  
   LocalTime:  false,  
   Compress:   false,  
}  
fileWriterLeveled := &LevelWriter{Writer: fileWriter, Level: zerolog.WarnLevel}

log.Logger = log.Output(zerolog.MultiLevelWriter(consoleWriterLeveled, fileWriterLeveled))
```

***

参考：[Multiple writers, different levels on each? · Issue #150 · rs/zerolog · GitHub](https://github.com/rs/zerolog/issues/150#issuecomment-764720813)
