/* 算法题的网页端验收：真的提交参考解答，确认判分是通过的 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');

const ROOT = 'D:\\c语言';
const SHOT = path.join(ROOT, 'shots');
const fs = require('fs');
fs.mkdirSync(SHOT, { recursive: true });

/* 抽 4 道不同方向的算法题，逐个真提交 */
const TARGETS = ['a1', 'a6', 'a9', 'a12'];

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

  // 题数检查
  const count = await page.evaluate(() => (globalThis.HQ || []).length);
  console.log('题库题数: ' + count);
  if (count !== 40) errors.push('题数不是 40，实际 ' + count);

  await page.click('#btn-hands-on');
  await new Promise((r) => setTimeout(r, 900));

  const listInfo = await page.evaluate(() => ({
    cards: document.querySelectorAll('.hand-card').length,
    groups: [...document.querySelectorAll('.hands-group-h')].map((h) => h.textContent)
  }));
  console.log('卡片数: ' + listInfo.cards + '  分组: ' + listInfo.groups.join(' / '));
  if (listInfo.cards !== 40) errors.push('卡片数不是 40，实际 ' + listInfo.cards);

  // 算法题分组是否存在
  for (const need of ['递归与回溯', '排序', '二分查找', '动态规划', '双指针', '位运算与综合']) {
    if (!listInfo.groups.includes(need)) errors.push('缺少分组: ' + need);
  }

  await page.screenshot({ path: path.join(SHOT, '20-hands-algo-list.png') });

  // 逐题真提交
  for (const id of TARGETS) {
    const opened = await page.evaluate((qid) => {
      const card = [...document.querySelectorAll('.hand-card')].find((c) => c.dataset.id === qid);
      if (!card) return false;
      card.click();
      return true;
    }, id);
    if (!opened) { errors.push('找不到题目卡片 ' + id); continue; }

    await new Promise((r) => setTimeout(r, 400));

    // 填入参考解答
    const filled = await page.evaluate((qid) => {
      const q = globalThis.HQ.find((x) => x.id === qid);
      if (!q) return false;
      const ed = document.querySelector('#editor');
      ed.value = q.solution;
      ed.dispatchEvent(new Event('input'));
      return true;
    }, id);
    if (!filled) { errors.push('找不到题目数据 ' + id); continue; }

    await page.click('#btn-submit');
    // 算法题用例多，给足时间
    await new Promise((r) => setTimeout(r, 4000));

    const res = await page.evaluate(() => ({
      status: document.querySelector('#code-status').textContent,
      pass: document.querySelectorAll('.case-row.pass').length,
      fail: document.querySelectorAll('.case-row.fail').length,
      head: document.querySelector('.case-head') ? document.querySelector('.case-head').textContent : ''
    }));

    console.log('  ' + id + ': 状态="' + res.status + '" 通过=' + res.pass + ' 失败=' + res.fail);
    if (res.fail > 0) errors.push(id + ' 参考解答提交后仍有失败用例');
    if (!res.status.includes('通过')) errors.push(id + ' 状态不是通过：' + res.status);

    if (id === 'a10') {
      await page.screenshot({ path: path.join(SHOT, '21-hands-algo-pass.png') });
    }

    // 回列表
    await page.click('#btn-code-back');
    await new Promise((r) => setTimeout(r, 500));
  }

  // 截一张算法题页面的图
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('.hand-card')].find((c) => c.dataset.id === 'a9');
    if (card) card.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SHOT, '22-hands-algo-task.png') });

  await b.close();

  console.log('\n──────── 结果 ────────');
  if (errors.length === 0) {
    console.log('✅ 算法题网页端全部正常');
    process.exit(0);
  }
  console.log('❌ ' + errors.length + ' 个问题:');
  [...new Set(errors)].forEach((e) => console.log('  • ' + e));
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
