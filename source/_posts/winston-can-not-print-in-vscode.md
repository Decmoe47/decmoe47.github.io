---
categories:
  - - 编程
    - nodejs
  - - 编程
    - Winston
title: Winston无法在vscode打印
date: 2025-03-16
abbrlink: f39e86a
---

如果`launch.json`设置的是

```json
"console": "internalConsole"
```

的话（nodejs的时候默认就是这个），就会发现Winston打印的没法在调试控制台里看到。但如果改换成`externalTerminal`或`integratedTerminal`的话就能看得到。
如果不想改console的话，就加上这个：

```json
"outputCapture": "std"
```

原因：https://github.com/winstonjs/winston/issues/1544#issuecomment-472199224
