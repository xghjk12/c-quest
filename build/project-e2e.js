/* 游戏开发大作业板块的 E2E 验收 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ROOT = 'D:\\c语言';
const SHOT = path.join(ROOT, 'shots');
fs.mkdirSync(SHOT, { recursive: true });

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  /* 1. 数据加载 */
  const counts = await page.evaluate(() => ({
    GP: (globalThis.GP || []).length,
    HQ: (globalThis.HQ || []).length
  }));
  console.log('数据: 项目 ' + counts.GP + ' 个，实操题 ' + counts.HQ + ' 道');
  if (counts.GP !== 5) errors.push('项目数不是 5，实际 ' + counts.GP);
  if (counts.HQ !== 40) errors.push('实操题不是 40，实际 ' + counts.HQ);

  /* 2. 首页入口 */
  const hasBtn = await page.evaluate(() => !!document.querySelector('#btn-projects'));
  console.log('首页有"做个小游戏"入口: ' + hasBtn);
  if (!hasBtn) errors.push('首页缺少项目入口');

  /* 3. 列表页 */
  await page.click('#btn-projects');
  await new Promise((r) => setTimeout(r, 600));
  const listInfo = await page.evaluate(() => ({
    cards: document.querySelectorAll('.proj-card').length,
    titles: [...document.querySelectorAll('.pc-title')].map((t) => t.textContent),
    intro: !!document.querySelector('.proj-intro')
  }));
  console.log('列表: 卡片 ' + listInfo.cards + ' 个');
  console.log('  项目: ' + listInfo.titles.join(' / '));
  if (listInfo.cards !== 5) errors.push('卡片数不是 5');
  if (!listInfo.intro) errors.push('缺少"不判分"说明');
  await page.screenshot({ path: path.join(SHOT, '30-proj-list.png') });

  /* 4. 打开每个项目，检查内容完整 */
  for (let i = 0; i < 5; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.proj-card')[idx].click();
    }, i);
    // 等代码加载
    await new Promise((r) => setTimeout(r, 900));

    const detail = await page.evaluate(() => ({
      title: document.querySelector('#proj-title').textContent,
      reqs: document.querySelectorAll('#proj-req li').length,
      kns: document.querySelectorAll('.kn-item').length,
      steps: document.querySelectorAll('.step-item').length,
      pits: document.querySelectorAll('#proj-pit li').length,
      keys: document.querySelectorAll('.key-item').length,
      codeLen: document.querySelector('#proj-code').textContent.length,
      codemet: document.querySelector('#proj-codemet').textContent,
      codeLooksReal: /#include|int main/.test(document.querySelector('#proj-code').textContent)
    }));

    console.log('  [' + detail.title + '] 需求' + detail.reqs + ' 知识' + detail.kns +
                ' 步骤' + detail.steps + ' 坑' + detail.pits + ' 讲解' + detail.keys +
                ' 代码' + detail.codeLen + ' 字符');

    if (detail.reqs === 0) errors.push(detail.title + ' 没有需求');
    if (detail.kns === 0) errors.push(detail.title + ' 没有知识点');
    if (detail.steps === 0) errors.push(detail.title + ' 没有实现步骤');
    if (detail.pits === 0) errors.push(detail.title + ' 没有易错点');
    if (!detail.codeLooksReal) errors.push(detail.title + ' 的成品代码没加载出来');

    if (i === 4) {
      await page.screenshot({ path: path.join(SHOT, '31-proj-snake.png') });
    }

    // 回列表
    await page.click('#btn-proj-back');
    await new Promise((r) => setTimeout(r, 400));
  }

  /* 5. 知识点必须都标注了来源 */
  const knCheck = await page.evaluate(() => {
    const GP = globalThis.GP;
    const bad = [];
    for (const p of GP) {
      for (const k of p.knowledge) {
        if (!k.from || k.from.trim() === '') bad.push(p.title + ' 的「' + k.name + '」没标来源');
      }
    }
    return bad;
  });
  if (knCheck.length) {
    knCheck.forEach((x) => errors.push(x));
  } else {
    console.log('知识点来源: 全部已标注 ✓');
  }

  /* 6. 手机尺寸 */
  const mobile = await b.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await mobile.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  await mobile.evaluate(() => document.querySelector('#btn-projects').click());
  await new Promise((r) => setTimeout(r, 600));
  await mobile.screenshot({ path: path.join(SHOT, '32-proj-mobile.png') });
  const mw = await mobile.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth
  }));
  console.log('手机: 文档宽 ' + mw.docW + ' 视口宽 ' + mw.winW);
  if (mw.docW > mw.winW + 2) errors.push('手机端横向溢出');

  await b.close();

  console.log('\n──────── 结果 ────────');
  if (errors.length === 0) {
    console.log('✅ 游戏大作业板块全部正常');
    process.exit(0);
  }
  console.log('❌ ' + errors.length + ' 个问题:');
  [...new Set(errors)].forEach((e) => console.log('  • ' + e));
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
