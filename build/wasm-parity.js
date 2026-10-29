/* 关键验证：用浏览器内的 Clang(wasm) 跑全部实操题用例，
   和题库里已有的 expect（当初用 TCC 生成）逐字节比对。

   这一步是这次改造的核心风险点：换编译器后，
   某些题目的输出可能不同（浮点格式、字符串函数行为等）。
*/
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  console.log('打开页面…');
  await page.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });

  // 等所有题库加载
  await page.waitForFunction(
    () => globalThis.HQ && globalThis.HQ.length > 0 && globalThis.CCompiler,
    { timeout: 30000 }
  );

  const stats = await page.evaluate(() => ({
    HQ: globalThis.HQ.length,
    cases: globalThis.HQ.reduce((s, q) => s + q.cases.length, 0)
  }));
  console.log(`题库: ${stats.HQ} 道题, ${stats.cases} 个用例`);

  console.log('加载编译器…');
  const t0 = Date.now();
  await page.evaluate(() => globalThis.CCompiler.warmup());
  console.log(`编译器就绪，用时 ${Date.now() - t0}ms`);

  console.log('开始逐个跑参考解答…');

  // 在页面里跑完所有题（异步，可能需要几分钟）
  const result = await page.evaluate(async () => {
    const HQ = globalThis.HQ;
    const norm = (s) => String(s || '').replace(/\r\n/g, '\n');
    const results = [];

    for (let i = 0; i < HQ.length; i++) {
      const q = HQ[i];
      for (let j = 0; j < q.cases.length; j++) {
        const c = q.cases[j];
        let r;
        try {
          r = await globalThis.CCompiler.run(q.solution, c.in);
        } catch (e) {
          results.push({ id: q.id, title: q.title, caseNo: j + 1, kind: 'exception', detail: String(e) });
          continue;
        }

        if (!r.ok) {
          results.push({
            id: q.id, title: q.title, caseNo: j + 1,
            kind: r.timedOut ? 'timeout' : 'error',
            detail: r.error || (r.errors || []).join('; ').slice(0, 200)
          });
          continue;
        }

        const got = norm(r.stdout);
        const want = norm(c.expect);
        if (got !== want) {
          results.push({
            id: q.id, title: q.title, caseNo: j + 1,
            kind: 'mismatch',
            input: c.in,
            want: want,
            got: got
          });
        }
      }
    }
    return results;
  });

  await b.close();

  console.log('\n──────── 结果 ────────');
  if (result.length === 0) {
    console.log(`✅ 全部 ${stats.cases} 个用例，wasm 编译器的输出与 TCC 完全一致`);
    process.exit(0);
  }

  console.log(`❌ ${result.length} 处不一致：\n`);
  for (const r of result.slice(0, 30)) {
    console.log(`  ${r.id} 「${r.title}」用例 ${r.caseNo} — ${r.kind}`);
    if (r.kind === 'mismatch') {
      console.log(`     输入: ${JSON.stringify(r.input)}`);
      console.log(`     TCC 期望: ${JSON.stringify(r.want)}`);
      console.log(`     wasm 实际: ${JSON.stringify(r.got)}`);
    } else {
      console.log(`     ${r.detail}`);
    }
    console.log('');
  }
  if (result.length > 30) console.log(`  …还有 ${result.length - 30} 处`);
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
