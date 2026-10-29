/* 给 README 加 GitHub 风格头部（用数组拼接，避免模板字符串里的反斜杠问题） */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'README.md');
let s = fs.readFileSync(FILE, 'utf8');

const B = String.fromCharCode(92);   // 反斜杠

const lines = [
  '# C 语言闯关 · C Quest',
  '',
  '一个用**真实 C 代码**做题的闯关学习游戏。**70 道读代码题 + 40 道动手写代码的实操题 + 5 个游戏开发大作业**。',
  '',
  '> **在线体验**: https://ephemeral-semifreddo-456043.netlify.app',
  '>',
  '> 打开就能玩，不用安装任何东西。实操题里的 C 代码是真的在**你的浏览器里编译运行**的。',
  '',
  '![首页](shots/01-home.png)',
  '',
  '---',
  '',
  '## 这是什么',
  '',
  '给学 C 语言的人做的练习工具。和普通刷题网站的区别：',
  '',
  '- **每道题的答案都是编译器跑出来的**，不是手写的。49 道"预测输出"题全部真编译真运行验证过。',
  '- **实操题能真编译真判分**。你在网页里写 C 代码，Clang 22（WebAssembly 版）在浏览器里编译运行，',
  '  逐个测试用例比对输出。少写一个换行符都会判错。',
  '- **算法题有对拍验证**。每道算法题额外写了一个暴力解法，用随机数据跑 400 次比对，确保参考解答在边界上也没错。',
  '- **游戏开发大作业**。5 个经典小游戏（贪吃蛇/俄罗斯方块/2048/扫雷/推箱子），',
  '  每个都给需求清单、知识点（标注来自前面哪一课）、分步思路、易错点和完整可运行的成品代码。不判分。',
  '',
  '## 快速开始',
  '',
  '### 方式一：直接玩在线版',
  '',
  '打开 https://ephemeral-semifreddo-456043.netlify.app 即可。',
  '',
  '### 方式二：本地跑',
  '',
  '```bash',
  '# 1. 安装依赖（只为把编译器资源复制出来）',
  'npm install',
  'npm run setup',
  '',
  '# 2. 启动',
  'npm run serve',
  '# 然后打开 http://127.0.0.1:7788',
  '```',
  '',
  'Windows 用户也可以直接双击 `开始游戏.bat` 选 1。',
  '',
  '> 注意：不能直接双击 `index.html`。浏览器出于安全限制，',
  '> `file://` 页面读不到 WebAssembly 资源，实操题会提示需要起服务。',
  '',
  '### 方式三：终端版',
  '',
  '```bash',
  'tools/tcc/tcc.exe -o c-quest.exe c-quest.c',
  './c-quest.exe',
  '```',
  '',
  '纯终端里的 C 程序，70 道读代码题 + 40 道实操题（用本地 TCC 编译）。',
  '',
  '---',
  '',
  ''
];

const header = lines.join('\n');

const marker = '## 怎么玩';
const idx = s.indexOf(marker);
if (idx < 0) {
  console.error('找不到 怎么玩');
  process.exit(1);
}

s = header + s.slice(idx);
fs.writeFileSync(FILE, s, 'utf8');
console.log('README 头部已重写，总行数:', s.split('\n').length);
