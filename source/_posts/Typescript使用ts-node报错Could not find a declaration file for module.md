---
categories: 
  - [编程, TypeScript, ts-node]
---

ts要用js的第三方modules时，会提示你Could not find a declaration file for module，然后让你install `@types/对应的模块名`，或者自己写.d.ts文件。后者的话，随便在哪新建个`xxx.d.ts`文件，xxx自己取。然后文件里写上：

```typescript
declare module "模块名";
```

你可以多个模块声明写在一个文件里，也可以分开。

但是如果你用ts-node的话，写了.d.ts文件还不行，还是会报错找不到。<br />这时候需要你新建个文件夹，里面再新建个文件夹，然后里面放上.d.ts文件。例如：

> ┏ node_modules
> ┣ src
> ┗ index.ts
> ┣ types
> ┗ package
> ┗ alltypes.d.ts
> ┣ tsconfig.json
> ┗ package.json

然后在tsconfig.json里添加：

```json
"ts-node": {
  "compilerOptions": {
		（中略）
		"typeRoots": ["./node_modules/@types", "./types"]
        }
    }
```

重点是`"./types"`部分，让ts-node知道你的.d.ts在哪里。其实文件夹types和package随你换别的名字，甚至文件夹结构怎么样都无所谓，最关键的是上面.d.ts文件和你写到typeRoots里的文件夹**中间还加了一层文件夹**。如果直接是：

> ┣ types
> ┗ alltypes.d.ts

的话，ts-node还是无法识别到.d.ts文件。

---

剪藏自：[Could not find a declaration file for module ](https://joshtronic.com/2019/08/26/could-not-find-a-declaration-file-for-module/)


