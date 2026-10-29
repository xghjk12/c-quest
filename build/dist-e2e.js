/* 验证打包产物 dist/ 能独立工作（这是要交付给别人的东西） */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');

const BASE = process.argv[2] || 'http://127.0.0.1:8899';

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    const u = r.url();
    // 忽略 favicon 之类无关的
    if (!u.includes('favicon')) errors.push('requestfailed: ' + u);
  });

  const checks = [];
  const t0 = Date.now();

  console.log('打开 ' + BASE + ' …');
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0', timeout: 60000 });

  /* 1. 数据加载 */
  const data = await page.evaluate(() => ({
    CQ: globalThis.CQ ? globalThis.CQ.length : 0,
    HQ: globalThis.HQ ? globalThis.HQ.length : 0,
    GP: globalThis.GP ? globalThis.GP.length : 0,
    GS: globalThis.GAME_SOURCES ? Object.keys(globalThis.GAME_SOURCES).length : 0,
    hasCompiler: !!globalThis.CCompiler
  }));
  checks.push(['题库 10 章', data.CQ === 10, data.CQ]);
  checks.push(['实操 40 道', data.HQ === 40, data.HQ]);
  checks.push(['大作业 5 个', data.GP === 5, data.GP]);
  checks.push(['内联源码 5 个', data.GS === 5, data.GS]);
  checks.push(['编译器脚本加载', data.hasCompiler, data.hasCompiler]);

  /* 2. 编译器加载 */
  const loadStart = Date.now();
  const loadOk = await page.evaluate(() => globalThis.CCompiler.warmup());
  const loadMs = Date.now() - loadStart;
  checks.push(['编译器可用', loadOk, loadMs + 'ms']);

  /* 3. 真编译一道题 */
  const compileResult = await page.evaluate(async () => {
    const q = globalThis.HQ.find((x) => x.id === 'h1');
    const s = performance.now();
    let pass = 0;
    for (const c of q.cases) {
      const r = await globalThis.CCompiler.run(q.solution, c.in);
      if (r.ok && r.stdout.replace(/\r\n/g, '\n') === c.expect.replace(/\r\n/g, '\n')) pass++;
    }
    return { ms: Math.round(performance.now() - s), pass, total: q.cases.length };
  });
  checks.push(['编译判分正常', compileResult.pass === compileResult.total,
    `${compileResult.pass}/${compileResult.total} 用例, ${compileResult.ms}ms`]);

  /* 4. 走一遍 UI：进实操题、提交、通过 */
  await page.evaluate(() => document.querySelector('#btn-hands-on').click());
  await new Promise((r) => setTimeout(r, 900));

  const listOk = await page.evaluate(() => document.querySelectorAll('.hand-card').length);
  checks.push(['实操列表渲染', listOk === 40, listOk + ' 张卡片']);

  // 打开第一题，填参考解答，提交
  await page.evaluate(() => document.querySelector('.hand-card').click());
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const g = globalThis.HQ;
    const cur = document.querySelector('#editor');
    // 找当前题（通过标题匹配）
    const title = document.querySelector('#code-title').textContent;
    const q = g.find((x) => x.title === title);
    if (q) {
      cur.value = q.solution;
      cur.dispatchEvent(new Event('input'));
    }
  });
  await page.click('#btn-submit');
  await new Promise((r) => setTimeout(r, 4000));

  const submitOk = await page.evaluate(() => ({
    status: document.querySelector('#code-status').textContent,
    pass: document.querySelectorAll('.case-row.pass').length,
    fail: document.querySelectorAll('.case-row.fail').length
  }));
  checks.push(['提交判分通过', submitOk.fail === 0 && submitOk.status.includes('通过'),
    `${submitOk.status} (${submitOk.pass} 过)`]);

  /* 5. 大作业代码 */
  await page.evaluate(() => document.querySelector('#btn-code-back').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('[data-nav="home"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#btn-projects').click());
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => document.querySelectorAll('.proj-card')[4].click());
  await new Promise((r) => setTimeout(r, 700));

  const projOk = await page.evaluate(() => {
    const el = document.querySelector('#proj-code');
    return { len: el ? el.textContent.length : 0, inc: el ? el.textContent.includes('#include') : false };
  });
  checks.push(['大作业代码显示', projOk.len > 1000 && projOk.inc, projOk.len + ' 字符']);

  await b.close();

  const totalMs = Date.now() - t0;

  console.log('\n检查结果:');
  let fail = 0;
  for (const [name, ok, detail] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${detail}`);
    if (!ok) fail++;
  }

  if (errors.length) {
    console.log('\n页面错误:');
    errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  }

  console.log(`\n总耗时: ${(totalMs / 1000).toFixed(1)}s`);
  console.log('\n──────── 结果 ────────');
  if (fail === 0 && errors.length === 0) {
    console.log('打包产物可以独立部署');
    process.exit(0);
  }
  console.log(`${fail} 项失败, ${errors.length} 个页面错误`);
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
