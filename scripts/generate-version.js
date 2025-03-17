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