---
categories:
  - - 编程
    - Kotlin
    - Spring
title: kotlin spring项目中校验非空基本类型时@NotNull无效的问题
abbrlink: e4685d29
date: 2025-12-21 00:00:00
---

由于kotlin的基本类型（以下以Int为例）在非空时编译后的java类型为java基本类型，可空时则为包装类型（例如 `Int` 变为 `int` ，而 `Int?` 变为 `Integer` ），这导致了spring校验基本类型时如果使用 `@NotNull` ，前端又传了个null或者没传值，jackson会默认转换成基本类型的默认值，从而逃过了 `@NotNull` 。

可以看看jackson的源码（jackson-databind-3.0.2）：

```java
public abstract class StdDeserializer<T>
    extends ValueDeserializer<T>
    implements ValueInstantiator.Gettable
{

（中略）

    protected int _parseIntPrimitive(JsonParser p, DeserializationContext ctxt)
        throws JacksonException
    {
        String text;
        switch (p.currentTokenId()) {
        
        （中略）

        case JsonTokenId.ID_NULL:
            _verifyNullForPrimitive(ctxt);
            return 0;

        （中略）
    }

    /**
     * Method called to verify that {@code null} token from input is acceptable
     * for primitive (unboxed) target type. It should NOT be called if {@code null}
     * was received by other means (coerced due to configuration, or even from
     * optionally acceptable String {@code "null"} token).
     */
    protected final void _verifyNullForPrimitive(DeserializationContext ctxt)
        throws DatabindException
    {
        if (ctxt.isEnabled(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)) {
            ctxt.reportInputMismatch(this,
"Cannot coerce `null` to %s (disable `DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES` to allow)",
                    _coercedTypeDesc());
        }
    }
    
（中略）

}
```

> `_parseIntPrimitive` 调用的地方在 `tools.jackson.databind.deser.jdk.NumberDeserializers.IntegerDeserializer.deserialize` ，也就是jackson对于json `number` 类型的预设解析器中（其他类型同理）

可以看出到来，对于 `int` ，当 `FAIL_ON_NULL_FOR_PRIMITIVES` 没开启时jackson就直接返回 `0` 了。

诚然，在java里我们都不会给前端接收用的dto设基本类型字段，但在kotlin里因为语言特性，kotlin基本类型不写 `?` 的话就会自动转换成java基本类型。可对于service层来说，这个字段已经经过非空校验，业务上一定是非空的了，加上 `?` 的话反而麻烦自己。

因此通过设置 `FAIL_ON_NULL_FOR_PRIMITIVES` 使其抛出异常，然后在全局异常处理器中接住，返回伪装成和spring校验一样的response即可。

```yaml
# application.yml

spring:
  jackson:
    deserialization:
      fail-on-null-for-primitives: true
```

```kotlin
@RestControllerAdvice(basePackages = ["com.example.app"])
class GlobalExceptionHandler {
    /**
     * 对于kotlin非空基本类型编译后成为java基本类型的字段校验，jackson会直接返回默认值，导致逃过了 `@NotNull` 校验。
     * 开启jackson的 `FAIL_ON_NULL_FOR_PRIMITIVES` 后则会抛出异常，然后在全局异常处理中伪装成和spring校验失败时一样的response，
     * 以此来解决该问题。
     *
     * @see tools.jackson.databind.deser.std.StdDeserializer._verifyNullForPrimitive
     */
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadable(ex: HttpMessageNotReadableException): ResponseEntity<Any?> {
        val cause = ex.cause
        if (cause is MismatchedInputException) {
            val fieldName = cause.path.joinToString(".") { it.fieldName ?: "" }

            val errorMsg = if (cause.targetType?.isPrimitive == true
                && cause.message?.contains("FAIL_ON_NULL_FOR_PRIMITIVES") == true
            ) "字段 [$fieldName] 缺失或不能为 null"
            else "字段 [$fieldName] 类型错误"

            return ResponseEntity.badRequest().body(mapOf(
                "code" to 400,
                "field" to fieldName,
                "message" to errorMsg
            ))
        }
        return ResponseEntity.badRequest().body(mapOf("message" to "请求体格式错误"))
    }
}
```

这种解决办法缺点也很明显，这只能返回一个有问题的字段，其他字段（如 `String` ）的校验错误因为抢在了spring校验前返回response，也就没法得到了。但其他方法例如写一个专门的value class包装给jackson看：

```kotlin
@JvmInline
value class W<T>(
    @get:JsonValue val value: T?
) {
    companion object {
        // Jackson 会调用这个构造器，允许传入 null
        @JsonCreator
        @JvmStatic
        fun <T> of(value: T?): W<T> = W(value)
    }
    
    // 方便取出非空值的辅助方法（类似 Optional.get）
    fun get(): T = value ?: throw IllegalStateException("Value is null")
}
```

或者直接实现个拥有 `Int` 能力的自定义类：

```kotlin
@JvmInline
value class SInt(
    @get:JsonValue val value: Int?
) : Comparable<SInt>, Number() { // 继承 Number 甚至可以让它混入一些泛型计算

    companion object {
        @JsonCreator
        @JvmStatic
        fun of(v: Int?): SInt = SInt(v)
    }

    // --- 核心：手动赋予它 Int 的能力 ---

    // 1. 强制非空获取 (业务层确信已校验过时使用)
    // 类似于 Integer.intValue()
    fun v(): Int = value ?: throw IllegalStateException("SInt value is null (Validation failed?)")

    // 2. 支持 + - * / 运算
    // 允许: SInt + Int
    operator fun plus(other: Int): Int = v() + other
    operator fun minus(other: Int): Int = v() - other
    operator fun times(other: Int): Int = v() * other
    operator fun div(other: Int): Int = v() / other

    // 允许: SInt + SInt
    operator fun plus(other: SInt): Int = v() + other.v()
    operator fun minus(other: SInt): Int = v() - other.v()

    // 3. 支持比较 (> < >= <=)
    // 允许: val isAdult = age >= 18
    operator fun compareTo(other: Int): Int = v().compareTo(other)
    
    override operator fun compareTo(other: SInt): Int = v().compareTo(other.v())

    // 4. 实现 Number 抽象类的必须方法
    override fun toByte(): Byte = v().toByte()
    override fun toDouble(): Double = v().toDouble()
    override fun toFloat(): Float = v().toFloat()
    override fun toInt(): Int = v()
    override fun toLong(): Long = v().toLong()
    override fun toShort(): Short = v().toShort()
    
    // 5. toString 优化
    override fun toString(): String = value?.toString() ?: "null"
}
```

似乎可行，但代码量过多，又或者对于service层调用字段的方式有影响，因此还是全局异常处理的方案最好。

---

参考：[not-null requirement ignored for primitives in data classes · Issue #242 · FasterXML/jackson-module-kotlin](https://github.com/FasterXML/jackson-module-kotlin/issues/242)