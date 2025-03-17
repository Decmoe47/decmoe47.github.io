---
categories:
  - - 编程
    - TypeScript
title: prettier格式化所有文件
date: 2025-03-16
abbrlink: 18a4d588
---

```shell
npm i prettier
npm i -D prettier-plugin-organize-imports
```

然后在package.json中写入：

```json
"pretty": "prettier --write \"./src/**/*.{ts,js,jsx,json}\"" 
```
