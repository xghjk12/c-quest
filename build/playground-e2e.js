/* 自由写代码窗口的 E2E 测试 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const SHOT = path.join('D:\\c语言', 'shots');

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const checks = [];

  console.log('打开页面…');
  const BASE = process.argv[2] || 'http://127.0.0.1:7788';
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });

  /* 1. 首页有入口 */
  const hasBtn = await page.evaluate(() => !!document.querySelector('#btn-playground'));
  checks.push(['首页有入口', hasBtn, hasBtn]);

  /* 2. 点进去 */
  await page.click('#btn-playground');
  await new Promise((r) => setTimeout(r, 700));

  const state = await page.evaluate(() => ({
    active: [...document.querySelectorAll('.screen')].filter((s) => s.classList.contains('is-active')).map((s) => s.id),
    title: document.querySelector('#code-title').textContent,
    sideHidden: (() => {
      const s = document.querySelector('.code-side');
      return s ? getComputedStyle(s).display === 'none' : false;
    })(),
    submitHidden: (() => {
      const s = document.querySelector('#btn-submit');
      return s ? getComputedStyle(s).display === 'none' : false;
    })(),
    hasStdin: !!document.querySelector('#playground-stdin'),
    editorHasCode: document.querySelector('#editor').value.includes('int main'),
    isFree: globalThis.__Playground ? globalThis.__Playground.isFreeMode() : null
  }));

  checks.push(['切到编辑器页', state.active.includes('screen-code'), state.active.join(',')]);
  checks.push(['标题正确', state.title === '自由写代码', state.title]);
  checks.push(['左侧题目区隐藏', state.sideHidden, state.sideHidden]);
  checks.push(['提交判分按钮隐藏', state.submitHidden, state.submitHidden]);
  checks.push(['有标准输入框', state.hasStdin, state.hasStdin]);
  checks.push(['有默认代码', state.editorHasCode, state.editorHasCode]);
  checks.push(['自由模式标记', state.isFree === true, state.isFree]);

  /* 3. 等编译器就绪 */
  console.log('加载编译器…');
  await page.evaluate(() => globalThis.CCompiler.warmup());

  /* 4. 写一段代码并运行 */
  await page.evaluate(() => {
    document.querySelector('#editor').value =
      '#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 3; i++)\n        printf("第 %d 行\\n", i);\n    return 0;\n}';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-run');
  await new Promise((r) => setTimeout(r, 3000));

  const run1 = await page.evaluate(() => ({
    term: document.querySelector('#term-body').textContent,
    status: document.querySelector('#code-status').textContent
  }));
  checks.push(['能运行并出结果',
    run1.term.includes('第 1 行') && run1.term.includes('第 3 行'),
    JSON.stringify(run1.term.slice(0, 50))]);

  await page.screenshot({ path: path.join(SHOT, '50-playground.png') });

  /* 5. 带 stdin 的程序 */
  await page.evaluate(() => {
    document.querySelector('#editor').value =
      '#include <stdio.h>\nint main(void){\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d + %d = %d\\n", a, b, a + b);\n    return 0;\n}';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
    document.querySelector('#playground-stdin').value = '17 25';
  });
  await page.click('#btn-run');
  await new Promise((r) => setTimeout(r, 3000));

  const run2 = await page.evaluate(() => document.querySelector('#term-body').textContent);
  checks.push(['能读标准输入', run2.includes('17 + 25 = 42'), JSON.stringify(run2.slice(0, 60))]);

  /* 6. 编译错误 */
  await page.evaluate(() => {
    document.querySelector('#editor').value = 'int main(void){ return 0 }';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-run');
  await new Promise((r) => setTimeout(r, 3000));

  const run3 = await page.evaluate(() => ({
    term: document.querySelector('#term-body').textContent,
    status: document.querySelector('#code-status').textContent
  }));
  checks.push(['编译错误能显示',
    run3.status.includes('编译失败') && run3.term.includes('error'),
    run3.status]);

  /* 7. 死循环保护 */
  await page.evaluate(() => {
    document.querySelector('#editor').value = 'int main(void){ while(1); return 0; }';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  const t0 = Date.now();
  await page.click('#btn-run');
  await new Promise((r) => setTimeout(r, 11000));
  const elapsed = Date.now() - t0;

  const run4 = await page.evaluate(() => ({
    term: document.querySelector('#term-body').textContent,
    status: document.querySelector('#code-status').textContent
  }));
  checks.push(['死循环被终止',
    run4.status.includes('超时') || run4.term.includes('超过'),
    `${run4.status} (${(elapsed / 1000).toFixed(1)}s)`]);

  /* 8. 草稿保存 */
  await page.evaluate(() => {
    document.querySelector('#editor').value = '// 我的草稿测试\nint main(void){return 0;}';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await page.click('#btn-playground');
  await new Promise((r) => setTimeout(r, 600));

  const draft = await page.evaluate(() => document.querySelector('#editor').value);
  checks.push(['草稿能保存', draft.includes('我的草稿测试'), JSON.stringify(draft.slice(0, 30))]);

  /* 9. 退出后恢复正常 */
  await page.click('#btn-code-back');
  await new Promise((r) => setTimeout(r, 600));

  const afterBack = await page.evaluate(() => ({
    active: [...document.querySelectorAll('.screen')].filter((s) => s.classList.contains('is-active')).map((s) => s.id),
    isFree: globalThis.__Playground ? globalThis.__Playground.isFreeMode() : null,
    sideVisible: (() => {
      const s = document.querySelector('.code-side');
      return s ? getComputedStyle(s).display !== 'none' : true;
    })()
  }));
  checks.push(['能退出自由模式', afterBack.isFree === false, afterBack.isFree]);

  /* 10. 再进实操题，左侧应该恢复 */
  await page.evaluate(() => document.querySelector('#btn-hands-on').click());
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => document.querySelector('.hand-card').click());
  await new Promise((r) => setTimeout(r, 700));

  const normalMode = await page.evaluate(() => ({
    sideVisible: (() => {
      const s = document.querySelector('.code-side');
      return s ? getComputedStyle(s).display !== 'none' : false;
    })(),
    submitVisible: (() => {
      const s = document.querySelector('#btn-submit');
      return s ? getComputedStyle(s).display !== 'none' : false;
    })(),
    title: document.querySelector('#code-title').textContent
  }));
  checks.push(['实操题模式未受影响',
    normalMode.sideVisible && normalMode.submitVisible,
    `${normalMode.title}, 左侧=${normalMode.sideVisible}`]);

  await b.close();

  console.log('\n检查结果:');
  let fail = 0;
  for (const [name, ok, detail] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} ${detail}`);
    if (!ok) fail++;
  }

  if (errors.length) {
    console.log('\n页面错误:');
    [...new Set(errors)].slice(0, 5).forEach((e) => console.log('  ' + e));
  }

  console.log('\n──────── 结果 ────────');
  if (fail === 0 && errors.length === 0) {
    console.log('自由写代码窗口全部正常');
    process.exit(0);
  }
  console.log(`${fail} 项失败, ${errors.length} 个错误`);
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
