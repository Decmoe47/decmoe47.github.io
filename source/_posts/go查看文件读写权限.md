---
categories: 
  - [编程, Go]
---

在golang中，可以使用os.FileMode(perm).String()来查看权限标识：

```go
os.FileMode(0777).String()    //返回 -rwxrwxrwx
os.FileMode(0666).String()   //返回 -rw-rw-rw-
os.FileMode(0644).String()   //返回 -rw-r--r--  
```

- 0777表示：创建了一个普通文件，所有人拥有所有的读、写、执行权限
- 0666表示：创建了一个普通文件，所有人拥有对该文件的读、写权限，但是都不可执行
- 0644表示：创建了一个普通文件，文件所有者对该文件有读写权限，用户组和其他人只有读权限， 都没有执行权限
