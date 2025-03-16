---
categories: 
  - [编程, TypeScript, tsc]
---

```shell
npm i tsc-alias -D
```

然后在`package.json`中写入：

```json
"build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
```