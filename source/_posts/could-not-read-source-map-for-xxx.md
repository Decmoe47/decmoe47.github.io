---
categories:
  - - 编程
    - TypeScript
title: Could not read source map for xxx
date: 2025-03-16
abbrlink: 74b82b73
---

在launch.json中添加：

```json
"resolveSourceMapLocations": [
  "${workspaceFolder}/**",
  "!**/node_modules/**"
],
```

***

参考：[\[node-debugger\] Debugger spams "Could not read sourcemaps" messages · Issue #102042 · microsoft/vscode · GitHub](https://github.com/microsoft/vscode/issues/102042#issuecomment-656402933)
