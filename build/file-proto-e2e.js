/* file:// 离线验收：确认双击 index.html 也能玩（除实操题外） */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ROOT = 'D:\\c语言';
const SHOT = path.join(ROOT, 'shots');

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  const fileUrl = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  console.log('打开:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const checks = [];

  /* 1. 数据全加载 */
  const data = await page.evaluate(() => ({
    CQ: globalThis.CQ ? globalThis.CQ.length : 0,
    HQ: globalThis.HQ ? globalThis.HQ.length : 0,
    GP: globalThis.GP ? globalThis.GP.length : 0,
    GS: globalThis.GAME_SOURCES ? Object.keys(globalThis.GAME_SOURCES).length : 0
  }));
  checks.push(['读代码题库加载', data.CQ === 10, `${data.CQ} 章`]);
  checks.push(['实操题库加载', data.HQ === 40, `${data.HQ} 道`]);
  checks.push(['大作业加载', data.GP === 5, `${data.GP} 个`]);
  checks.push(['内联源码加载', data.GS === 5, `${data.GS} 个`]);

  /* 2. 读代码题能玩（不依赖编译器） */
  await page.evaluate(() => document.querySelector('#btn-start').click());
  await new Promise((r) => setTimeout(r, 600));
  const mapOk = await page.evaluate(() => document.querySelectorAll('.chapter-card').length);
  checks.push(['章节地图', mapOk === 10, `${mapOk} 章`]);

  await page.evaluate(() => document.querySelectorAll('.chapter-card')[0].click());
  await new Promise((r) => setTimeout(r, 600));
  const quizOk = await page.evaluate(() => {
    const opts = document.querySelectorAll('.opt').length;
    const code = document.querySelector('#code');
    return { opts, codeLen: code ? code.textContent.length : 0 };
  });
  checks.push(['答题页可用', quizOk.opts === 4 && quizOk.codeLen > 20,
    `${quizOk.opts} 选项, 代码 ${quizOk.codeLen} 字符`]);

  // 答一题
  await page.evaluate(() => {
    const g = window.__CQuest;
    const q = g.CQ[g.state.chapter].qs[g.state.order[g.state.qi]];
    const btns = [...document.querySelectorAll('.opt')];
    const right = btns.find((b) => Number(b.dataset.value) === q.a);
    if (right) right.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const answered = await page.evaluate(() => !document.querySelector('#feedback').hidden);
  checks.push(['能答题', answered, answered ? '反馈已显示' : '无反馈']);

  /* 3. 实操题：能看能写，但不能运行 */
  await page.evaluate(() => document.querySelector('[data-nav="home"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#btn-hands-on').click());
  await new Promise((r) => setTimeout(r, 900));

  const handsState = await page.evaluate(() => ({
    cards: document.querySelectorAll('.hand-card').length,
    banner: !!document.querySelector('.server-banner'),
    badge: document.querySelector('#hands-server') ? document.querySelector('#hands-server').textContent : ''
  }));
  checks.push(['实操列表可看', handsState.cards === 40, `${handsState.cards} 张卡片`]);
  checks.push(['显示降级提示', handsState.banner, handsState.badge]);

  // 能进题、能写代码
  await page.evaluate(() => document.querySelector('.hand-card').click());
  await new Promise((r) => setTimeout(r, 500));
  const editorState = await page.evaluate(() => {
    const ed = document.querySelector('#editor');
    return { hasStarter: ed && ed.value.length > 20, len: ed ? ed.value.length : 0 };
  });
  checks.push(['编辑器可用', editorState.hasStarter, `起手代码 ${editorState.len} 字符`]);

  // 点运行应该给出友好提示，而不是崩溃
  await page.evaluate(() => document.querySelector('#btn-run').click());
  await new Promise((r) => setTimeout(r, 1200));
  const runMsg = await page.evaluate(() => {
    const t = document.querySelector('#term-body');
    return t ? t.textContent.slice(0, 80) : '';
  });
  checks.push(['运行给出提示', runMsg.includes('file://') || runMsg.includes('编译器'),
    JSON.stringify(runMsg.slice(0, 40))]);

  /* 4. 大作业代码能显示 */
  await page.evaluate(() => document.querySelector('#btn-code-back').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('[data-nav="home"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#btn-projects').click());
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => document.querySelectorAll('.proj-card')[3].click()); // 俄罗斯方块
  await new Promise((r) => setTimeout(r, 700));

  const projState = await page.evaluate(() => {
    const el = document.querySelector('#proj-code');
    return {
      title: document.querySelector('#proj-title').textContent,
      len: el ? el.textContent.length : 0,
      hasInclude: el ? el.textContent.includes('#include') : false
    };
  });
  checks.push(['大作业代码显示', projState.len > 1000 && projState.hasInclude,
    `${projState.title} ${projState.len} 字符`]);

  await page.screenshot({ path: path.join(SHOT, '40-file-proto-project.png') });

  await b.close();

  console.log('\n检查结果:');
  let fail = 0;
  for (const [name, ok, detail] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${name.padEnd(16)} ${detail}`);
    if (!ok) fail++;
  }

  if (errors.length) {
    console.log('\n页面错误:');
    errors.forEach((e) => console.log('  ' + e));
  }

  console.log('\n──────── 结果 ────────');
  if (fail === 0 && errors.length === 0) {
    console.log('✅ file:// 离线模式完全可用（实操题会提示需要服务）');
    process.exit(0);
  }
  console.log(`❌ ${fail} 项失败, ${errors.length} 个页面错误`);
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
