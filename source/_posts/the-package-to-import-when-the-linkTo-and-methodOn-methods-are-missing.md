---
categories: 
    - [编程, Java, Spring]
title: linkTo和methodOn方法丢失该导什么包
---


最新版Spring HATEOAS已将 `ControllerLinkBuilder` 移动到 `server.mvc` 并被替换为 `WebMvcLinkBuilder`，因此应该如下导入：

```java
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;
```

----

参考：[Spring HATEOAS - Reference Documentation](https://docs.spring.io/spring-hateoas/docs/current/reference/html/)