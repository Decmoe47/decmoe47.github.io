---
categories:
  - - 编程
    - Kotlin
    - Spring
title: kotlin springboot的配置类报错No default constructor found——不要给bean的构造器里写默认值
abbrlink: 79a2cbaa
date: 2026-01-12 00:00:00
---

源码：

```kotlin
@Configuration
class MailConfig(
    @param:Value($$"${spring.mail.host}")
    private val host: String,

    @param:Value($$"${spring.mail.port}")
    private val port: Int = 0,

    @param:Value($$"${spring.mail.username}")
    private val username: String,

    @param:Value($$"${spring.mail.password}")
    private val password: String,

    @param:Value($$"${spring.mail.protocol}")
    private val protocol: String
) {
    @Bean
    fun javaMailSender(): JavaMailSender {
        val sender = JavaMailSenderImpl()
        sender.host = host
        sender.port = port
        sender.username = username
        sender.password = password
        sender.defaultEncoding = "Utf-8"
        sender.protocol = protocol
        return sender
    }
}
```

运行时报错 `Failed to instantiate ... MailConfig$$SpringCGLIB$$0: No default constructor found` ，原因是当有默认值时，编译出来的java会生成多个构造器，而spring不知道该用哪个构造器，于是回退尝试调用无参构造器，结果发现不存在，就抛出异常了。

解决办法就是不要在bean的构造器上写默认值。此外如果没有引用到其他bean，写成 `@Configuration(proxyBeanMethods = false)` 禁用bean方法代理的同时提升点性能。

```kotlin
@Configuration(proxyBeanMethods = false)
class MailConfig(
    @param:Value($$"${spring.mail.host}")
    private val host: String,

    @param:Value($$"${spring.mail.port:0}")  // 其实默认值更应该写在application.yml里
    private val port: Int,

    @param:Value($$"${spring.mail.username}")
    private val username: String,

    @param:Value($$"${spring.mail.password}")
    private val password: String,

    @param:Value($$"${spring.mail.protocol}")
    private val protocol: String
) {
    @Bean
    fun javaMailSender(): JavaMailSender {
        val sender = JavaMailSenderImpl()
        sender.host = host
        sender.port = port
        sender.username = username
        sender.password = password
        sender.defaultEncoding = "Utf-8"
        sender.protocol = protocol
        return sender
    }
}
```