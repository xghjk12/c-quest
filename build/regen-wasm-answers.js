/* 用浏览器内的 Clang(wasm) 重新生成题库期望输出
   理由：网页版是主要场景，答案必须以 wasm 的实际行为为准。
   对拍范围：所有实操题（含算法题、游戏题）。
*/
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = 'D:\\c语言';
const FILES = ['hands-on.js', 'hands-on-algo.js', 'hands-on-game.js'];

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await b.newPage();
  await page.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => globalThis.HQ && globalThis.CCompiler, { timeout: 30000 });

  console.log('加载编译器…');
  await page.evaluate(() => globalThis.CCompiler.warmup());

  console.log('跑全部用例（用 wasm）…');
  const result = await page.evaluate(async () => {
    const HQ = globalThis.HQ;
    const norm = (s) => String(s || '').replace(/\r\n/g, '\n');
    const out = [];

    for (const q of HQ) {
      for (let j = 0; j < q.cases.length; j++) {
        const c = q.cases[j];
        let r;
        try {
          r = await globalThis.CCompiler.run(q.solution, c.in);
        } catch (e) {
          out.push({ id: q.id, caseNo: j + 1, kind: 'exception', detail: String(e) });
          continue;
        }
        if (!r.ok) {
          out.push({
            id: q.id, caseNo: j + 1,
            kind: r.timedOut ? 'timeout' : 'error',
            detail: r.error || (r.errors || []).join('; ').slice(0, 200)
          });
          continue;
        }
        const got = norm(r.stdout);
        const want = norm(c.expect);
        if (got !== want) {
          out.push({ id: q.id, caseNo: j + 1, kind: 'mismatch', input: c.in, want, got });
        }
      }
    }
    return out;
  });

  await b.close();

  console.log(`\n共 ${result.length} 处需要修正`);

  if (!WRITE) {
    if (result.length === 0) {
      console.log('✅ 全部一致，不需要修改');
      process.exit(0);
    }
    console.log('\n前 10 处：');
    for (const r of result.slice(0, 10)) {
      console.log(`  ${r.id} 用例${r.caseNo} [${r.kind}]`);
      if (r.kind === 'mismatch') {
        console.log(`     输入: ${JSON.stringify(r.input)}`);
        console.log(`     旧值: ${JSON.stringify(r.want)}`);
        console.log(`     wasm: ${JSON.stringify(r.got)}`);
      } else {
        console.log(`     ${r.detail}`);
      }
    }
    console.log('\n加 --write 写入');
    process.exit(0);
  }

  /* ---------- 写回 ---------- */
  // 按题收集要改的 (caseNo, newValue)
  const byId = new Map();
  for (const r of result) {
    if (r.kind !== 'mismatch') continue;
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }

  let totalFixed = 0;

  for (const file of FILES) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    let touched = 0;

    for (const [id, items] of byId) {
      // 定位题目
      let start = -1;
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp("id:\\s*'" + id + "'").test(lines[i])) {
          for (let j = i; j >= 0; j--) {
            if (lines[j] === '    {') { start = j; break; }
          }
          break;
        }
      }
      if (start < 0) continue;

      let depth = 0;
      let end = -1;
      for (let i = start; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        if (depth === 0) { end = i; break; }
      }
      if (end < 0) continue;

      // 收集这个题目范围内的 expect 行
      const expLines = [];
      for (let i = start; i <= end; i++) {
        if (/\bexpect:\s*'/.test(lines[i])) expLines.push(i);
      }

      for (const it of items) {
        const idx = expLines[it.caseNo - 1];
        if (idx === undefined) continue;
        const oldLine = lines[idx];
        // 只替换 expect: '...' 里的内容
        const m = oldLine.match(/^([\s\S]*?expect:\s*)'[\s\S]*?',\s*(\}.*)$/);
        if (!m) continue;
        const esc = it.got
          .split('\\').join('\\\\')
          .split("'").join("\\'")
          .split('\n').join('\\n');
        lines[idx] = m[1] + "'" + esc + "', " + m[2];
        touched++;
        console.log(`  改 ${file}:${idx + 1}  (${id} 用例 ${it.caseNo})`);
      }
    }

    if (touched > 0) {
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      totalFixed += touched;
    }
  }

  console.log(`\n已写回 ${totalFixed} 处`);
  console.log('请再跑一次（不带 --write）确认。');
  process.exit(0);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
