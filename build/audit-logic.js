/* 逻辑一致性检查：不依赖浏览器，把 app.js 里的算法摘出来验一遍 */
const path = require('path');

globalThis.CQ = [];
for (const f of ['bank-a.js', 'bank-b.js']) require(path.join(__dirname, '..', f));
const CQ = globalThis.CQ;

const issues = [];

CQ.forEach((ch, ci) => {
  if (!/^ch\d+$/.test(ch.id)) issues.push(ch.name + ': id 不规范 ' + ch.id);
  if (!ch.icon) issues.push(ch.name + ': 缺 icon');
  if (ch.qs.length < 5) issues.push(ch.name + ': 题量太少 ' + ch.qs.length);

  ch.qs.forEach((q, qi) => {
    const tag = '[' + ch.name + ' #' + (qi + 1) + '] ';
    if (!q.q || !q.why || !q.code) issues.push(tag + '缺字段');
    if (!['output', 'choice', 'bug'].includes(q.t)) issues.push(tag + '未知题型 ' + q.t);

    if (q.t === 'bug') {
      if (!Number.isInteger(q.a)) issues.push(tag + 'bug 题 a 不是整数');
      if (q.opts) issues.push(tag + 'bug 题不该有 opts');
    } else {
      if (!Array.isArray(q.opts) || q.opts.length !== 4) issues.push(tag + '选项不是 4 个');
      if (!(q.a >= 0 && q.a < (q.opts || []).length)) issues.push(tag + '答案下标越界');
      if (new Set(q.opts).size !== q.opts.length) issues.push(tag + '有重复选项');
    }
    // 解析里不该出现未转义的 HTML 危险字符（我们部分用 innerHTML 渲染）
    if (/<script|onerror=/i.test(q.why)) issues.push(tag + '解析含可疑 HTML');
  });
});

// 每章正确答案分布是否过于集中（都选 A 就太好蒙了）
CQ.forEach((ch) => {
  const dist = [0, 0, 0, 0];
  ch.qs.forEach((q) => {
    if (q.t !== 'bug') dist[q.a]++;
  });
  const max = Math.max(...dist);
  if (max > Math.ceil(ch.qs.length * 0.6)) {
    issues.push(ch.name + ': 答案分布偏向单个选项 ' + JSON.stringify(dist));
  }
});

// 模拟"找 Bug 题"的选项生成算法：必须能凑出 4 个且包含正确答案
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let bugSimulated = 0;
for (let round = 0; round < 200; round++) {
  for (const ch of CQ) {
    for (const q of ch.qs) {
      if (q.t !== 'bug') continue;
      const lines = q.code.split('\n');
      const candidates = shuffle(lines.map((_, i) => i).filter((i) => lines[i].trim().length > 0));
      const picks = [q.a];
      for (const c of candidates) {
        if (picks.length >= 4) break;
        if (c === q.a) continue;
        if (!picks.includes(c)) picks.push(c);
      }
      if (picks.length !== 4) { issues.push('[题] ' + ch.name + ': bug 题选项凑不满 4 个'); break; }
      if (!picks.includes(q.a)) { issues.push('[题] ' + ch.name + ': bug 选项不含正确答案'); break; }
      bugSimulated++;
    }
  }
}

// 通关规则自检
function starRule(correct, total) {
  const passed = correct >= Math.ceil(total * 0.6);
  if (!passed) return 0;
  if (correct === total) return 3;
  if (correct >= Math.ceil(total * 0.85)) return 2;
  return 1;
}
const cases = [
  [7, 7, 3], [6, 7, 2], [5, 7, 1], [4, 7, 0], [0, 7, 0]
];
cases.forEach(([c, t, want]) => {
  const got = starRule(c, t);
  if (got !== want) issues.push('星级规则: correct=' + c + '/' + t + ' 期望 ' + want + ' 实际 ' + got);
});

const totalQ = CQ.reduce((s, c) => s + c.qs.length, 0);
console.log('章节 ' + CQ.length + ' / 题目 ' + totalQ + ' / bug 选项模拟 ' + bugSimulated + ' 次');

if (issues.length === 0) {
  console.log('✅ 逻辑一致性检查全部通过');
  process.exit(0);
}
console.log('\n❌ ' + issues.length + ' 处问题：');
[...new Set(issues)].forEach((i) => console.log('  • ' + i));
process.exit(1);
