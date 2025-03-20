---
title: 记录搭建博客的过程（Hexo+Butterfly+Github Actions+Github Pages）
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

皮肤一开始选择的是Icarus，但看着看着总觉得单调了，而我又想多展示下我的二次元精选图片，所以还是选择了Butterfly。而事实证明这个选择是正确的，且不说好不好看，Butterfly支持的自定义配置比icarus多得多，配置结构也很整齐舒服。

# 下功夫的点（坑）

过程其实没什么好说的，网上教程一大堆。但就我花时间的地方我想分享下。

## 文章永久链接permalink缩短

由于是从obsidian直接搬过来的笔记，文件名就直接是标题名（中文），本地跑起来后发现地址栏url很长还是中文很不好看，于是开始寻找有没有其他缩短链接的方式。找到的插件是 [hexo-abbrlink](https://github.com/ohroy/hexo-abbrlink) ，一开始尝试后发现生成的短链全都是0，百思不得其解，以为是这插件几年没更新了的缘故。后来想到按社区习惯应该是要给文章的文件名写成英文的，在所有文件名改成英文之后再次想到这个插件，于是再次尝试后成功生成短链了。

因此**hexo-abbrlink不支持中文文件名**这点是很重要的坑。

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

## 打不开分类和标签页面

一开始是网上搜了搜（例如这篇 https://www.zhihu.com/question/29017171 ），说是要在 `source/` 下面加个 `tags/index.md` ，内容写

```
---
title: "tags"
type: tags
layout: "tags"
---
```

然后再跑起来时就报错

```
TypeError: C:\MyCode\Projects\my-blog\themes\butterfly\layout\includes\mixins\article-sort.pug:4
    2|   .article-sort
    3|     - let year
  > 4|     - posts.forEach(article => {
    5|       - const tempYear = date(article.date, 'YYYY')
    6|       - const noCoverClass = article.cover === false || !theme.cover.archives_enable ? 'no-article-cover' : ''
    7|       - const title = article.title || _p('no_title')

Cannot read properties of undefined (reading 'forEach')
    at Object.pug_interp [as articleSort] (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:1749:7)
    at eval (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:1809:26)
    at template (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:6808:7)
    at _View._compiled (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\theme\view.js:120:67)
    at _View.render (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\theme\view.js:37:21)
    at C:\MyCode\Projects\my-blog\node_modules\hexo\dist\hexo\index.js:60:29
    at tryCatcher (C:\MyCode\Projects\my-blog\node_modules\bluebird\js\release\util.js:16:23)
    at C:\MyCode\Projects\my-blog\node_modules\bluebird\js\release\method.js:15:34
    at RouteStream._read (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\hexo\router.js:43:9)
    at Readable.read (node:internal/streams/readable:739:12)
    at resume_ (node:internal/streams/readable:1257:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
ERROR
TypeError: C:\MyCode\Projects\my-blog\themes\butterfly\layout\includes\mixins\article-sort.pug:4
    2|   .article-sort
    3|     - let year
  > 4|     - posts.forEach(article => {
    5|       - const tempYear = date(article.date, 'YYYY')
    6|       - const noCoverClass = article.cover === false || !theme.cover.archives_enable ? 'no-article-cover' : ''
    7|       - const title = article.title || _p('no_title')

Cannot read properties of undefined (reading 'forEach')
    at Object.pug_interp [as articleSort] (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:1749:7)
    at eval (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:1809:26)
    at template (eval at wrap (C:\MyCode\Projects\my-blog\node_modules\pug-runtime\wrap.js:6:10), <anonymous>:6808:7)
    at _View._compiled (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\theme\view.js:120:67)
    at _View.render (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\theme\view.js:37:21)
    at C:\MyCode\Projects\my-blog\node_modules\hexo\dist\hexo\index.js:60:29
    at tryCatcher (C:\MyCode\Projects\my-blog\node_modules\bluebird\js\release\util.js:16:23)
    at C:\MyCode\Projects\my-blog\node_modules\bluebird\js\release\method.js:15:34
    at RouteStream._read (C:\MyCode\Projects\my-blog\node_modules\hexo\dist\hexo\router.js:43:9)
    at Readable.read (node:internal/streams/readable:739:12)
    at resume_ (node:internal/streams/readable:1257:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
```
在网上和Butterfly issues/disscussions上找了好久都没找到相关回答，十分苦闷。后来再次搜“hexo怎么添加分类页面”时发现，有些文章里并没有加上 `layout: "tags"` ，我就猜测是不是这个导致的。结果删了下后，还真是这个原因。

## 自定义头图和页脚图的图片位置

通过F12得知背景图是通过 `background-image` 属性添加的，那么就能够通过 `background-position` 来改变图片位置。

由于我给分类、标签等不同页面都设置了不同的图，因此想要针对性设置不一样的位置，单纯通过inject自定义css里直接改对应元素（例如下面头图对应元素的 `page-header` ）不行，因为每个页面都是一样的名字。而不知道为什么父元素只在分类和标签区分了class，但在归档就和首页一样都是 `page` ，因此也没法通过父元素类来区分页面。

![](https://blog47.oss-cn-hangzhou.aliyuncs.com/img/20250320184744643.png)

一开始的设想是通过inject一个js来直接if判断下页面路径然后改position。但后来发现会出现卡顿的情况，同时如果还在js里强制覆盖了别的图的话就会先闪现下原来的图然后再变成新图。这说明inject bottom的话是butterfly渲染后执行的。但选择inject head的话抢在渲染前获取不到对应元素，也不行。

后来想到只能通过修改源码的方式侵入式实现了。首先是修改整体layout的源码：

```pug
//- themes\butterfly\layout\includes\layout.pug

- var globalPageType = getPageType(page, is_home)
- var htmlClassHideAside = theme.aside.enable && theme.aside.hide ? 'hide-aside' : ''
- page.aside = globalPageType === 'archive' ? theme.aside.display.archive: globalPageType === 'category' ? theme.aside.display.category : globalPageType === 'tag' ? theme.aside.display.tag : page.aside
- var hideAside = !theme.aside.enable || page.aside === false ? 'hide-aside' : ''
- var pageType = globalPageType === 'post' ? 'post' : 'page'
- pageType = page.type ? pageType + ' type-' + page.type : pageType
- var accruatePageType = page.path.split('/')[0].replace(/\.html$/, '')     //- 这里添加了变量

doctype html
html(lang=config.language data-theme=theme.display_mode class=htmlClassHideAside)
  head
    include ./head.pug
  body
    !=partial('includes/loading/index', {}, {cache: true})

    if theme.background
      #web_bg(style=getBgPath(theme.background))

    !=partial('includes/sidebar', {}, {cache: true})

    #body-wrap(class=pageType)
      include ./header/index.pug

      main#content-inner.layout(class=hideAside)
        if body
          div!= body
        else
          block content
          if theme.aside.enable && page.aside !== false
            include widget/index.pug

      - const footerBg = theme.footer_img
      - const footer_bg = footerBg ? footerBg === true ? bg_img : getBgPath(footerBg) : ''
      footer#footer(style=footer_bg class='footer ' + accruatePageType)     //- 这里为footer添加了class
        !=partial('includes/footer', {}, {cache: true})

    include ./rightside.pug
    include ./additional-js.pug
```
然后修改头图的源码：

```pug
//- themes\butterfly\layout\includes\header\index.pug
-
  const returnTopImg = img => img !== false ? img || theme.default_top_img : false
  const isFixedClass = theme.nav.fixed ? ' fixed' : ''
  var top_img = false
  let headerClassName = 'not-top-img'
  var bg_img = ''

if !theme.disable_top_img && page.top_img !== false
  case globalPageType
    when 'post'
      - top_img = page.top_img || page.cover || theme.default_top_img
    when 'page'
      - top_img = page.top_img || theme.default_top_img
    when 'tag'
      - top_img = theme.tag_per_img && theme.tag_per_img[page.tag] || returnTopImg(theme.tag_img)
    when 'category'
      - top_img = theme.category_per_img && theme.category_per_img[page.category] || returnTopImg(theme.category_img)
    when 'home'
      - top_img = returnTopImg(theme.index_img)
    when 'archive'
      - top_img = returnTopImg(theme.archive_img)
    default
      - top_img = page.top_img || theme.default_top_img

  if top_img !== false
    - bg_img = getBgPath(top_img)
    - headerClassName = globalPageType === 'home' ? 'full_page' : globalPageType === 'post' ? 'post-bg' : 'not-home-page'

header#page-header(class=`${headerClassName + isFixedClass + ' ' + accruatePageType}` style=bg_img)   //- 这里修改了class
  include ./nav.pug
  if top_img !== false
    if globalPageType === 'post'
      include ./post-info.pug
    else if globalPageType === 'home'
      #site-info
        h1#site-title=config.title
        if theme.subtitle.enable
          - var loadSubJs = true
          #site-subtitle
            span#subtitle
        if theme.social
          #site_social_icons
            !=partial('includes/header/social', {}, {cache: true})
      #scroll-down
        i.fas.fa-angle-down.scroll-down-effects
    else
      #page-site-info
        h1#site-title=page.title || page.tag || page.category
  else
    //- improve seo
    if globalPageType !== 'post'
      h1.title-seo=page.title || page.tag || page.category || config.title
```

这样，头图和页尾对应的元素的class就能带上当前路径的第一段，比如 `tags/abc/index.html` 获取到 `tags` 部分，同时针对首页 `/index.html` 直接获取到 `index` 的字符串。然后就能在自定义的css（inject到head）里针对性设置背景图和位置了！（css inject方式参见网上教程）

```styl
// source\css\custom.styl

.not-home-page
  background-position-y 15% !important

.not-home-page.archives
  background-position-y: 50% !important

.not-home-page.categories
  background-image: url("/img/category_img.jpg") !important
  background-position-y: 20% !important

.not-home-page.tags
  background-image: url("/img/tag_img.jpg") !important
  background-position-y: 20% !important

.not-home-page.about
  background-image: url("/img/about_img.jpg") !important
  background-position-y: 55% !important

.post-bg.p
  background-position-y 15% !important

.footer.index
  background-image: url("/img/home_img.jpg") !important
  background-position-y: 95% !important

.footer.archives
  background-image: url("/img/archive_img.jpg") !important
  background-position-y: 90% !important

.footer.categories
  background-image: url("/img/category_img.jpg") !important
  background-position-y: 55% !important

.footer.tags
  background-image: url("/img/tag_img.jpg") !important
  background-position-y: 80% !important

.footer.about
  background-image: url("/img/about_img.jpg") !important
  background-position-y: 90% !important

```

题外话：真不明白为什么butterfly只能给具体分类/标签页设自定义头图选项，但却不给分类/标签列表页设自定义头图的选项。

## Giscus的option配置不起作用

测试评论下后，发现discussions那边并没有按照配置里那样标题取 `og:title` 。原本我的配置写法：

```yaml
# _config_butterfly.yml

giscus:
  repo: Decmoe47/decmoe47.github.io
  repo_id: （省略）
  category_id: （省略）
  light_theme: light
  dark_theme: dark
  js:
  option:
    mapping: og:title
    strict: true
    reactions_enabled: true
    emit_metadata: false
    input_position: bottom
    theme: noborder_light
    lang: zh-CN
    lazy: true
```

在看了源码之后才知道，原来option部分的key不会帮你转下划线或者驼峰，也不会给你加上 `data-` ，而是原样写进 `<script>` 里。

```pug
//- themes\butterfly\layout\includes\third-party\comments\giscus.pug

- const { use, lazyload } = theme.comments
- const { repo, repo_id, category_id, light_theme, dark_theme, js, option } = theme.giscus
- const giscusUrl = js || 'https://giscus.app/client.js'
- const giscusOriginUrl = new URL(giscusUrl).origin

script.
  (() => {
    const isShuoshuo = GLOBAL_CONFIG_SITE.pageType === 'shuoshuo'
    const option = !{JSON.stringify(option)}

    const getGiscusTheme = theme => theme === 'dark' ? '!{dark_theme}' : '!{light_theme}'

    const createScriptElement = config => {
      const ele = document.createElement('script')
      Object.entries(config).forEach(([key, value]) => {
        ele.setAttribute(key, value)
      })
      return ele
    }

    const loadGiscus = (el = document, key) => {
      const mappingConfig = isShuoshuo
        ? { 'data-mapping': 'specific', 'data-term': key }
        : { 'data-mapping': (option && option['data-mapping']) || 'pathname' }

      const giscusConfig = {
        src: '!{giscusUrl}',
        'data-repo': '!{repo}',
        'data-repo-id': '!{repo_id}',
        'data-category-id': '!{category_id}',
        'data-theme': getGiscusTheme(document.documentElement.getAttribute('data-theme')),
        'data-reactions-enabled': '1',
        crossorigin: 'anonymous',
        async: true,
        ...option,
        ...mappingConfig
      }
```

所以正确的配置写法是：

```yaml
giscus:
  repo: Decmoe47/decmoe47.github.io
  repo_id: （省略）
  category_id: （省略）
  light_theme: light
  dark_theme: dark
  js: 
  option:
    data-mapping: og:title
    data-strict: true
    data-reactions-enabled: true
    data-emit-metadata: false
    data-input-position: bottom
    data-theme: noborder_light
    data-lang: zh-CN
```
