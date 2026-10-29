/* 测真实加载耗时 + file:// 降级提示 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const b = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  /* ══════════ 1. 冷启动耗时（http） ══════════ */
  console.log('=== 冷启动（无缓存）===');
  {
    const page = await b.newPage();
    // 禁用缓存，模拟第一次访问
    await page.setCacheEnabled(false);
    await page.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });

    const t0 = Date.now();
    const ms = await page.evaluate(async () => {
      const s = performance.now();
      await globalThis.CCompiler.warmup();
      return Math.round(performance.now() - s);
    });
    console.log(`  编译器加载: ${ms}ms`);

    // 第一次编译（含 wasm 实例化）
    const t1 = await page.evaluate(async () => {
      const s = performance.now();
      const r = await globalThis.CCompiler.run(
        '#include <stdio.h>\nint main(void){printf("hi\\n");return 0;}', '');
      return { ms: Math.round(performance.now() - s), out: r.stdout };
    });
    console.log(`  首次编译+运行: ${t1.ms}ms  (输出 ${JSON.stringify(t1.out)})`);

    // 第二次编译
    const t2 = await page.evaluate(async () => {
      const s = performance.now();
      const r = await globalThis.CCompiler.run(
        '#include <stdio.h>\nint main(void){int a=0;for(int i=0;i<1000;i++)a+=i;printf("%d\\n",a);return 0;}', '');
      return { ms: Math.round(performance.now() - s), out: r.stdout };
    });
    console.log(`  第二次编译: ${t2.ms}ms  (输出 ${JSON.stringify(t2.out)})`);

    // 跑一个完整的 3 用例提交
    const t3 = await page.evaluate(async () => {
      const q = globalThis.HQ.find((x) => x.id === 'h1');
      const s = performance.now();
      let pass = 0;
      for (const c of q.cases) {
        const r = await globalThis.CCompiler.run(q.solution, c.in);
        if (r.stdout.replace(/\r\n/g, '\n') === c.expect.replace(/\r\n/g, '\n')) pass++;
      }
      return { ms: Math.round(performance.now() - s), pass, total: q.cases.length };
    });
    console.log(`  一次完整提交(${t3.total} 用例): ${t3.ms}ms  通过 ${t3.pass}/${t3.total}`);

    await page.close();
  }

  /* ══════════ 2. 热启动（有缓存） ══════════ */
  console.log('\n=== 热启动（浏览器缓存）===');
  {
    const page = await b.newPage();
    await page.goto('http://127.0.0.1:7788/index.html', { waitUntil: 'networkidle0' });
    const ms = await page.evaluate(async () => {
      const s = performance.now();
      await globalThis.CCompiler.warmup();
      return Math.round(performance.now() - s);
    });
    console.log(`  编译器加载: ${ms}ms`);
    await page.close();
  }

  /* ══════════ 3. file:// 降级提示 ══════════ */
  console.log('\n=== file:// 降级 ===');
  {
    const page = await b.newPage();
    const fileUrl = 'file:///' + path.join('D:\\c语言', 'index.html').replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));

    const state = await page.evaluate(() => ({
      usable: globalThis.CCompiler ? globalThis.CCompiler.available() : null,
      isFile: globalThis.CCompiler ? globalThis.CCompiler.isFileProtocol() : null,
      hqLoaded: globalThis.HQ ? globalThis.HQ.length : 0,
      gameSources: globalThis.GAME_SOURCES ? Object.keys(globalThis.GAME_SOURCES).length : 0
    }));
    console.log(`  可用=${state.usable} 是file协议=${state.isFile}`);
    console.log(`  题库加载=${state.hqLoaded} 道，内联源码=${state.gameSources} 个`);

    // 进实操列表看横幅
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-hands-on');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 700));
    const banner = await page.evaluate(() => {
      const el = document.querySelector('.server-banner');
      return el ? el.textContent.slice(0, 100) : null;
    });
    console.log(`  横幅: ${banner ? JSON.stringify(banner) : '(无)'}`);

    // 进游戏大作业看代码能否显示
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-projects');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const card = document.querySelector('.proj-card');
      if (card) card.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const codeOk = await page.evaluate(() => {
      const el = document.querySelector('#proj-code');
      return el ? { len: el.textContent.length, hasInclude: el.textContent.includes('#include') } : null;
    });
    console.log(`  大作业代码: ${codeOk ? codeOk.len + ' 字符, 含#include=' + codeOk.hasInclude : '(无)'}`);

    await page.close();
  }

  await b.close();
  console.log('\n完成');
})().catch((e) => { console.error('崩溃:', e); process.exit(1); });
