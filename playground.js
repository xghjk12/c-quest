/* =========================================================
   自由写代码（Playground）

   复用实操题的编辑器页面，但：
     - 不加载任何题目
     - 隐藏左侧的任务/用例/提示
     - 编辑器变全宽
     - 提供 stdin 输入框（自由程序可能要读输入）
     - 草稿独立保存，不和题目草稿混

   这样不用新建页面，改一个模式开关就行。
   ========================================================= */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const DRAFT_KEY = 'cquest_playground_v1';

  const DEFAULT_CODE = [
    '#include <stdio.h>',
    '',
    'int main(void) {',
    '    printf("Hello, C!\\n");',
    '    return 0;',
    '}',
    ''
  ].join('\n');

  /* 状态 */
  let isFreeMode = false;
  let editorReady = false;

  function bridge() { return globalThis.__CQuest || {}; }
  function showScreen(name) {
    const b = bridge();
    if (b.showScreen) return b.showScreen(name);
    document.querySelectorAll('.screen').forEach((n) => {
      n.classList.toggle('is-active', n.id === 'screen-' + name);
    });
  }

  function loadDraft() {
    try {
      return localStorage.getItem(DRAFT_KEY) || DEFAULT_CODE;
    } catch (_) {
      return DEFAULT_CODE;
    }
  }
  function saveDraft(code) {
    try { localStorage.setItem(DRAFT_KEY, code); } catch (_) {}
  }

  /* ---------------- 行号 ---------------- */
  function updateLineNums() {
    const ed = $('#editor');
    const nums = $('#line-nums');
    if (!ed || !nums) return;
    const n = ed.value.split('\n').length;
    if (nums.dataset.freeN === String(n)) {
      nums.scrollTop = ed.scrollTop;
      return;
    }
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    nums.textContent = s;
    nums.dataset.freeN = String(n);
    nums.scrollTop = ed.scrollTop;
  }

  /* ---------------- 终端输出 ---------------- */
  function setTerm(text, status, cls) {
    const body = $('#term-body');
    const st = $('#term-status');
    if (body) {
      body.textContent = text;
      body.className = 'term-body' + (cls ? ' ' + cls : '');
    }
    if (st) st.textContent = status || '';
  }

  function setStatus(text, color) {
    const el = $('#code-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '';
  }

  /* ---------------- 进入自由模式 ---------------- */
  function open() {
    isFreeMode = true;

    /* 标题区 */
    $('#code-title').textContent = '自由写代码';
    $('#code-sub').textContent = '想写什么写什么 · Ctrl+Enter 运行';
    setStatus('未运行', '');

    /* 隐藏左侧题目区，编辑器全宽 */
    const side = document.querySelector('.code-side');
    if (side) side.style.display = 'none';

    const layout = document.querySelector('.code-layout');
    if (layout) layout.style.gridTemplateColumns = '1fr';

    /* 隐藏"提交判分"和"重置代码"，换成清空 */
    const submit = $('#btn-submit');
    if (submit) submit.style.display = 'none';
    const reset = $('#btn-reset');
    if (reset) reset.style.display = 'none';

    /* 确保有 stdin 输入框 */
    ensureStdinBox();

    /* 填入草稿 */
    const ed = $('#editor');
    if (ed) {
      ed.value = loadDraft();
      updateLineNums();
      setTimeout(() => ed.focus(), 100);
    }

    setTerm('写点代码，然后按 Ctrl+Enter 或点「运行」。\n\n' +
      '这个窗口不判分，纯粹用来试东西。\n' +
      '如果要读输入，在下面的「标准输入」框里填。', '');

    /* 绑定一次即可 */
    if (!editorReady) bindEditor();
    showScreen('code');
  }

  /* ---------------- 退出自由模式 ---------------- */
  function close() {
    isFreeMode = false;

    const side = document.querySelector('.code-side');
    if (side) side.style.display = '';

    const layout = document.querySelector('.code-layout');
    if (layout) layout.style.gridTemplateColumns = '';

    const submit = $('#btn-submit');
    if (submit) submit.style.display = '';
    const reset = $('#btn-reset');
    if (reset) reset.style.display = '';

    const stdinBox = $('#playground-stdin');
    if (stdinBox) stdinBox.parentElement.style.display = 'none';
  }

  /* ---------------- 标准输入框 ---------------- */
  function ensureStdinBox() {
    let wrap = document.getElementById('playground-stdin-wrap');
    if (wrap) {
      wrap.style.display = '';
      return;
    }

    /* 插在运行栏后面 */
    const runBar = document.querySelector('.run-bar');
    if (!runBar) return;

    wrap = document.createElement('div');
    wrap.id = 'playground-stdin-wrap';
    wrap.className = 'playground-stdin';
    wrap.innerHTML =
      '<div class="ps-head">' +
        '<span>标准输入（程序里的 scanf 会读这里）</span>' +
        '<button class="btn btn-ghost btn-sm" id="btn-clear-code">清空代码</button>' +
      '</div>' +
      '<textarea id="playground-stdin" spellcheck="false" ' +
        'placeholder="留空表示没有输入。多行输入直接换行，例如：&#10;3 5"></textarea>';

    runBar.parentNode.insertBefore(wrap, runBar.nextSibling);

    document.getElementById('btn-clear-code').addEventListener('click', () => {
      const ed = $('#editor');
      if (ed) {
        ed.value = DEFAULT_CODE;
        updateLineNums();
        saveDraft(ed.value);
        setTerm('已清空，回到默认示例。', '');
        ed.focus();
      }
    });
  }

  /* ---------------- 运行 ---------------- */
  async function run() {
    const ed = $('#editor');
    const code = ed ? ed.value : '';
    if (!code.trim()) {
      setTerm('代码是空的。', '空', 'err');
      return;
    }

    saveDraft(code);

    const stdinEl = document.getElementById('playground-stdin');
    const stdin = stdinEl ? stdinEl.value : '';

    const CC = globalThis.CCompiler;
    if (!CC) {
      setTerm('编译器没加载。', '未就绪', 'err');
      return;
    }

    /* file:// 打开时无法用 */
    if (!CC.available()) {
      setTerm(
        '现在跑不了：你是用 file:// 双击打开的，浏览器安全限制不让读 wasm 资源。\n\n' +
        '解决办法：\n' +
        '  双击 开始游戏.bat，选「打开游戏（含在线编译器）」\n' +
        '  或者命令行执行 node server.js，然后打开 http://127.0.0.1:7788',
        '需要本地服务', 'warn'
      );
      setStatus('需要本地服务', 'var(--amber)');
      return;
    }

    setStatus('运行中…', '');
    setTerm('编译中…', '编译中', 'busy');

    let r;
    try {
      r = await CC.run(code, stdin);
    } catch (e) {
      setTerm('运行出错：' + e.message, '出错', 'err');
      setStatus('出错', 'var(--red)');
      return;
    }

    /* 编译失败 */
    if (Array.isArray(r.errors) && r.errors.length > 0) {
      setTerm('编译没通过：\n\n' + r.errors.join('\n'), '编译失败', 'err');
      setStatus('编译失败', 'var(--red)');
      return;
    }

    /* 超时 */
    if (r.timedOut) {
      setTerm(
        '程序跑了超过 8 秒还没结束，被强制停掉了。\n\n' +
        '常见原因：\n' +
        '  - 循环条件永远为真（死循环）\n' +
        '  - scanf 在等输入，但「标准输入」框里没填东西\n' +
        '  - 递归没有终止条件',
        '超时', 'err'
      );
      setStatus('超时', 'var(--red)');
      return;
    }

    /* 正常输出 */
    let out = '';
    if (stdin) out += '【输入】' + JSON.stringify(stdin).slice(1, -1) + '\n\n';
    out += r.stdout || '(没有任何输出)';
    if (r.stderr) out += '\n\n【stderr】\n' + r.stderr;
    if (r.exitCode !== 0 && r.exitCode != null) out += '\n\n【退出码】' + r.exitCode;

    setTerm(out, '运行完成', 'ok');
    setStatus('运行完成', 'var(--green)');
  }

  /* ---------------- 绑定编辑器 ---------------- */
  function bindEditor() {
    const ed = $('#editor');
    if (!ed) return;
    editorReady = true;

    ed.addEventListener('input', () => {
      if (!isFreeMode) return;
      updateLineNums();
      saveDraft(ed.value);
    });
    ed.addEventListener('scroll', () => {
      const nums = $('#line-nums');
      if (nums) nums.scrollTop = ed.scrollTop;
    });
  }

  /* ---------------- 拦截运行按钮 ---------------- */
  /* 自由模式下，运行按钮走自己的逻辑 */
  function patchRunButton() {
    const btn = $('#btn-run');
    if (!btn) return;
    /* 用捕获阶段，抢在原有 handler 之前 */
    btn.addEventListener('click', (e) => {
      if (!isFreeMode) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      run();
    }, true);
  }

  /* Ctrl+Enter */
  document.addEventListener('keydown', (e) => {
    if (!isFreeMode) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      run();
    }
  }, true);

  /* ---------------- 入口 ---------------- */
  function bind() {
    const btn = $('#btn-playground');
    if (btn) btn.addEventListener('click', open);

    /* 返回时退出自由模式（复用返回按钮） */
    const back = $('#btn-code-back');
    if (back) {
      back.addEventListener('click', () => {
        if (isFreeMode) close();
      }, true);
    }

    patchRunButton();

    /* 暴露给调试 */
    globalThis.__Playground = { open, close, run, isFreeMode: () => isFreeMode };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
