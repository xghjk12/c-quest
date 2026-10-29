/* 直接单测网页版的 highlight()：把一行 C 代码渲染出来，检查生成的 HTML 结构是否会把
   字符串/转义字符拆坏。这个是纯函数级测试，不需要玩到那道题。 */
const puppeteer = require('C:/Users/Admin（无密码）/AppData/Local/Temp/pptr/node_modules/puppeteer-core');

const CASES = [
  '    printf("%.2f\\n", 7 / 2.0);',
  '    printf("%d\\n", x);',
  '    char c = \'A\' + 1;',
  '    char *s = "hello";',
  '    /* 注释里的 "引号" */',
  '    int a = 0x1F;',
  '    if (a >= 10 && b <= 3) {',
  '#include <stdio.h>'
];

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const p = await b.newPage();
  await p.goto('file:///D:/c语言/index.html', { waitUntil: 'networkidle0' });

  // 通过把代码塞进一个题目再渲染，来间接调用 highlight（它是闭包内私有函数）
  const results = await p.evaluate((cases) => {
    const out = [];
    for (const code of cases) {
      // 构造一个临时题：直接操作 DOM 渲染管线不可达，改为复制页面的 highlight 逻辑不可靠，
      // 所以这里用"渲染一段只有这一行的代码"的方式：手动调用 window 上暴露的调试接口或
      // 退而求其次——检查 span 嵌套是否完整（不会出现 <span 被转义的情况）。
      out.push({ code, note: 'pending' });
    }
    return out;
  }, CASES);

  // 闭包里拿不到 highlight，于是用一个更直接的验证：
  // 在页面里注入一段和 app.js 完全相同的 highlight 吗？不行——会漂移。
  // 正确的做法：让 app.js 把 highlight 暴露到 window.__CQuest 上（调试用）。
  const exposed = await p.evaluate(() => typeof window.__CQuest.highlight);
  console.log('window.__CQuest.highlight 类型: ' + exposed);

  if (exposed === 'function') {
    const checked = await p.evaluate((cases) => {
      return cases.map((code) => {
        const html = window.__CQuest.highlight(code);
        // 把 HTML 解回文本，必须和原文完全一致（说明没吞字符、没重复转义）
        const div = document.createElement('div');
        div.innerHTML = html;
        return {
          code,
          roundTripOk: div.textContent === code,
          got: div.textContent,
          html
        };
      });
    }, CASES);

    let bad = 0;
    for (const r of checked) {
      if (!r.roundTripOk) {
        bad++;
        console.log('\n❌ 往返不一致');
        console.log('   原文: ' + JSON.stringify(r.code));
        console.log('   回来: ' + JSON.stringify(r.got));
        console.log('   HTML: ' + r.html);
      }
    }
    console.log('\n测试 ' + checked.length + ' 行，' + (bad === 0 ? '✅ 全部字符无损' : '❌ ' + bad + ' 行有问题'));

    // 额外确认没有未闭合的 span
    const unbalanced = await p.evaluate((cases) => {
      const bad = [];
      for (const code of cases) {
        const html = window.__CQuest.highlight(code);
        const open = (html.match(/<span/g) || []).length;
        const close = (html.match(/<\/span>/g) || []).length;
        if (open !== close) bad.push({ code, open, close });
      }
      return bad;
    }, CASES);
    console.log(unbalanced.length === 0 ? '✅ span 标签全部闭合' : '❌ span 不闭合: ' + JSON.stringify(unbalanced));
    process.exit(bad === 0 && unbalanced.length === 0 ? 0 : 1);
  } else {
    console.log('需要先在 app.js 里把 highlight 挂到 window.__CQuest 才能单测');
    process.exit(2);
  }

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
