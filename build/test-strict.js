/* 用严格比对（保留末尾换行）重跑所有实操题的参考解答
   目的：确认改成严格模式后，20 道题自己都能过，不会误伤 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = process.cwd();
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');

globalThis.HQ = [];
require(path.join(ROOT, 'hands-on.js'));
require(path.join(ROOT, 'hands-on-algo.js'));
require(path.join(ROOT, 'hands-on-game.js'));
const HQ = globalThis.HQ;

const norm = (s) => String(s || '').replace(/\r\n/g, '\n');   // 严格：不动尾部空白

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cquest-strict-'));
let bad = 0;

/* g1 / g2 的答案依赖随机数实现，本地 TCC 和网页 wasm 会不同。
   答案以 wasm 为准（build/regen-wasm-answers.js 生成），本地跳过。 */
const SKIP = new Set(['g1', 'g2']);

for (const q of HQ) {
  if (SKIP.has(q.id)) continue;
  const dir = path.join(tmp, q.id);
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, 'main.c');
  const exe = path.join(dir, 'main.exe');
  fs.writeFileSync(src, q.solution, 'utf8');

  try {
    execFileSync(TCC, ['-o', exe, src], { stdio: 'pipe', cwd: dir });
  } catch (e) {
    console.log('[编译失败] ' + q.id + ' ' + q.title);
    bad++;
    continue;
  }

  for (let i = 0; i < q.cases.length; i++) {
    const c = q.cases[i];
    let out = '';
    try {
      out = execFileSync(exe, [], {
        input: c.in, encoding: 'utf8', stdio: 'pipe', cwd: dir, timeout: 10000
      });
    } catch (e) {
      console.log('[运行失败] ' + q.id + ' 用例' + (i + 1));
      bad++;
      continue;
    }
    const got = norm(out);
    const want = norm(c.expect);
    if (got !== want) {
      bad++;
      console.log('[不一致] ' + q.id + ' 「' + q.title + '」用例 ' + (i + 1));
      console.log('    期望: ' + JSON.stringify(want));
      console.log('    实际: ' + JSON.stringify(got));
    }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

const total = HQ.reduce((s, q) => s + q.cases.length, 0);
if (bad === 0) {
  console.log('✅ 严格比对下，' + HQ.length + ' 道题 ' + total + ' 个用例全部通过（参考解答没有误伤）');
  process.exit(0);
}
console.log('\n❌ ' + bad + ' 处不一致');
process.exit(1);
