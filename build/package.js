/* =========================================================
   打包成可直接部署的静态站点

   用法:
     node build/package.js

   产物: dist/
     ├── index.html
     ├── *.js / style.css
     ├── clang/            (28MB，编译器资源)
     ├── games/            (游戏源码，大作业用)
     └── server.js         (本地预览用，可选)

   这个目录可以直接：
     - 上传到任何静态托管（GitHub Pages / Netlify / Vercel / 阿里云 OSS ...）
     - 或者本地用 `node server.js` 预览
   ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* 必须带上的文件 */
const FILES = [
  'index.html',
  'style.css',
  'app.js',
  'wasm-compiler.js',
  'bank-a.js',
  'bank-b.js',
  'hands-on.js',
  'hands-on-algo.js',
  'hands-on-game.js',
  'hands-on-ui.js',
  'game-projects.js',
  'game-projects-ui.js',
  'games-src.js',
  'playground.js',
  'server.js'
];

/* 必须带上的目录 */
const DIRS = [
  'clang',      // 编译器资源（28MB）
  'games'       // 游戏源码（大作业的成品代码，虽然已内联，但保留可下载）
];

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return fs.statSync(src).size;
}

function copyDir(src, dst) {
  let bytes = 0;
  let count = 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      const r = copyDir(s, d);
      bytes += r.bytes;
      count += r.count;
    } else {
      bytes += copyFile(s, d);
      count++;
    }
  }
  return { bytes, count };
}

function main() {
  /* 清空旧产物 */
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  let totalBytes = 0;
  let missing = [];

  console.log('打包中...\n');

  /* 1. 根目录文件 */
  let fileCount = 0;
  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
      missing.push(f);
      continue;
    }
    const size = copyFile(src, path.join(DIST, f));
    totalBytes += size;
    fileCount++;
    console.log('  ' + f.padEnd(24) + (size / 1024).toFixed(1) + ' KB');
  }

  /* 2. 目录 */
  console.log('');
  for (const d of DIRS) {
    const src = path.join(ROOT, d);
    if (!fs.existsSync(src)) {
      missing.push(d + '/');
      continue;
    }
    const r = copyDir(src, path.join(DIST, d));
    totalBytes += r.bytes;
    fileCount += r.count;
    console.log('  ' + (d + '/').padEnd(24) + (r.bytes / 1024 / 1024).toFixed(1) + ' MB  (' + r.count + ' 个文件)');
  }

  /* 3. 检查关键资源 */
  const critical = [
    'clang/clang-wasm.global.js',
    'clang/assets/runtime-manifest.v1.json',
    'clang/assets/bin/clang.wasm.gz',
    'clang/assets/bin/lld.wasm.gz',
    'clang/assets/bin/memfs.wasm.gz',
    'clang/assets/bin/sysroot.tar.gz'
  ];
  console.log('\n关键资源检查:');
  let criticalOk = true;
  for (const c of critical) {
    const ok = fs.existsSync(path.join(DIST, c));
    console.log('  ' + (ok ? 'OK  ' : 'MISS') + ' ' + c);
    if (!ok) criticalOk = false;
  }

  /* 4. 写一个部署说明 */
  const readme = `# 部署说明

这个目录是打包好的静态站点，可以直接部署。

## 本地预览

\`\`\`bash
node server.js
\`\`\`

然后打开 http://127.0.0.1:7788

## 部署到静态托管

把**整个目录**上传即可。注意几点：

### 1. MIME 类型

服务器必须为这些扩展名返回正确的 Content-Type：

| 扩展名 | Content-Type |
|---|---|
| .js | application/javascript |
| .gz | application/gzip |
| .wasm | application/wasm |
| .tar | application/x-tar |

**最重要是 .gz** —— 如果返回成 application/octet-stream，
浏览器解压会失败，实操题就用不了。

### 2. 大文件

\`clang/assets/bin/clang.wasm.gz\` 有 15MB。
大部分托管都支持，但要注意：

- **GitHub Pages**: 单文件上限 100MB，够用
- **Vercel / Netlify**: 够用
- **国内 OSS / COS**: 需要开 HTTPS，可能要备案

### 3. 缓存

wasm 资源建议设置长缓存（内容不变）：

\`\`\`
Cache-Control: public, max-age=31536000, immutable
\`\`\`

HTML / JS 建议短缓存，方便更新。

### 4. 不需要后端

编译完全在浏览器里跑，服务器只负责发静态文件。
不需要 PHP / Node / 任何运行时。

## 各平台的配置文件

### Netlify（netlify.toml）

\`\`\`toml
[[headers]]
  for = "/clang/assets/bin/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
\`\`\`

### Vercel（vercel.json）

\`\`\`json
{
  "headers": [
    {
      "source": "/clang/assets/bin/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
\`\`\`

### GitHub Pages

直接推送即可，不需要配置。
但注意 GitHub Pages 不保证 MIME 类型，
如果 .gz 返回不对，实操题会失败。
`;

  fs.writeFileSync(path.join(DIST, 'DEPLOY.md'), readme, 'utf8');

  /* 5. 总结 */
  console.log('\n' + '='.repeat(50));
  console.log('打包完成');
  console.log('='.repeat(50));
  console.log('  文件数: ' + fileCount);
  console.log('  总体积: ' + (totalBytes / 1024 / 1024).toFixed(1) + ' MB');
  console.log('  输出:   ' + DIST);

  if (missing.length) {
    console.log('\n警告：以下文件/目录缺失');
    missing.forEach((m) => console.log('  - ' + m));
  }

  if (!criticalOk) {
    console.log('\n错误：关键资源缺失，部署后实操题会失败');
    console.log('  试试重新执行: node build/setup-wasm.js');
    process.exit(1);
  }

  console.log('\n下一步:');
  console.log('  本地预览:  cd dist && node server.js');
  console.log('  部署:      把 dist/ 整个目录上传到静态托管');
}

main();
