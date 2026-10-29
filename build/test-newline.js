/* 针对性验证：网页版是否真的抓得住"少写一个 \n"这种经典错误 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox']
  });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });

  await p.click('#btn-hands-on');
  await new Promise((r) => setTimeout(r, 800));
  await p.evaluate(() => document.querySelectorAll('.hand-card')[0].click());
  await new Promise((r) => setTimeout(r, 400));

  // 换成"逻辑全对，但 printf 忘了 \n"
  await p.evaluate(() => {
    const ed = document.querySelector('#editor');
    ed.value = '#include <stdio.h>\nint main(void){int a,b,t;scanf("%d %d",&a,&b);t=a;a=b;b=t;printf("%d %d",a,b);return 0;}';
    ed.dispatchEvent(new Event('input'));
  });
  await p.click('#btn-submit');
  await new Promise((r) => setTimeout(r, 2500));

  const r = await p.evaluate(() => ({
    status: document.querySelector('#code-status').textContent,
    fail: document.querySelectorAll('.case-row.fail').length,
    pass: document.querySelectorAll('.case-row.pass').length,
    firstExpect: document.querySelector('.case-row.fail .cr-cols div:first-child pre')
      ? document.querySelector('.case-row.fail .cr-cols div:first-child pre').textContent : '',
    firstActual: document.querySelector('.case-row.fail .cr-cols div:last-child pre')
      ? document.querySelector('.case-row.fail .cr-cols div:last-child pre').textContent : ''
  }));

  console.log('状态:', r.status);
  console.log('失败用例:', r.fail, ' 通过:', r.pass);
  console.log('期望显示:', JSON.stringify(r.firstExpect));
  console.log('实际显示:', JSON.stringify(r.firstActual));

  const ok = r.fail > 0 && r.firstExpect.includes('末尾有换行') && r.firstActual.includes('末尾没有换行');
  console.log(ok ? '\n✅ 正确抓到"少换行"' : '\n❌ 没能区分末尾换行');
  await b.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
