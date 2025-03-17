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