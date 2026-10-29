/* 浏览器自动化验收：真开 Edge 打开游戏，走完整流程并截图 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ROOT = 'D:\\c语言';
const SHOT = path.join(ROOT, 'shots');
fs.mkdirSync(SHOT, { recursive: true });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

const log = [];
function step(msg) { log.push(msg); console.log(msg); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  // ---------- 1. 首页 ----------
  await page.screenshot({ path: path.join(SHOT, '01-home.png') });
  const homeOk = await page.evaluate(() => ({
    chapters: (globalThis.CQ || []).length,
    totalQ: (globalThis.CQ || []).reduce((s, c) => s + c.qs.length, 0),
    startVisible: !!document.querySelector('#btn-start'),
    statCleared: document.querySelector('#stat-cleared').textContent
  }));
  step('首页: 章节=' + homeOk.chapters + ' 题=' + homeOk.totalQ + ' 通关=' + homeOk.statCleared);

  // ---------- 2. 进入地图 ----------
  await page.click('#btn-start');
  await new Promise((r) => setTimeout(r, 450));
  await page.screenshot({ path: path.join(SHOT, '02-map.png') });
  const mapInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.chapter-card')];
    return {
      count: cards.length,
      locked: cards.filter((c) => c.classList.contains('locked')).length,
      unlocked: cards.filter((c) => !c.classList.contains('locked')).length,
      names: cards.map((c) => c.querySelector('.cc-name').textContent)
    };
  });
  step('地图: 卡片=' + mapInfo.count + ' 解锁=' + mapInfo.unlocked + ' 锁定=' + mapInfo.locked);

  if (mapInfo.unlocked !== 1) errors.push('解锁规则错误：初始应只有 1 章解锁');

  // ---------- 3. 点锁定章节应被拒绝 ----------
  await page.evaluate(() => document.querySelectorAll('.chapter-card')[1].click());
  await new Promise((r) => setTimeout(r, 300));
  const stillMap = await page.evaluate(() => document.querySelector('#screen-map').classList.contains('is-active'));
  step('点锁定章节: 仍在地图=' + stillMap);
  if (!stillMap) errors.push('锁定章节竟然能进入');

  // ---------- 4. 进入第 1 章 ----------
  await page.evaluate(() => document.querySelectorAll('.chapter-card')[0].click());
  await new Promise((r) => setTimeout(r, 450));
  await page.screenshot({ path: path.join(SHOT, '03-quiz.png') });

  const quizInfo = await page.evaluate(() => ({
    codeLines: document.querySelectorAll('#code .ln').length,
    options: document.querySelectorAll('.opt').length,
    title: document.querySelector('#q-chapter-name').textContent,
    qtext: document.querySelector('#q-text').textContent,
    hasCodeText: document.querySelector('#code').textContent.trim().length > 10,
    hearts: document.querySelectorAll('.heart').length
  }));
  step('答题页: 代码行=' + quizInfo.codeLines + ' 选项=' + quizInfo.options +
       ' 生命=' + quizInfo.hearts + ' 题="' + quizInfo.qtext.slice(0, 22) + '"');
  if (quizInfo.options !== 4) errors.push('选项数不是 4');
  if (!quizInfo.hasCodeText) errors.push('代码块是空的');

  // ---------- 5. 故意答错一题 ----------
  const wrongRes = await page.evaluate(() => {
    const g = window.__CQuest;
    const q = g.CQ[g.state.chapter].qs[g.state.order[g.state.qi]];
    const correct = q.a;
    const btns = [...document.querySelectorAll('.opt')];
    const wrongBtn = btns.find((b) => Number(b.dataset.value) !== correct);
    wrongBtn.click();
    return {
      correctValue: correct,
      picked: Number(wrongBtn.dataset.value),
      heartsLeft: g.state.hearts,
      feedbackShown: !document.querySelector('#feedback').hidden,
      feedbackClass: document.querySelector('#feedback').className,
      correctMarked: !!document.querySelector('.opt.correct'),
      wrongMarked: !!document.querySelector('.opt.wrong')
    };
  });
  step('答错: 生命=' + wrongRes.heartsLeft + ' 反馈=' + wrongRes.feedbackClass +
       ' 标绿=' + wrongRes.correctMarked + ' 标红=' + wrongRes.wrongMarked);
  if (wrongRes.heartsLeft !== 2) errors.push('答错没有扣血');
  if (!wrongRes.correctMarked || !wrongRes.wrongMarked) errors.push('答错后没有正确标出对错');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOT, '04-wrong.png') });

  // 检查错题是否入本
  const wrongBook = await page.evaluate(() => window.__CQuest.save.wrong.length);
  step('错题本记录数=' + wrongBook);
  if (wrongBook !== 1) errors.push('错题没有进错题本');

  // ---------- 6. 点继续 ----------
  await page.click('#btn-next');
  await new Promise((r) => setTimeout(r, 350));
  const advanced = await page.evaluate(() => ({
    qi: window.__CQuest.state.qi,
    progress: document.querySelector('#progress-fill').style.width
  }));
  step('继续: 第 ' + (advanced.qi + 1) + ' 题, 进度条=' + advanced.progress);
  if (advanced.qi !== 1) errors.push('点继续没有进入下一题');

  // ---------- 7. 快速走完本章（全答对）----------
  const runResult = await page.evaluate(async () => {
    const g = window.__CQuest;
    const total = g.CQ[g.state.chapter].qs.length;
    for (let i = 0; i < total; i++) {
      if (document.querySelector('#screen-result').classList.contains('is-active')) break;
      if (g.state.locked) {
        document.querySelector('#btn-next').click();
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }
      const q = g.CQ[g.state.chapter].qs[g.state.order[g.state.qi]];
      const btns = [...document.querySelectorAll('.opt')];
      const btn = btns.find((b) => Number(b.dataset.value) === q.a);
      if (!btn) return { error: '找不到正确选项' };
      btn.click();
      await new Promise((r) => setTimeout(r, 60));
      if (g.state.hearts <= 0) break;
      document.querySelector('#btn-next').click();
      await new Promise((r) => setTimeout(r, 60));
    }
    return {
      screen: [...document.querySelectorAll('.screen')].filter((s) => s.classList.contains('is-active')).map((s) => s.id),
      correct: g.state.correct,
      score: g.state.score,
      hearts: g.state.hearts,
      stars: g.save.stars
    };
  });
  step('走完一章: 界面=' + JSON.stringify(runResult.screen) + ' 答对=' + runResult.correct +
       ' 分数=' + runResult.score + ' 星级=' + JSON.stringify(runResult.stars));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SHOT, '05-result.png') });

  if (!runResult.screen || !runResult.screen.includes('screen-result')) errors.push('走完章节没进结算页');

  // ---------- 8. 回地图看解锁 ----------
  await page.evaluate(() => document.querySelector('#btn-result-next') ? document.querySelector('#btn-result-next').click() : null);
  await new Promise((r) => setTimeout(r, 500));
  const afterUnlock = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.chapter-card')];
    return {
      screen: [...document.querySelectorAll('.screen')].filter((s) => s.classList.contains('is-active')).map((s) => s.id),
      unlocked: cards ? cards.filter((c) => !c.classList.contains('locked')).length : 0,
      currentQ: document.querySelector('#q-chapter-name').textContent
    };
  });
  step('结算后: 界面=' + JSON.stringify(afterUnlock.screen) + ' 当前=' + afterUnlock.currentQ);
  await page.screenshot({ path: path.join(SHOT, '06-next-chapter.png') });

  // ---------- 9. 错题本页面 ----------
  await page.evaluate(() => {
    document.querySelectorAll('[data-nav="home"]')[0].click();
  });
  await new Promise((r) => setTimeout(r, 350));
  await page.click('#btn-review-home');
  await new Promise((r) => setTimeout(r, 400));
  const reviewInfo = await page.evaluate(() => ({
    items: document.querySelectorAll('.review-item').length,
    hasPre: !!document.querySelector('.review-item pre'),
    hasWhy: !!document.querySelector('.ri-why')
  }));
  step('错题本: 条目=' + reviewInfo.items + ' 有代码=' + reviewInfo.hasPre + ' 有解析=' + reviewInfo.hasWhy);
  await page.screenshot({ path: path.join(SHOT, '07-review.png') });

  // ---------- 10. 手机尺寸 ----------
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  await mobile.screenshot({ path: path.join(SHOT, '08-mobile-home.png') });
  await mobile.evaluate(() => document.querySelector('#btn-start').click());
  await new Promise((r) => setTimeout(r, 400));
  await mobile.evaluate(() => document.querySelectorAll('.chapter-card')[0].click());
  await new Promise((r) => setTimeout(r, 450));
  await mobile.screenshot({ path: path.join(SHOT, '09-mobile-quiz.png') });
  const mobileOverflow = await mobile.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    optW: document.querySelector('.opt') ? document.querySelector('.opt').getBoundingClientRect().width : 0
  }));
  step('手机: 文档宽=' + mobileOverflow.docW + ' 视口宽=' + mobileOverflow.winW);
  if (mobileOverflow.docW > mobileOverflow.winW + 2) errors.push('手机端出现横向滚动');

  await browser.close();

  console.log('\n──────── 结果 ────────');
  if (errors.length === 0) {
    console.log('✅ 全流程通过，无 JS 报错，截图 ' + fs.readdirSync(SHOT).length + ' 张');
    process.exit(0);
  } else {
    console.log('❌ ' + errors.length + ' 个问题:');
    [...new Set(errors)].forEach((e) => console.log('  • ' + e));
    process.exit(1);
  }
})().catch((e) => {
  console.error('崩溃:', e);
  process.exit(1);
});
