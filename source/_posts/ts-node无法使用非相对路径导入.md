---
categories: 
  - [编程, TypeScript, ts-node]
---

需要：

1. `npm i tsconfig-paths`
2. 在tsconfig.json中加入：

```json
"compilerOptions": {
  "baseUrl": "./"
}
"ts-node": {
  "require": ["tsconfig-paths/register"]	// 就是需要这个才行
}
```

参见：https://typestrong.org/ts-node/docs/paths/
来源：https://github.com/TypeStrong/ts-node/issues/634
