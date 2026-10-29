/* 审计 "找 Bug 行" 题：'
   1) 答案行必须非空
   2) 答案行必须包含 expectLine（防止下标错位）
   3) expectLine 不能在别处重复出现（否则答案不唯一）
   用法: node build/audit-bug.js
*/
const path = require('path');
globalThis.CQ = [];
for (const f of ['bank-a.js', 'bank-b.js']) require(path.join(__dirname, '..', f));

let total = 0;
const problems = [];

for (const ch of globalThis.CQ) {
  for (const q of ch.qs) {
    if (q.t !== 'bug') continue;
    total++;
    const lines = q.code.split('\n');
    const target = lines[q.a];
    const tag = '[' + ch.name + '] ' + q.q;

    if (target === undefined) {
      problems.push(tag + ' → a=' + q.a + ' 超出代码行数 ' + lines.length);
      continue;
    }
    if (!target.trim()) {
      problems.push(tag + ' → a=' + q.a + ' 指向空行');
      continue;
    }
    if (!q.expectLine) {
      problems.push(tag + ' → 缺少 expectLine 标记，无法自动校验');
      continue;
    }
    if (target.indexOf(q.expectLine) < 0) {
      problems.push(tag + '\n     期望行含「' + q.expectLine + '」\n     实际第 ' + (q.a + 1) + ' 行是「' + target.trim() + '」');
      continue;
    }
    // 唯一性：expectLine 不能在多行出现
    const hits = lines.filter((l) => l.indexOf(q.expectLine) >= 0).length;
    if (hits > 1) {
      problems.push(tag + '\n     「' + q.expectLine + '」出现了 ' + hits + ' 次，答案不唯一');
    }

    // 解析里如果提到"第 N 行"，必须和正确答案行号一致（从 1 起算）
    const mentioned = q.why.match(/第\s*(\d+)\s*行/g) || [];
    for (const m of mentioned) {
      const n = parseInt(m.replace(/[^0-9]/g, ''), 10);
      if (n !== q.a + 1) {
        problems.push(tag + '\n     解析里写「' + m + '」，但正确答案是第 ' + (q.a + 1) +
          ' 行（该行内容：' + JSON.stringify(target.trim()) + '）');
      }
    }
  }
}

console.log('找 Bug 题共 ' + total + ' 道');
if (problems.length === 0) {
  console.log('\n✅ 全部答案行定位正确且唯一');
  process.exit(0);
}
console.log('\n❌ ' + problems.length + ' 处问题：\n');
problems.forEach((p) => console.log('  • ' + p + '\n'));
process.exit(1);
