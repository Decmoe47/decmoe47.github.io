---
categories: 
  - [编程, nodejs, npm]
---

```shell
npm i -P
# or
npm install --production
```

不用担心`npm list --depth 0`里显示安装了开发环境的依赖，其实只是下载了元数据，并没有下载依赖，进`node_modules`里看也是没有的。

***

参考：[\[BUG\] \`npm install --production\` fails downloading devDependencies, installing nothing · Issue #4132 · npm/cli · GitHub](https://github.com/npm/cli/issues/4132#issuecomment-987044923)