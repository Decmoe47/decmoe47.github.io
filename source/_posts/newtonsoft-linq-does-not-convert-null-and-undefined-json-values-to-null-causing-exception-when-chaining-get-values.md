---
categories:
  - [编程, CSharp, NewtonsoftJson]
title: Newtonsoft.Json.Linq默认不会将json值为null和undefined转换为null导致链式取值时抛异常
---

例如

```json
{
	"name": null
}
```

这样的json，使用 `JObject.Parse()` 或者 `JsonConvert.DeserializeObject()` 后，直接取name的值不进行显式转换，得到的值会是 `Newtonsoft.Json.JValue` 的空实例，而不是null。这导致如果需要使用 `?[]` 进行链式取值时（例如 `(string?)json["data"]?["cards"]?[0]?["names"]?[0]` 的names为null ）会抛出异常，因为中间并没有显式转换过，中间值也就不是null，null 条件运算符（ `?[]`）也就没用了。

解决办法就只能遍历值，把是null的和是undefined的删去。

```csharp
public static class JObjectExtensions
{
    public static JObject RemoveNullAndEmptyProperties(this JObject jObject)
    {
        while (jObject.Descendants().Any(NullOrUndefindedPredicate))
        {
            foreach (JToken jt in jObject.Descendants().Where(NullOrUndefindedPredicate).ToArray())
                jt.Remove();
        }

        return jObject;
    }

    private static bool NullOrUndefindedPredicate(JToken jt)
    {
        return jt.Type == JTokenType.Property
            && (jt.Values().All(a => a.Type == JTokenType.Null || a.Type == JTokenType.Undefined) || !jt.Values().Any());
    }
}
```

---

参考： [c# - JSON.NET serialize JObject while ignoring null properties - Stack Overflow](https://stackoverflow.com/a/60182337)