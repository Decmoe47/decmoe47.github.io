---
categories:
  - - 编程
    - Java
    - Spring
title: >-
  RestTemplate请求aws s3下载文件报错Error parsing the X-Amz-Credential parameter; the
  Credential is mal-formed
abbrlink: d7505956
date: 2026-01-06 00:00:00
---

使用RestTemplate请求请求aws s3下载文件时，如果传递的url字符串已经经过编码（例如斜杠为 `%2F` ），aws会返回报错 `Error parsing the X-Amz-Credential parameter; the Credential is mal-formed`。

原因是字符串直接传给 `RestTemplate.exchange()` （ `getForObject()` 等其他方法也都一样，都是在背后都是调用了 `execute()` 方法）的话就会导致二次编码。具体可以看源码：

```java
// RestTemplate.java
	
	@Override
	public <T> ResponseEntity<T> exchange(String url, HttpMethod method,
			@Nullable HttpEntity<?> requestEntity, Class<T> responseType, Object... uriVariables)
			throws RestClientException {

		RequestCallback requestCallback = httpEntityCallback(requestEntity, responseType);
		ResponseExtractor<ResponseEntity<T>> responseExtractor = responseEntityExtractor(responseType);
		return nonNull(execute(url, method, requestCallback, responseExtractor, uriVariables));
	}
	
	...
	
	@Override
	@Nullable
	public <T> T execute(String uriTemplate, HttpMethod method, @Nullable RequestCallback requestCallback,
			@Nullable ResponseExtractor<T> responseExtractor, Object... uriVariables) throws RestClientException {

		URI url = getUriTemplateHandler().expand(uriTemplate, uriVariables);
		return doExecute(url, uriTemplate, method, requestCallback, responseExtractor);
	}
```

```java
// DefaultUriBuilderFactory.java

	@Override
	public URI expand(String uriTemplate, Object... uriVars) {
		return uriString(uriTemplate).build(uriVars);
	}
	
	...
	
	private class DefaultUriBuilder implements UriBuilder {
	
		...
	
		@Override
		public URI build(Object... uriVars) {
			if (ObjectUtils.isEmpty(uriVars) && !CollectionUtils.isEmpty(defaultUriVariables)) {
				return build(Collections.emptyMap());
			}
			if (encodingMode.equals(EncodingMode.VALUES_ONLY)) {
				uriVars = UriUtils.encodeUriVariables(uriVars);
			}
			UriComponents uric = this.uriComponentsBuilder.build().expand(uriVars);
			return createUri(uric);
		}
		
		...
	}
```

```java
// UriUtils.java

	public static Object[] encodeUriVariables(Object... uriVariables) {
		return Arrays.stream(uriVariables)
				.map(value -> {
					String stringValue = (value != null ? value.toString() : "");
					return encode(stringValue, StandardCharsets.UTF_8);
				})
				.toArray();
	}
```

可以看到最终来到了 `build()` 这里，而其中 `encodeUriVariables` 就是做了编码的操作。

解决办法也很简单，调用 `exchange()` 时不要传字符串，而是传 `URI` ：

```java
URI uri = URI.create(url);
ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, null, String.class);
```

源码中，首个参数为 `URI` 的 `execute()` 重载是不会发生编码操作，而是直接进行底层的 `doExecute()` ：

```java
// RestTemplate.java

	@Override
	@Nullable
	public <T> T execute(URI url, HttpMethod method, @Nullable RequestCallback requestCallback,
			@Nullable ResponseExtractor<T> responseExtractor) throws RestClientException {

		return doExecute(url, null, method, requestCallback, responseExtractor);
	}
```

另外，这个问题似乎在WebClient中也有：[https://stackoverflow.com/questions/74389361/upload-file-to-aws-s3-using-presigned-url-via-spring-webclient-error-the-crede](https://stackoverflow.com/questions/74389361/upload-file-to-aws-s3-using-presigned-url-via-spring-webclient-error-the-crede)

---

参考：

- [https://stackoverflow.com/questions/78703151/bad-request-errors-when-using-spring-restclient-to-call-aws-s3-predesigned-link](https://stackoverflow.com/questions/78703151/bad-request-errors-when-using-spring-restclient-to-call-aws-s3-predesigned-link)