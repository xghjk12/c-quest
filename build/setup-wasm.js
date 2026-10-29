/* =========================================================
   把 clang-wasm 的运行时资源复制到 web/ 目录

   为什么需要这一步：
     浏览器读不到 node_modules 里的文件，必须把资源放到
     能被 URL 访问的位置。这个脚本就是做搬运。

   用法: node build/setup-wasm.js
   ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'node_modules', '@live-codes', 'clang-wasm');
const DEST = path.join(ROOT, 'clang');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let bytes = 0;
  let files = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      const r = copyDir(s, d);
      bytes += r.bytes;
      files += r.files;
    } else {
      fs.copyFileSync(s, d);
      bytes += fs.statSync(s).size;
      files++;
    }
  }
  return { bytes, files };
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('❌ 找不到 node_modules/@live-codes/clang-wasm');
    console.error('   先执行：npm install');
    process.exit(1);
  }

  /* 1. 复制 UMD 包（浏览器里 importScripts / <script> 加载） */
  fs.mkdirSync(DEST, { recursive: true });
  const bundle = path.join(SRC, 'dist', 'clang-wasm.global.js');
  fs.copyFileSync(bundle, path.join(DEST, 'clang-wasm.global.js'));
  console.log('  ✓ clang-wasm.global.js  ' +
    (fs.statSync(bundle).size / 1024).toFixed(0) + ' KB');

  /* 2. 复制运行时资源（wasm + sysroot，已 gzip 压缩） */
  const assetsSrc = path.join(SRC, 'assets');
  const assetsDst = path.join(DEST, 'assets');
  const r = copyDir(assetsSrc, assetsDst);
  console.log('  ✓ assets/  ' + r.files + ' 个文件，' +
    (r.bytes / 1024 / 1024).toFixed(1) + ' MB');

  /* 3. 清掉不需要的 Objective-C 运行时（本项目只用 C） */
  const objc = path.join(assetsDst, 'objective-c');
  if (fs.existsSync(objc)) {
    const sz = fs.statSync(objc);
    fs.rmSync(objc, { recursive: true, force: true });
    console.log('  ✓ 已移除 objective-c 运行时（本项目只用 C）');
  }

  const total = r.bytes;
  console.log('\n完成。资源在 clang/ ，共 ' + (total / 1024 / 1024).toFixed(1) + ' MB');
  console.log('首次打开实操题时浏览器才会下载这些文件。');
}

main();
