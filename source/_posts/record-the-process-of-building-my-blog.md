---
title: 记录搭建博客的过程（Hexo+Icarus+Github Actions+Github Pages）
categories:
  - - 编程
abbrlink: b1f4735
date: 2025-03-17 00:00:00
toc: true
---

# 契机

很久以前曾经搭过一次个人博客，但后来觉得自己写的东西太小儿科了太羞耻于是删掉了。然而最近偶然看到一个人的博客刷新了我对博客的看法：他的博客里东西很多，既有“小儿科”的简单内容（例如学习某个语言基本用法），也有高级复杂的内容（例如k8s集群）。整个博客给人的感觉就像是见证了他的学习成长历程一样，那些简单的内容也变得值得敬佩。

所以想了想把自己私藏许久的笔记也拿出来晒晒，其中有些确实是我当时网上找了好久研究了很长时间才解决的问题，值得分享。

# 需求&选择理由

我不想在博客上花一分钱（图床除外），也不想买个域名，因此github pages是最好的选择。

另外因为我的github pages已经用于展示字幕组文档了（docsify），所以这次需要同时保留docsify作为子路径能够访问得到。

此外考虑到重复的在本地 `hexo clean && hexo g && hexo s` 后还要commit也挺麻烦的，但又觉得写个本地脚本不够优雅，所以这次采用Github Actions的方式自动部署。

皮肤诸如butterfly、fluid都挺不错，只不过我不是很喜欢放图片，只想简单粗暴的纯文字但是排版要好看，因此才选择了icarus。

# 下功夫的点（坑）

过程其实没什么好说的，网上教程一大堆。但就我花时间的地方我想分享下。

## 文章永久链接permalink缩短

由于是从obsidian直接搬过来的笔记，文件名就直接是标题名（中文），本地跑起来后发现地址栏url很长还是中文很不好看，于是开始寻找有没有其他缩短链接的方式。找到的插件是 [hexo-abbrlink](https://github.com/ohroy/hexo-abbrlink) ，一开始尝试后发现生成的短链全都是0，百思不得其解，以为是这插件几年没更新了的缘故。后来想到按社区习惯应该是要给文章的文件名写成英文的，在所有文件名改成英文之后再次想到这个插件，于是再次尝试后成功生成短链了。

因此**hexo-abbrlink不支持中文文件名**这点是很重要的坑。

## 不让icarus把所有文章全文显示出来

icarus首页（还有分类、归档等）会把所有文章的全文展现出来，这显然不方便快速查看有哪些文章。但是icarus又没有提供折叠功能，而hexo自带的给文章添加 `<!-- more -->` 方式则不够自动化。在找了一番后我找到了 [hexo-excerpt](https://github.com/chekun/hexo-excerpt) 插件，他能够做到文章列表页面折叠文章。

不过要注意的是，因为这插件不是数行数也不是数字数，而是数html的标签数来取摘要的，比如 `depth` 设多少就取几个div（[关于depth这个属性是如何使用的 · Issue #19 · chekun/hexo-excerpt](https://github.com/chekun/hexo-excerpt/issues/19) ）。虽然不是想要的数行数字数效果，但至少能用，只需要注意下文章开头第一段不要整太长就行。

## 浏览器缓存导致更新后仍然是旧页面的问题

这点是真的苦恼了。没有找到好的插件能完美解决，只能自己想办法。一开始的思路是通过给所有链接 `href` 添加时间戳 `?t=xxxxx` 来强制使得浏览器获取新的页面，但是那样的话地址栏上也会显示出来，就不是很美观。（css和js的缓存不是重点，重点是html的缓存）

后来经过与各方ai的激烈讨论后，换了个思路：通过在 `public/` 下放一个 `version.json` 记录当前版本号（值取自git commit ID），然后通过hexo filter为每个html添加个脚本，fetch去获取这个版本号，与localStorage（来自上一次查询存储的）对比决定是否刷新页面。此外localStorage还会记录每个页面上次刷新时的版本号，以确保每个页面在新的版本号至少刷新过一次。代码如下：

```jsx
// scripts/generate-version.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

hexo.extend.filter.register('after_generate', () => {
  const publicDir = path.join(hexo.base_dir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const versionData = { version: commitHash };
  const outputPath = path.join(publicDir, 'version.json');

  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  console.log(`生成 version.json: ${outputPath}`);
});
```

```jsx
// scripts/append_version.js

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 获取全局版本号
function getVersion() {
  const versionFile = path.join(__dirname, '../public/version.json');
  return JSON.parse(fs.readFileSync(versionFile, 'utf8')).version;
}

// 注册 HTML 过滤器
hexo.extend.filter.register('after_render:html', (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const globalVersion = getVersion();

  // 在 </body> 前插入脚本
  $('body').append(`
    <script>
      (async () => {
        try {
          // 获取全局版本
          const response = await fetch('/version.json?_=${Date.now()}');
          const data = await response.json();
          const currentGlobalVersion = data.version;

          // 获取当前页面路径（标准化处理）
          const currentPage = window.location.pathname.replace(/\\/index.html$/, '/') || '/';

          // 从 localStorage 读取页面版本记录
          const pageVersions = JSON.parse(localStorage.getItem('hexo_page_versions')) || {};
          const lastRefreshedVersion = pageVersions[currentPage];

          // 如果全局版本变化或页面未刷新过，则强制刷新
          if (currentGlobalVersion !== '${globalVersion}' || lastRefreshedVersion !== currentGlobalVersion) {
            // 更新页面版本记录
            pageVersions[currentPage] = currentGlobalVersion;
            localStorage.setItem('hexo_page_versions', JSON.stringify(pageVersions));

            // 强制刷新页面
            window.location.reload(true);
          }
        } catch (e) {
          console.error('版本检测失败:', e);
        }
      })();
    </script>
  `);

  return $.html();
});
```

## 评论插件

评论插件并没有什么复杂的，只是个人想推荐Giscus而已。在 [Icarus用户指南 - 用户评论插件 - Icarus](https://ppoffice.github.io/hexo-theme-icarus/Plugins/Comment/icarus%E7%94%A8%E6%88%B7%E6%8C%87%E5%8D%97-%E7%94%A8%E6%88%B7%E8%AF%84%E8%AE%BA%E6%8F%92%E4%BB%B6/) 列出的一众评论插件里，当年用的是utterances，可惜现在已经停更许久，而他的精神继承者Giscus从利用github issues改为利用github discussions，焕然一新。

当然其他插件也有不错的，只是个人不喜欢要填邮箱的评论方式，也不想开放匿名评论，想来想去要求登录github账号是最好的办法了。

## 共存docsify

一开始其实就想到了既然hexo的部署路径是 `public/` ，那么部署后再往那里拷贝下我的docsify文件夹 `docs/` （放在项目根目录）不就好了。因此我的github action就如下所写（其实除了拷贝外都是[hexo官方提供的模板](https://hexo.io/zh-cn/docs/github-pages)）

```yaml
name: Pages

on:
  push:
    branches:
      - main # default branch

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          # If your repository depends on submodule, please see: https://github.com/actions/checkout
          submodules: recursive
      - name: Use Node.js 22
        uses: actions/setup-node@v4
        with:
          # Examples: 20, 18.19, >=16.20.2, lts/Iron, lts/Hydrogen, *, latest, current, node
          # Ref: https://github.com/actions/setup-node#supported-version-syntax
          node-version: "22"
      - name: Cache NPM dependencies
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.OS }}-npm-cache
          restore-keys: |
            ${{ runner.OS }}-npm-cache
      - name: Install Dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Copy docs folder to public    # 这里去拷贝docsify的文件夹
        run: | 
          cp -r docs public/
          touch public/docs/.nojekyll
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
        
  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

唯一要注意的一点是，拷贝步骤需在 `actions/upload-pages-artifact@v3` 之前才行，否则部署的public文件夹就不包括拷贝的docs文件夹了。

这样以后，访问首页 [https://decmoe47.github.io/](https://decmoe47.github.io/) 就是我的博客，访问 [https://decmoe47.github.io/docs/#/](https://decmoe47.github.io/docs/#/) 就是字幕组文档了。

# 魔改样式

包括固定导航栏，自定义背景，扩宽文章卡片，卡片圆角，卡片高斯模糊等等。

特别是扩宽文章卡片，一开始是参考了[官方文档](https://ppoffice.github.io/hexo-theme-icarus/uncategorized/常见问题/】)和[Winky Granger的博客](https://winkygranger.github.io/2023/05/02/Icarus主题魔改/)的，也就是直接去改icarus源文件，这是常见做法。

但在我看到[Xenon的博客](https://xenon2333.github.io/posts/2023/6.html)后才知道，原来可以非侵入式的实现，也就是在 `theme/icarus/source/css/` 下加一个文件 `custom.styl` ，然后在 `theme/icarus/source/css/style.styl` 中import进去。顺着这个思路我就在猜想能否扩宽文章卡片也通过这种方式实现呢？原文的代码似乎并没有效果，于是在我与Qwen激烈的讨论之后，补充了下代码，最终实现了。至此，完全实现了非侵入式的魔改样式。

```css
// custom.styl

/* 设置全局背景图 */
body {
    background-image: url('/img/background.jpg') !important;
    background-size: cover;
    /* 图片覆盖整个页面 */
    background-position: center;
    /* 图片居中 */
    background-repeat: no-repeat;
    /* 不重复 */
    background-attachment: fixed;
    /* 固定背景（滚动时不移动） */
}

/* 设置卡片高斯模糊 */
.card {
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px) // 兼容 Safari
}

// 导航栏
.navbar {
    position: fixed  // 固定在页面顶部
    width: 100%
    top: 0
    z-index: 9999;  // 置顶
    background: rgba(255, 255, 255, 0.8) // 白色半透明（深色主题可用 rgba(0,0,0,0.5)）
    backdrop-filter: blur(10px) // 高斯模糊
    -webkit-backdrop-filter: blur(10px) // 兼容 Safari
}

// 导航栏和卡片顶部之间留空
.section
    margin-top: 45px 

.navbar-menu {
    background-color: transparent
}

// 移动端减少模糊
@media screen and (max-width: 768px)
    .navbar-main
        backdrop-filter: blur(5px)
        -webkit-backdrop-filter: blur(5px) // 兼容 Safari

// 卡片圆角
.card {
    border-radius: 8px;
}

// 页脚高斯模糊
.footer {
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px) // 兼容 Safari
}

// 使右侧栏与导航栏保持距离
.column.column-right.is-sticky {
  top: 5rem !important; 
}

// 黑条
.mask {
    color: #000000;
    background-color: #000000;
    &:hover{
        color: #ffffff;
    }
}


/* 以下为扩宽卡片 */
@media screen and (min-width: 1280px)  // 对应 Bulma 的 $widescreen
  .container
    max-width: 1280px !important  // 原值 $widescreen - 2*$gap
    width: 1280px !important

@media screen and (min-width: 1472px)  // 对应 Bulma 的 $fullhd
  .container
    max-width: 1472px !important  // 原值 $fullhd - 2*$gap
    width: 1472px !important

@media screen and (max-width: 768px) {
    .is-4-desktop {
        width: 20rem;
    }
}

@media screen and (min-width: 769px) and (max-width: 1439px) {
    .column.is-4, .column.is-4-tablet, .is-4-desktop, .is-4-widescreen {
        width: 20rem;
    }
    .column.is-8, .column.is-8-tablet, .is-8-desktop, .is-8-widescreen {
        width: calc(100% - 20rem);
    }
}

@media screen and (min-width: 1440px) {
    .column.is-4, .column.is-4-tablet, .is-4-desktop, .is-4-widescreen {
        width: 25rem;
    }
    .column.is-8, .column.is-8-tablet, .is-8-desktop, .is-8-widescreen {
        width: calc(100% - 25rem);
    }
}
```

（原本确实想着简单就好，但越看越觉得原生样式显得单调，所以还是下手了）

在经过整整两天的折腾后，终于做成了自己还算满意的博客样子。