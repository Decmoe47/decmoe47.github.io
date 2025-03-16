---
categories:
  - [编程, TypeScript, tsc]
title: ts引用别名（绝对引用）转换为相对引用（解决tsc无法转换引用别名）
---

```shell
npm i tsc-alias -D
```

然后在`package.json`中写入：

```json
"build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
```