---
categories: 
  - [编程, Python]
---

# 格式化字符串常量（formatted string literals, f-string）

在字符串前加上`f`，字符串里就可以直接写变量名了（用`{}`括起来）。

```python
def manual_str_formatting(name, subscribers):
	print(f"Wow {name}! you have {subscribers} subscribers!")
```

# 上下文管理器

用`with`替代`finally: s.close()`。

```python
def finally_instead_of_context_manager(host, port):
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	try:
			s.connect((host, port))
			s.sendall(b'hello, world')
	finally:
			s.close()

# 用下面的替代上面的

def finally_instead_of_context_manager(host, port):
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
			s.connect((host, port))
			s.sendall(b'hello, world')
```

# 捕获异常

`except:`后要写明异常。如果是捕获所有异常，就写`Exception`。如果空着不写，会把`ctrl+c`也捕获进去，这样程序就无法被终止了。

# 判断实例的类型

判断实例的类型用`isinstance()`，因为：

- `type()`不会认为子类是一种父类类型，不考虑继承关系。
- `isinstance()`会认为子类是一种父类类型，考虑继承关系。

# 遍历列表

```python
a = [1, 2, 3]
b = [4, 5, 6]

# 只遍历值
for v in a:
		...
# 遍历索引和值
for i, v in enumerate(a):
		...
# 多个列表遍历值
for av, bv in zip(a, b):
		...
# 多个列表遍历索引和值
for i, (av, bv) in enumerate(zip(a, b)):
		...
```

# 遍历字典

```python
d = {"a": 1, "b": 2, "c": 3}
for key in d.keys():
		...
# 用下面的替代上面的（默认遍历键）
for key in d:
		...

# 同时遍历键和值
for k, v in d.items():
		...
```

# 性能计时器

```python
start = time.perf_counter()
time.sleep(1)
end = time.perf_counter()
print(end - start)
```
