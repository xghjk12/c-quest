/* =========================================================
   C 语言闯关 · 实操题（网页版）

   依赖：
     - hands-on.js  提供 globalThis.HQ 题库
     - server.js    提供 http://127.0.0.1:7788 的编译服务

   设计要点：
     - 服务没开时，能"看题、写代码、存草稿"，只是运行/判分会提示去启动服务
     - 草稿存 localStorage，刷新不丢
     - 判分是拿每题所有用例逐个跑，全对才算过
   ========================================================= */
(function () {
  'use strict';

  const HQ = globalThis.HQ || [];
  /* 编译器跑在浏览器里（见 wasm-compiler.js），不需要任何后端 */
  const DRAFT_KEY = 'cquest_drafts_v1';
  const DONE_KEY = 'cquest_hands_done_v1';

  const $ = (s) => document.querySelector(s);

  /* 等 app.js 把工具函数挂上来 */
  function bridge() {
    return globalThis.__CQuest || {};
  }
  function esc(s) {
    const b = bridge();
    if (b.esc) return b.esc(s);
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function rich(s) {
    const b = bridge();
    if (b.richText) return b.richText(s);
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function showScreen(name) {
    const b = bridge();
    if (b.showScreen) return b.showScreen(name);
    document.querySelectorAll('.screen').forEach((n) => {
      n.classList.toggle('is-active', n.id === 'screen-' + name);
    });
  }
  function toast(msg) {
    const b = bridge();
    if (b.toast) return b.toast(msg);
  }

  /* ---------------- 本地存储 ---------------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  let drafts = loadJSON(DRAFT_KEY, {});   // id -> 代码
  let done = loadJSON(DONE_KEY, {});      // id -> true

  /* ---------------- 编译器状态 ---------------- */
  const CC = () => globalThis.CCompiler || null;

  let compState = 'idle';   // idle | loading | ready | unavailable

  function setBadge(text, color, border) {
    const badge = document.getElementById('hands-server');
    if (!badge) return;
    badge.textContent = text;
    badge.style.color = color || '';
    badge.style.borderColor = border || '';
  }

  /* 编译器能不能用（file:// 下读不到 wasm 资源） */
  function compilerUsable() {
    const c = CC();
    if (!c) return false;
    return c.available();
  }

  /*
    预热：用户一进实操列表就开始下载编译器，
    别等点了「运行」才傻等 28MB。
  */
  async function warmupCompiler() {
    const c = CC();
    if (!c) {
      compState = 'unavailable';
      setBadge('🔴 编译器未加载', 'var(--red)', 'rgba(255,93,108,.4)');
      return false;
    }
    if (!c.available()) {
      compState = 'unavailable';
      setBadge('⚠ 需要本地服务', 'var(--amber)', 'rgba(255,201,77,.4)');
      return false;
    }
    if (compState === 'ready') {
      setBadge('🟢 编译器就绪', 'var(--green)', 'rgba(62,224,138,.4)');
      return true;
    }

    compState = 'loading';
    setBadge('⏳ 正在加载编译器…', 'var(--amber)', 'rgba(255,201,77,.4)');

    const ok = await c.warmup();
    if (ok) {
      compState = 'ready';
      setBadge('🟢 编译器就绪', 'var(--green)', 'rgba(62,224,138,.4)');
    } else {
      compState = 'unavailable';
      setBadge('🔴 编译器加载失败', 'var(--red)', 'rgba(255,93,108,.4)');
    }
    return ok;
  }

  /* ---------------- 调编译器 ---------------- */
  async function runRemote(code, stdin) {
    const c = CC();
    if (!c) return { ok: false, error: '编译器未加载' };
    return c.run(code, stdin || '');
  }

  /*
    判断"这次运行是不是编译失败了"。
    两种编译器的返回格式不一样，统一在这里处理：
      - 老的 TCC 服务：ok=false 且 stage='compile'
      - 浏览器内的 wasm：ok=true，但 errors 非空
  */
  function isCompileError(r) {
    if (!r) return false;
    if (r.stage === 'compile' && !r.ok) return true;
    if (Array.isArray(r.errors) && r.errors.length > 0) return true;
    return false;
  }

  /* 取出编译错误文本 */
  function compileErrorText(r) {
    if (!r) return '';
    if (Array.isArray(r.errors) && r.errors.length) return r.errors.join('\n');
    return r.detail || r.error || '';
  }

  /* 只把 CRLF 归一成 LF，不再吃掉尾部空白。
     题目里明确要求了"行尾换行"，少一个换行就该判错——
     不然"printf 忘写 \n"这种经典错误会被放过。 */
  const norm = (s) => String(s || '').replace(/\r\n/g, '\n');

  /* 把输入/输出文本里的转义符变成可读形式：
     真实换行 → "⏎"，行尾说明；这样学生一眼看出是几行 */
  function readable(s) {
    return String(s == null ? '' : s)
      .replace(/\r\n/g, '\n')
      .replace(/\n$/, '')          // 去掉结尾那个换行，别显示成"你少打了一个换行"
      .replace(/\n/g, ' <E> ')     // 用 ASCII 写法，任何字体都不会缺字符
      .replace(/ /g, ' ');
  }

  /* ---------------- 当前题目 ---------------- */
  let cur = null;   // 当前题目对象

  function draftOf(q) {
    return drafts[q.id] !== undefined ? drafts[q.id] : q.starter;
  }
  function setDraft(q, code) {
    drafts[q.id] = code;
    saveJSON(DRAFT_KEY, drafts);
  }

  /* ---------------- 列表页 ---------------- */
  function renderList() {
    const box = document.getElementById('hands-list');
    if (!box) return;

    const finished = HQ.filter((q) => done[q.id]).length;
    const prog = document.getElementById('hands-progress');
    if (prog) prog.textContent = finished + ' / ' + HQ.length + ' 完成';

    // 编译器提示（只在用不了的时候显示）
    let banner = '';
    const _c = CC();
    if (!_c || !_c.available()) {
      banner = '<div class="server-banner">' +
        '<b>⚠ 当前打开方式用不了编译器</b>' +
        '<span>你是双击 <code>index.html</code>（file:// 协议）打开的，浏览器安全限制读不到 wasm 资源。</span>' +
        '<span class="banner-cmd">双击 <code>开始游戏.bat</code>，选「打开游戏（带编译器）」即可。</span>' +
        '</div>';
    }

    // 按章节分组
    const groups = new Map();
    HQ.forEach((q) => {
      if (!groups.has(q.ch)) groups.set(q.ch, []);
      groups.get(q.ch).push(q);
    });

    let html = banner;
    for (const [ch, list] of groups) {
      html += '<div class="hands-group"><h3 class="hands-group-h">' + esc(ch) + '</h3><div class="hands-cards">';
      for (const q of list) {
        const isDone = !!done[q.id];
        const hasDraft = drafts[q.id] !== undefined && drafts[q.id] !== q.starter;
        html +=
          '<button class="hand-card' + (isDone ? ' done' : '') + '" data-id="' + q.id + '">' +
            '<div class="hc-top">' +
              '<span class="hc-level">' + '★'.repeat(q.level) + '</span>' +
              (isDone ? '<span class="hc-ok">✓ 已通过</span>' : (hasDraft ? '<span class="hc-draft">有草稿</span>' : '')) +
            '</div>' +
            '<div class="hc-title">' + esc(q.title) + '</div>' +
            '<div class="hc-task">' + esc(q.task).slice(0, 46) + '</div>' +
          '</button>';
      }
      html += '</div></div>';
    }
    box.innerHTML = html;

    box.querySelectorAll('.hand-card').forEach((c) => {
      c.addEventListener('click', () => {
        const q = HQ.find((x) => x.id === c.dataset.id);
        if (q) openTask(q);
      });
    });
  }

  /* ---------------- 题目页 ---------------- */
  function openTask(q) {
    cur = q;
    document.getElementById('code-title').textContent = q.title;
    document.getElementById('code-sub').textContent = q.ch + ' · 难度 ' + '★'.repeat(q.level);
    document.getElementById('code-task').textContent = q.task;

    const detail = document.getElementById('code-detail');
    if (q.detail) {
      detail.textContent = q.detail;
      detail.parentElement.style.display = '';
    } else {
      detail.parentElement.style.display = 'none';
    }
    // 测试用例（只显示输入，跑完才显示期望）
    const casesBox = document.getElementById('code-cases');
    casesBox.innerHTML = q.cases.map((c, i) =>
      '<div class="case-item" data-i="' + i + '">' +
        '<span class="case-n">用例 ' + (i + 1) + '</span>' +
        '<code class="case-in" title="' + esc(readable(c.in)) + '">' + esc(readable(c.in)) + '</code>' +
        '<span class="case-mark"></span>' +
      '</div>'
    ).join('');

    // 提示：一次只显示一条
    renderHints(q, 0);

    // 状态
    const st = document.getElementById('code-status');
    st.textContent = done[q.id] ? '✓ 已通过' : '未运行';
    st.style.color = done[q.id] ? 'var(--green)' : '';

    // 编辑器内容
    const ed = document.getElementById('editor');
    ed.value = draftOf(q);
    updateLineNums();
    updateTerm('点「运行」看结果。', '');

    document.getElementById('case-results').innerHTML = '';
    showScreen('code');
    ed.focus();
    ed.setSelectionRange(0, 0);
  }

  let hintCount = 0;
  function renderHints(q, count) {
    const box = document.getElementById('code-hints');
    const hints = q.hints || [];
    hintCount = Math.min(count, hints.length);
    if (hintCount === 0) {
      box.innerHTML = '<p class="hint-empty">先自己试试，卡住了再要提示。</p>';
    } else {
      box.innerHTML = hints.slice(0, hintCount).map((h, i) =>
        '<div class="hint-item"><span class="hint-n">' + (i + 1) + '</span>' + esc(h) + '</div>'
      ).join('');
    }
    const btn = document.getElementById('btn-show-hint');
    if (hintCount >= hints.length) {
      btn.textContent = '没有更多提示了';
      btn.disabled = true;
    } else {
      btn.textContent = '再给一点提示';
      btn.disabled = false;
    }
  }

  /* ---------------- 编辑器：行号 + Tab ---------------- */
  function updateLineNums() {
    const ed = document.getElementById('editor');
    const nums = document.getElementById('line-nums');
    const n = ed.value.split('\n').length;
    if (nums.dataset.n === String(n)) {
      syncScroll();
      return;
    }
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    nums.textContent = s;
    nums.dataset.n = String(n);
    syncScroll();
  }
  function syncScroll() {
    const ed = document.getElementById('editor');
    const nums = document.getElementById('line-nums');
    nums.scrollTop = ed.scrollTop;
  }

  /* ---------------- 终端输出 ---------------- */
  function updateTerm(text, status, cls) {
    const body = document.getElementById('term-body');
    const st = document.getElementById('term-status');
    body.textContent = text;
    body.className = 'term-body' + (cls ? ' ' + cls : '');
    st.textContent = status || '';
  }

  /* ---------------- 运行 ---------------- */
  async function doRun() {
    if (!cur) return;
    const ed = document.getElementById('editor');
    const code = ed.value;
    setDraft(cur, code);

    const st = document.getElementById('code-status');
    if (compState !== 'ready') {
      const ok = await warmupCompiler();
      if (!ok) {
        const usable = CC() && CC().available();
        const hint = usable
          ? '编译器加载失败了。试试刷新页面，或者确认 clang/ 目录存在。'
          : '你是用 file:// 双击打开的，浏览器安全限制不让读 wasm 资源。' + "\n\n" +
            '解决办法：' + "\n" +
            '  双击 开始游戏.bat，选「打开游戏（带编译器）」' + "\n" +
            '  它会起一个本地小服务并自动打开正确地址。';
        updateTerm(
          '现在跑不了，因为编译器没能加载。' + "\n\n" + hint + "\n\n" +
          '你的代码已经存成草稿了，不会丢。',
          '编译器未就绪', 'warn'
        );
        st.textContent = '编译器未就绪';
        return;
      }
    }

    st.textContent = '运行中…';
    updateTerm('编译中…', '编译中', 'busy');

    // 用第一个用例当输入
    const first = cur.cases[0] || { in: '' };
    let r;
    try {
      r = await runRemote(code, first.in);
    } catch (e) {
      updateTerm('请求失败：' + e.message + '\n\n服务是不是关掉了？', '请求失败', 'err');
      st.textContent = '请求失败';
      return;
    }

    if (isCompileError(r)) {
      updateTerm('编译没通过：\n\n' + compileErrorText(r), '编译失败', 'err');
      st.textContent = '编译失败';
      st.style.color = 'var(--red)';
      return;
    }
    if (r.error) {
      updateTerm('出错了：' + r.error, '出错', 'err');
      st.textContent = '出错';
      return;
    }

    if (r.timedOut) {
      updateTerm(
        '程序跑了超过 10 秒还没结束，被强制停掉了。\n\n' +
        '常见原因：循环条件永远为真（死循环），或者 scanf 一直在等输入。',
        '超时', 'err'
      );
      st.textContent = '超时';
      st.style.color = 'var(--red)';
      return;
    }

    let out = '';
    out += '【输入】' + readable(first.in) + '\n';
    out += '【输出】\n' + (r.stdout || '(没有任何输出)');
    if (r.stderr) out += '\n\n【错误输出】\n' + r.stderr;
    if (r.exitCode !== 0 && r.exitCode != null) out += '\n\n【退出码】' + r.exitCode;
    updateTerm(out, '运行完成', 'ok');
    st.textContent = '运行完成';
    st.style.color = '';
  }

  /* ---------------- 提交判分 ---------------- */
  async function doSubmit() {
    if (!cur) return;
    const ed = document.getElementById('editor');
    const code = ed.value;
    setDraft(cur, code);

    const st = document.getElementById('code-status');
    const resBox = document.getElementById('case-results');

    if (compState !== 'ready') {
      const ok = await warmupCompiler();
      if (!ok) {
        updateTerm(
          '提交判分也需要编译器。\n\n' +
          (CC() && CC().available()
            ? '编译器加载失败了，试试刷新页面。'
            : '你是用 file:// 打开的，浏览器不让读 wasm 资源。\n' +
              '双击 开始游戏.bat，选「打开游戏（带编译器）」。'),
          '编译器未就绪', 'warn'
        );
        return;
      }
    }

    st.textContent = '判分中…';
    st.style.color = '';
    resBox.innerHTML = '';
    updateTerm('正在逐个跑测试用例…', '判分中', 'busy');

    const results = [];
    for (let i = 0; i < cur.cases.length; i++) {
      const c = cur.cases[i];
      let r;
      try {
        r = await runRemote(code, c.in);
      } catch (e) {
        updateTerm('请求失败：' + e.message, '请求失败', 'err');
        return;
      }

      if (isCompileError(r)) {
        updateTerm('编译没通过：\n\n' + compileErrorText(r), '编译失败', 'err');
        st.textContent = '编译失败';
        st.style.color = 'var(--red)';
        renderCaseResults([], r);
        return;
      }

      const want = norm(c.expect);
      const got = norm(r.stdout);
      let pass = want === got;
      let reason = '';

      if (r.timedOut) { pass = false; reason = '超时'; }
      else if (!pass) { reason = '输出不一致'; }

      // 违规词检查（比如那道"不许用临时变量"的题）
      if (pass && cur.forbidden) {
        for (const w of cur.forbidden) {
          if (code.includes(w)) {
            pass = false;
            reason = '用了不许用的东西：' + w;
            break;
          }
        }
      }

      // rawWant / rawGot 保留原始输出（含尾部换行），只用于显示对比
      results.push({ i, pass, want, got, in: c.in, reason, rawWant: c.expect, rawGot: r.stdout });
      // 逐条更新用例标记
      const item = resBox.querySelector('[data-i="' + i + '"]');
      if (item) {
        item.className = 'case-item ' + (pass ? 'pass' : 'fail');
        item.querySelector('.case-mark').textContent = pass ? '✓' : '✗';
      }
    }

    const passedCount = results.filter((r) => r.pass).length;
    const allPass = passedCount === results.length;

    renderCaseResults(results, null);

    // 把结果滚进视野，否则用户看不到对比
    const firstFail = resBox.querySelector('.case-row.fail') || resBox.querySelector('.case-head');
    if (firstFail) {
      firstFail.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (allPass) {
      done[cur.id] = true;
      saveJSON(DONE_KEY, done);
      updateTerm(
        '全部 ' + results.length + ' 个用例通过！ ✓\n\n' +
        '这道题拿下了。可以回列表挑下一道。',
        '通过', 'ok'
      );
      st.textContent = '✓ 已通过';
      st.style.color = 'var(--green)';
      if (bridge().celebrate) bridge().celebrate();
      if (bridge().Sound && bridge().Sound.ok) bridge().Sound.ok();

      // 列表页进度也要更新
      const finished = HQ.filter((q) => done[q.id]).length;
      const prog = document.getElementById('hands-progress');
      if (prog) prog.textContent = finished + ' / ' + HQ.length + ' 完成';
    } else {
      updateTerm(
        '通过 ' + passedCount + ' / ' + results.length + ' 个用例。\n\n' +
        '看下面每个用例的「期望」和「实际」差在哪，注意空格、换行、小数点位数。',
        '未通过', 'err'
      );
      st.textContent = '未通过';
      st.style.color = 'var(--red)';
      if (bridge().Sound && bridge().Sound.bad) bridge().Sound.bad();
    }
  }

  /* 渲染每个用例的详细对比 */
  function renderCaseResults(results, compileErr) {
    const box = document.getElementById('case-results');
    if (compileErr) {
      box.innerHTML = '<div class="case-head">编译没通过，用例没跑。</div>';
      return;
    }

    const showIn = (s) => readable(s);
    let html = '';
    const passN = results.filter((r) => r.pass).length;
    html += '<div class="case-head ' + (passN === results.length ? 'allpass' : '') + '">' +
      (passN === results.length ? '✓ 全部通过' : '通过 ' + passN + ' / ' + results.length) +
      '</div>';

    for (const r of results) {
      if (r.pass) {
        html += '<div class="case-row pass">' +
          '<div class="cr-head">✓ 用例 ' + (r.i + 1) + '</div>' +
          '<div class="cr-in">输入：' + esc(showIn(r.in)) + '</div>' +
          '<div class="cr-ok">输出正确</div>' +
        '</div>';
      } else {
        // 逐字符标出差异会更友好，但先给并排对比 + 可视化空白
        html += '<div class="case-row fail">' +
          '<div class="cr-head">✗ 用例 ' + (r.i + 1) + (r.reason ? ' — ' + esc(r.reason) : '') + '</div>' +
          '<div class="cr-in">输入：' + esc(showIn(r.in)) + '</div>' +
          '<div class="cr-cols">' +
            '<div><span class="cr-label">期望</span><pre>' + esc(visualize(r.rawWant)) + '</pre></div>' +
            '<div><span class="cr-label">实际</span><pre>' + esc(visualize(r.rawGot)) + '</pre></div>' +
          '</div>' +
        '</div>';
      }
    }
    box.innerHTML = html;
  }

  /* 把空格和换行显示成可见符号，方便发现"多一个空格""少一个换行"这类问题。
     全部用 ASCII 写法，不依赖字体里有没有特殊符号。
     末尾换行单独标出来 —— 这是初学者最常踩的坑之一。 */
  function visualize(s) {
    let t = String(s == null ? '' : s).replace(/\r\n/g, '\n');
    let tailNote = '';
    if (/\n$/.test(t)) {
      tailNote = '（末尾有换行）';
      t = t.replace(/\n$/, '');
    } else {
      tailNote = '（末尾没有换行）';
    }
    t = t
      .replace(/ /g, '_')       /* space */
      .replace(/\t/g, '>')      /* tab */
      .replace(/\n/g, '<E>');   /* newline */
    return t + '\n' + tailNote;
  }

  /* ---------------- 看参考解答 ---------------- */
  function revealSolution() {
    if (!cur) return;
    const ed = document.getElementById('editor');
    const curCode = ed.value;
    if (curCode.trim() !== cur.starter.trim() && curCode.trim() !== cur.solution.trim()) {
      if (!confirm('你改过的代码会被参考解答覆盖，确定吗？\n（可以先点「重置代码」再自己粘贴回来）')) {
        return;
      }
    }
    ed.value = cur.solution;
    updateLineNums();
    setDraft(cur, cur.solution);
    toast('已填入参考解答，看懂了建议自己重写一遍');
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    const btnHands = document.getElementById('btn-hands-on');
    if (btnHands) {
      btnHands.addEventListener('click', async () => {
        showScreen('hands');
        renderList();
        await warmupCompiler();
        renderList();
      });
    }

    const back = document.getElementById('btn-code-back');
    if (back) {
      back.addEventListener('click', () => {
        showScreen('hands');
        renderList();
      });
    }

    const run = document.getElementById('btn-run');
    if (run) run.addEventListener('click', doRun);

    const submit = document.getElementById('btn-submit');
    if (submit) submit.addEventListener('click', doSubmit);

    const reset = document.getElementById('btn-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        if (!cur) return;
        const ed = document.getElementById('editor');
        ed.value = cur.starter;
        setDraft(cur, cur.starter);
        updateLineNums();
        toast('代码已重置成起手版本');
      });
    }

    const hint = document.getElementById('btn-show-hint');
    if (hint) {
      hint.addEventListener('click', () => {
        if (!cur) return;
        renderHints(cur, hintCount + 1);
      });
    }

    const sol = document.getElementById('btn-show-solution');
    if (sol) sol.addEventListener('click', revealSolution);

    const ed = document.getElementById('editor');
    if (ed) {
      ed.addEventListener('input', () => {
        updateLineNums();
        if (cur) setDraft(cur, ed.value);
      });
      ed.addEventListener('scroll', syncScroll);

      // Tab 缩进 4 空格，Ctrl+Enter 运行
      ed.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = ed.selectionStart;
          const en = ed.selectionEnd;
          ed.value = ed.value.slice(0, s) + '    ' + ed.value.slice(en);
          ed.selectionStart = ed.selectionEnd = s + 4;
          updateLineNums();
          if (cur) setDraft(cur, ed.value);
          return;
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          doRun();
        }
      });
    }
  }

  /* ---------------- 对外接口 ---------------- */
  globalThis.__HandsOn = {
    open: () => {
      showScreen('hands');
      renderList();
      warmupCompiler().then(renderList);
    },
    list: () => HQ,
    isDone: (id) => !!done[id]
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
