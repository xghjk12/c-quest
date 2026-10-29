/* 实操题网页端 E2E：真开浏览器，走完"看题 → 写代码 → 运行 → 提交"全流程 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ROOT = 'D:\\c语言';
const SHOT = path.join(ROOT, 'shots');
fs.mkdirSync(SHOT, { recursive: true });
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:7788/index.html';

const log = [];
const step = (m) => { log.push(m); console.log(m); };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  /* ---------- 1. 首页有入口 ---------- */
  const hasEntry = await page.evaluate(() => !!document.querySelector('#btn-hands-on'));
  step('首页入口: ' + hasEntry);
  if (!hasEntry) errors.push('首页没有实操入口');

  /* ---------- 2. 进实操列表 ---------- */
  await page.click('#btn-hands-on');
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(SHOT, '10-hands-list.png') });

  const listInfo = await page.evaluate(() => ({
    cards: document.querySelectorAll('.hand-card').length,
    groups: document.querySelectorAll('.hands-group').length,
    progress: document.querySelector('#hands-progress').textContent,
    server: document.querySelector('#hands-server').textContent,
    banner: !!document.querySelector('.server-banner')
  }));
  step('列表: 卡片=' + listInfo.cards + ' 分组=' + listInfo.groups +
       ' 进度="' + listInfo.progress + '" 服务="' + listInfo.server + '"');
  const expectCards = await page.evaluate(() => (globalThis.HQ || []).length);
  if (listInfo.cards !== expectCards) errors.push('实操卡片数不对: ' + listInfo.cards + '，应为 ' + expectCards);
  if (listInfo.banner) errors.push('服务已开但显示了未启动横幅');

  /* ---------- 3. 打开第一题 ---------- */
  await page.evaluate(() => document.querySelectorAll('.hand-card')[0].click());
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOT, '11-hands-task.png') });

  const taskInfo = await page.evaluate(() => ({
    title: document.querySelector('#code-title').textContent,
    task: document.querySelector('#code-task').textContent,
    editorHasStarter: document.querySelector('#editor').value.length > 20,
    cases: document.querySelectorAll('.case-item').length,
    hints: document.querySelectorAll('.hint-item').length,
    lineNums: document.querySelector('#line-nums').textContent.split('\n').length
  }));
  step('题目页: "' + taskInfo.title + '" 起手代码=' + taskInfo.editorHasStarter +
       ' 用例=' + taskInfo.cases + ' 提示=' + taskInfo.hints + ' 行号数=' + taskInfo.lineNums);
  if (!taskInfo.editorHasStarter) errors.push('编辑器没有起手代码');
  if (taskInfo.cases === 0) errors.push('没有显示测试用例');

  /* ---------- 4. 先提交一个错答案，确认会失败 ---------- */
  await page.evaluate(() => {
    // 故意写个错的：不交换，直接输出
    document.querySelector('#editor').value =
      '#include <stdio.h>\nint main(void){int a,b;scanf("%d %d",&a,&b);printf("%d %d\\n",a,b);return 0;}';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-submit');
  await new Promise((r) => setTimeout(r, 2500));

  const wrongRes = await page.evaluate(() => ({
    term: document.querySelector('#term-body').textContent.slice(0, 80),
    status: document.querySelector('#code-status').textContent,
    failRows: document.querySelectorAll('.case-row.fail').length,
    passRows: document.querySelectorAll('.case-row.pass').length,
    failMarks: document.querySelectorAll('.case-item.fail').length,
    hasDiff: !!document.querySelector('.cr-cols')
  }));
  step('错答案: 状态="' + wrongRes.status + '" 失败用例=' + wrongRes.failRows +
       ' 差异对比=' + wrongRes.hasDiff);
  if (wrongRes.failRows === 0) errors.push('错答案竟然没标出失败用例');
  if (!wrongRes.hasDiff) errors.push('没有显示期望/实际对比');
  await page.screenshot({ path: path.join(SHOT, '12-hands-fail.png') });

  /* ---------- 5. 改成正确答案，应全过 ---------- */
  await page.evaluate(() => {
    const q = globalThis.HQ.find((x) => x.id === 'h1');
    document.querySelector('#editor').value = q.solution;
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-submit');
  await new Promise((r) => setTimeout(r, 2500));

  const okRes = await page.evaluate(() => ({
    status: document.querySelector('#code-status').textContent,
    passRows: document.querySelectorAll('.case-row.pass').length,
    failRows: document.querySelectorAll('.case-row.fail').length,
    head: document.querySelector('.case-head') ? document.querySelector('.case-head').textContent : '',
    passMarks: document.querySelectorAll('.case-item.pass').length
  }));
  step('正确答案: 状态="' + okRes.status + '" 通过用例=' + okRes.passRows +
       ' 失败=' + okRes.failRows + ' 标题="' + okRes.head + '"');
  if (okRes.failRows !== 0) errors.push('正确答案还有失败用例');
  if (!okRes.status.includes('通过')) errors.push('正确答案没有标记通过');
  await page.screenshot({ path: path.join(SHOT, '13-hands-pass.png') });

  /* ---------- 6. 回列表看是否标记完成 ---------- */
  await page.click('#btn-code-back');
  await new Promise((r) => setTimeout(r, 500));
  const afterDone = await page.evaluate(() => ({
    doneCards: document.querySelectorAll('.hand-card.done').length,
    progress: document.querySelector('#hands-progress').textContent
  }));
  step('回列表: 已完成=' + afterDone.doneCards + ' 进度="' + afterDone.progress + '"');
  if (afterDone.doneCards !== 1) errors.push('完成后列表没有标记');
  await page.screenshot({ path: path.join(SHOT, '14-hands-done.png') });

  /* ---------- 7. 编译错误要能显示 ---------- */
  await page.evaluate(() => document.querySelectorAll('.hand-card')[1].click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    document.querySelector('#editor').value = 'int main(void){ return 0 }';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await page.click('#btn-run');
  await new Promise((r) => setTimeout(r, 2000));
  const compileErr = await page.evaluate(() => ({
    term: document.querySelector('#term-body').textContent,
    status: document.querySelector('#code-status').textContent
  }));
  step('编译错误: 状态="' + compileErr.status + '" 提示含"编译"=' + compileErr.term.includes('编译'));
  if (!compileErr.status.includes('编译')) errors.push('编译错误没被识别出来');
  if (compileErr.term.includes('cquest-')) errors.push('编译错误里泄露了临时目录路径');
  await page.screenshot({ path: path.join(SHOT, '15-hands-compile-error.png') });

  /* ---------- 8. 草稿持久化 ---------- */
  await page.evaluate(() => {
    document.querySelector('#editor').value = '// 我的草稿';
    document.querySelector('#editor').dispatchEvent(new Event('input'));
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  await page.click('#btn-hands-on');
  await new Promise((r) => setTimeout(r, 900));
  const draftCard = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.hand-card')];
    return cards.some((c) => c.querySelector('.hc-draft'));
  });
  step('草稿持久化: 列表显示"有草稿"=' + draftCard);
  if (!draftCard) errors.push('刷新后草稿标记丢失');

  /* ---------- 9. 手机尺寸 ---------- */
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await mobile.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  await mobile.evaluate(() => document.querySelector('#btn-hands-on').click());
  await new Promise((r) => setTimeout(r, 700));
  await mobile.screenshot({ path: path.join(SHOT, '16-hands-mobile.png') });
  const mobileOverflow = await mobile.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth
  }));
  step('手机: 文档宽=' + mobileOverflow.docW + ' 视口宽=' + mobileOverflow.winW);
  if (mobileOverflow.docW > mobileOverflow.winW + 2) errors.push('手机端横向溢出');

  await browser.close();

  console.log('\n──────── 结果 ────────');
  if (errors.length === 0) {
    console.log('✅ 实操全流程通过');
    process.exit(0);
  }
  console.log('❌ ' + errors.length + ' 个问题:');
  [...new Set(errors)].forEach((e) => console.log('  • ' + e));
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
