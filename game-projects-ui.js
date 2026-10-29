/* =========================================================
   C 语言闯关 · 游戏开发大作业（网页版）

   特点：
     - 不判分（游戏是交互式的，自动判分没意义）
     - 每个项目给出：需求 / 知识点 / 分步思路 / 易错点 / 成品代码
     - 成品代码可以滚动查看，也可以"复制到编辑器"再跑
   ========================================================= */
(function () {
  'use strict';

  const GP = globalThis.GP || [];
  const $ = (s) => document.querySelector(s);

  function bridge() { return globalThis.__CQuest || {}; }
  function esc(s) {
    const b = bridge();
    return b.esc ? b.esc(s) : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function showScreen(name) {
    const b = bridge();
    if (b.showScreen) return b.showScreen(name);
    document.querySelectorAll('.screen').forEach((n) => {
      n.classList.toggle('is-active', n.id === 'screen-' + name);
    });
  }

  /* 当前打开的项目 */
  let cur = null;

  /* ---------------- 项目列表 ---------------- */
  function renderList() {
    const box = document.getElementById('proj-list');
    if (!box) return;

    let html = '<div class="proj-intro">' +
      '<b>这 5 个游戏都不判分。</b>' +
      '<span>游戏是交互式的，没法自动判对错——写出来能玩，就是写对了。' +
      '每个项目下面都有可运行的成品代码，卡住了可以去对照。</span>' +
      '</div>';

    html += '<div class="proj-cards">';
    GP.forEach((p) => {
      html +=
        '<button class="proj-card" data-id="' + p.id + '">' +
          '<div class="pc-top">' +
            '<span class="pc-lv">' + '●'.repeat(p.level) + '</span>' +
            '<span class="pc-time">' + esc(p.time) + '</span>' +
          '</div>' +
          '<div class="pc-title">' + esc(p.title) + '</div>' +
          '<div class="pc-sum">' + esc(p.summary) + '</div>' +
          '<div class="pc-kn">' + p.knowledge.length + ' 个知识点</div>' +
        '</button>';
    });
    html += '</div>';

    box.innerHTML = html;

    box.querySelectorAll('.proj-card').forEach((c) => {
      c.addEventListener('click', () => {
        const p = GP.find((x) => x.id === c.dataset.id);
        if (p) openProject(p);
      });
    });
  }

  /* ---------------- 项目详情 ---------------- */
  function openProject(p) {
    cur = p;

    document.getElementById('proj-title').textContent = p.title;
    document.getElementById('proj-sub').textContent =
      '难度 ' + '●'.repeat(p.level) + ' · 预计 ' + p.time;

    /* 需求 */
    document.getElementById('proj-req').innerHTML =
      p.requirements.map((r, i) => '<li>' + esc(r) + '</li>').join('');

    /* 知识点：每个都标注它来自哪一课 */
    document.getElementById('proj-kn').innerHTML = p.knowledge.map((k) =>
      '<div class="kn-item">' +
        '<span class="kn-name">' + esc(k.name) + '</span>' +
        '<span class="kn-from">' + esc(k.from) + '</span>' +
      '</div>'
    ).join('');

    /* 分步思路 */
    document.getElementById('proj-steps').innerHTML = p.steps.map((s, i) =>
      '<div class="step-item"><span class="step-n">' + (i + 1) + '</span>' + esc(s) + '</div>'
    ).join('');

    /* 易错点 */
    document.getElementById('proj-pit').innerHTML =
      p.pitfalls.map((x) => '<li>' + esc(x) + '</li>').join('');

    /* 成品代码：从内联数据取（file:// 下 fetch 读不到本地文件） */
    const codeBox = document.getElementById('proj-code');
    const src = loadSource(p.file);
    if (!src) {
      codeBox.textContent = '（读不到源码 ' + p.file + '）\n\n' +
        '应该是 games-src.js 没加载，检查 index.html 里的 script 标签。';
    } else {
      codeBox.textContent = src;
      document.getElementById('proj-codemet').textContent =
        p.file + '  ·  ' + src.split('\n').length + ' 行';
    }

    /* 关键代码讲解 */
    document.getElementById('proj-keys').innerHTML = (p.keyPoints || []).map((k) =>
      '<div class="key-item">' +
        '<code class="key-line">' + esc(k.line) + '</code>' +
        '<span class="key-note">' + esc(k.note) + '</span>' +
      '</div>'
    ).join('');

    showScreen('project');
    window.scrollTo(0, 0);
  }

  /* 读源码：优先走服务，退回到 fetch（file:// 会失败） */
  /* 源码内联在 games-src.js 里（file:// 下 fetch 读不到本地文件） */
  function loadSource(file) {
    const all = globalThis.GAME_SOURCES || {};
    return all[file] || null;
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    const btn = document.getElementById('btn-projects');
    if (btn) {
      btn.addEventListener('click', () => {
        renderList();
        showScreen('projects');
      });
    }

    const back = document.getElementById('btn-proj-back');
    if (back) {
      back.addEventListener('click', () => {
        renderList();
        showScreen('projects');
      });
    }

    /* 复制代码 */
    const copy = document.getElementById('btn-copy-code');
    if (copy) {
      copy.addEventListener('click', async () => {
        const code = document.getElementById('proj-code').textContent;
        try {
          await navigator.clipboard.writeText(code);
          copy.textContent = '已复制 ✓';
          setTimeout(() => { copy.textContent = '复制代码'; }, 1500);
        } catch (_) {
          copy.textContent = '复制失败';
          setTimeout(() => { copy.textContent = '复制代码'; }, 1500);
        }
      });
    }
  }

  globalThis.__Projects = {
    open: () => { renderList(); showScreen('projects'); },
    list: () => GP
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
