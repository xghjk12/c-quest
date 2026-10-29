/* ===========================================================
   答案验证器：把每道 "预测输出" 题的代码真编译、真运行，
   再和答案表比对。任何一个不一致都会红字报出来。
   用法: node build/verify.js
   =========================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');
const TMP = path.join(ROOT, 'build', '.tmp');

globalThis.CQ = [];
for (const f of ['bank-a.js', 'bank-b.js']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) require(p);
}
const CQ = globalThis.CQ;

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\s+$/g, '').trim();

let total = 0, checked = 0, ok = 0;
const fails = [];

for (const ch of CQ) {
  for (const q of ch.qs) {
    total++;
    if (q.t !== 'output') { continue; }
    checked++;
    const base = path.join(TMP, 'q_' + ch.id + '_' + checked);
    const src = base + '.c';
    const exe = base + '.exe';
    fs.writeFileSync(src, q.code, 'utf8');
    let out = '', stage = 'compile';
    try {
      execFileSync(TCC, ['-o', exe, src], { stdio: 'pipe' });
      if (q.expectCompileError) {
        fails.push({ ch: ch.name, q: q.q, stage: 'expect-fail', detail: '题目说编译不过，但实际编译成功了' });
        continue;
      }
      stage = 'run';
      out = execFileSync(exe, [], { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
    } catch (e) {
      if (q.expectCompileError) { ok++; continue; }
      fails.push({ ch: ch.name, q: q.q, stage, detail: (e.stderr || e.stdout || e.message || '').toString().slice(0, 400) });
      continue;
    }
    const actual = norm(out);
    const expect = norm(q.opts[q.a]);
    if (actual === expect) { ok++; }
    else {
      fails.push({
        ch: ch.name, q: q.q, stage: 'answer',
        detail: '答案表写的是 [' + expect + ']，程序实际输出 [' + actual + ']'
      });
    }
  }
}

console.log('题库章节:', CQ.length, ' 总题数:', total, ' 需运行验证:', checked);
if (fails.length === 0) {
  console.log('\n✅ 全部 ' + ok + ' 道运行验证题答案正确');
  process.exit(0);
}
console.log('\n❌ ' + fails.length + ' 处不一致：\n');
for (const f of fails) {
  console.log('[' + f.ch + '] ' + f.q);
  console.log('   ' + f.stage + ': ' + f.detail.trim() + '\n');
}
process.exit(1);
