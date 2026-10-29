/* 在真实浏览器里验证浏览器内编译器能跑 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  console.log('打开测试页…');
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:7788/build/wasm-test.html', {
    waitUntil: 'networkidle0',
    timeout: 180000
  });

  // 等结果（最多 3 分钟，首次要下载 28MB）
  console.log('等待编译测试完成…');
  try {
    await page.waitForFunction(() => window.__RESULT !== undefined, { timeout: 180000 });
  } catch (e) {
    console.log('等待超时');
    const text = await page.evaluate(() => document.getElementById('log').textContent);
    console.log(text);
    await b.close();
    process.exit(1);
  }

  const total = Date.now() - t0;
  const result = await page.evaluate(() => window.__RESULT);
  const logText = await page.evaluate(() => document.getElementById('log').textContent);

  console.log('\n=== 页面日志 ===');
  console.log(logText);
  console.log('\n=== 浏览器控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '(无)');

  await b.close();

  console.log('\n──────── 结果 ────────');
  if (result.pass) {
    console.log('✅ 浏览器内编译全部通过，总耗时 ' + total + 'ms（含 28MB 下载）');
    process.exit(0);
  }
  console.log('❌ 失败:', JSON.stringify(result));
  process.exit(1);
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
