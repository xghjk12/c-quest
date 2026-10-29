/* 一键跑完所有检查
   用法: node build/check-all.js
*/
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');

const steps = [
  ['网页题库答案（真编译·真运行）', 'verify.js'],
  ['找 Bug 题答案行定位', 'audit-bug.js'],
  ['题库逻辑与选项分布', 'audit-logic.js'],
  ['实操题：参考解答跑通所有用例', 'gen-hands-on.js'],
  ['实操题：严格比对（不宽容换行）', 'test-strict.js'],
  ['算法题：暴力解对拍（随机数据）', 'audit-algo.js'],
  ['两版题库对齐', 'check-parity.js']
];

let failed = 0;

for (const [label, script] of steps) {
  console.log('\n' + '='.repeat(56));
  console.log('检查：' + label);
  console.log('='.repeat(56));
  try {
    execFileSync(process.execPath, [path.join(__dirname, script)], {
      stdio: 'inherit',
      cwd: ROOT
    });
  } catch (e) {
    failed++;
    console.log('  ↑ 这一项没通过');
  }
}

/* 最后再编译一次终端版，确认题库改动没把 C 版搞坏 */
console.log('\n' + '='.repeat(56));
console.log('检查：终端版能否编译');
console.log('='.repeat(56));
try {
  execFileSync(TCC, ['-o', path.join(ROOT, 'c-quest.exe'), path.join(ROOT, 'c-quest.c')], {
    stdio: 'inherit',
    cwd: ROOT
  });
  console.log('✅ c-quest.c 编译通过，已重新生成 c-quest.exe');
} catch (e) {
  failed++;
  console.log('❌ c-quest.c 编译失败');
}

console.log('\n' + '='.repeat(56));
if (failed === 0) {
  console.log('✅ 全部检查通过');
  process.exit(0);
}
console.log('❌ 有 ' + failed + ' 项没通过');
process.exit(1);
