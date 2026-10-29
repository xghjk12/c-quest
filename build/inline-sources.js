/* =========================================================
   把 games/reference/*.c 内联成一个 JS 文件（games-src.js）

   为什么内联而不是 fetch：
     用 file:// 双击打开时，浏览器不允许 fetch 本地文件。
     而这 5 个游戏的源码加起来才 60KB，内联进 JS 最稳。

   用法: node build/inline-sources.js
   ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REF = path.join(ROOT, 'games', 'reference');

/* 游戏大作业里引用到的 5 个文件 */
const FILES = [
  'finger-guessing.c',
  'JumpBall.c',
  '2048.c',
  'Tetris.c',
  'Retro_Snaker.c'
];

const out = {};
let totalBytes = 0;

for (const f of FILES) {
  const p = path.join(REF, f);
  if (!fs.existsSync(p)) {
    console.error('❌ 找不到 ' + p);
    process.exit(1);
  }
  const text = fs.readFileSync(p, 'utf8');
  out['games/reference/' + f] = text;
  totalBytes += Buffer.byteLength(text);
  console.log('  ✓ ' + f.padEnd(24) + (text.length / 1024).toFixed(1) + ' KB, ' +
    text.split('\n').length + ' 行');
}

/* 生成 JS 文件：用一个对象存，key 是相对路径 */
let js = '/* =========================================================\n';
js += ' * 游戏源码（由 build/inline-sources.js 自动生成，不要手改）\n';
js += ' *\n';
js += ' * 为什么内联：file:// 打开时浏览器不让 fetch 本地文件，\n';
js += ' * 内联进 JS 就没有这个限制。\n';
js += ' * ========================================================= */\n';
js += 'globalThis.GAME_SOURCES = ';

/* 用 JSON.stringify 保证转义正确，再包一层换行便于阅读 */
js += JSON.stringify(out, null, 2);
js += ';\n';

fs.writeFileSync(path.join(ROOT, 'games-src.js'), js, 'utf8');

console.log('\n已生成 games-src.js，共 ' + (totalBytes / 1024).toFixed(1) + ' KB');
