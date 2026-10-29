/* =========================================================
   C 语言闯关 · 游戏逻辑
   ========================================================= */
(function () {
  'use strict';

  const CQ = globalThis.CQ || [];
  const STORE_KEY = 'cquest_v1';
  const MAX_HEARTS = 3;
  const PASS_STARS = 1;          // 至少 1 星才算通关
  const PER_Q = 10;              // 每题基础分
  const COMBO_BONUS = 5;         // 连击额外分

  /* ---------------- 存档 ---------------- */
  const defaultSave = () => ({
    stars: {},                 // chapterId -> 0..3
    best: {},                  // chapterId -> 最高分
    wrong: [],                 // [{ch, qi}]
    bestTotal: 0
  });

  let save = loadSave();

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultSave();
      const s = JSON.parse(raw);
      return Object.assign(defaultSave(), s);
    } catch (_) {
      return defaultSave();
    }
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  /* ---------------- 状态 ---------------- */
  const state = {
    chapter: 0,        // 当前章节下标
    qi: 0,             // 当前题在章节内的下标
    hearts: MAX_HEARTS,
    score: 0,
    correct: 0,
    combo: 0,
    maxCombo: 0,
    locked: false,     // 本题是否已作答
    order: []          // 本章题目顺序（洗牌）
  };

  /* ---------------- DOM ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    screens: {
      home: $('#screen-home'),
      map: $('#screen-map'),
      quiz: $('#screen-quiz'),
      result: $('#screen-result'),
      review: $('#screen-review'),
      hands: $('#screen-hands'),
      code: $('#screen-code'),
      projects: $('#screen-projects'),
      project: $('#screen-project')
    },
    statStars: $('#stat-stars'),
    statCleared: $('#stat-cleared'),
    statBest: $('#stat-best'),
    statWrong: $('#stat-wrong'),
    chapterGrid: $('#chapter-grid'),
    mapScore: $('#map-score'),
    qChapterName: $('#q-chapter-name'),
    qProgressText: $('#q-progress-text'),
    hearts: $('#hearts'),
    qScore: $('#q-score'),
    progressFill: $('#progress-fill'),
    qIndex: $('#q-index'),
    qType: $('#q-type'),
    combo: $('#combo'),
    qText: $('#q-text'),
    code: $('#code'),
    codeBadge: $('#code-badge'),
    options: $('#options'),
    feedback: $('#feedback'),
    fbHead: $('#fb-head'),
    fbWhy: $('#fb-why'),
    btnNext: $('#btn-next'),
    reviewList: $('#review-list'),
    toast: $('#toast'),

    // 结算页
    resultStars: $('#result-stars'),
    resultTitle: $('#result-title'),
    resultSub: $('#result-sub'),
    resCorrect: $('#res-correct'),
    resScore: $('#res-score'),
    resCombo: $('#res-combo'),
    resHearts: $('#res-hearts')
  };

  /* ---------------- 工具 ---------------- */
  function showScreen(name) {
    Object.entries(el.screens).forEach(([k, node]) => {
      node.classList.toggle('is-active', k === name);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove('show');
      setTimeout(() => { el.toast.hidden = true; }, 260);
    }, 1900);
  }

  /* ---------------- C 语法高亮 ---------------- */
  // 关键字（不含类型名），类型名单独放在 TY 里显示成青蓝色，代码更好读
  const KW = new Set(('auto break case continue default do else enum extern for goto if inline register restrict ' +
    'return sizeof static struct switch typedef union volatile while _Bool').split(' '));
  const TY = new Set(('int char float double void long short unsigned signed const size_t FILE bool').split(' '));
  const FN = new Set(('printf scanf fprintf fscanf sprintf fopen fclose fgetc fputc fgets fputs strlen strcpy strcat ' +
    'strcmp strcmpi malloc calloc realloc free memcpy memset sizeof puts gets putchar getchar exit abs').split(' '));

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];

      // 行注释
      if (c === '/' && src[i + 1] === '/') {
        let j = src.indexOf('\n', i);
        if (j < 0) j = n;
        out += '<span class="tk-cm">' + esc(src.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // 块注释
      if (c === '/' && src[i + 1] === '*') {
        let j = src.indexOf('*/', i + 2);
        j = j < 0 ? n : j + 2;
        out += '<span class="tk-cm">' + esc(src.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // 预处理指令
      if (c === '#' && (i === 0 || src[i - 1] === '\n')) {
        let j = src.indexOf('\n', i);
        if (j < 0) j = n;
        out += '<span class="tk-pre">' + esc(src.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // 字符串 / 字符字面量
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c) {
          if (src[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, n);
        out += '<span class="tk-str">' + esc(src.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // 数字
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < n && /[0-9a-fA-FxX.]/.test(src[j])) j++;
        out += '<span class="tk-num">' + esc(src.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // 标识符
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        const w = src.slice(i, j);
        const after = src.slice(j).match(/^\s*\(/);
        let cls = '';
        if (KW.has(w)) cls = 'tk-kw';
        else if (TY.has(w)) cls = 'tk-ty';
        else if (FN.has(w) || after) cls = 'tk-fn';
        out += cls ? '<span class="' + cls + '">' + esc(w) + '</span>' : esc(w);
        i = j;
        continue;
      }
      out += esc(c);
      i++;
    }
    return out;
  }

  /* 渲染代码块。hlLine 是原始代码里的 0 起行号（找 Bug 题高亮用）。
     会先裁掉首尾空行，避免代码块上下留大片空白。 */
  function renderCode(code, hlLine) {
    const raw = code.split('\n');
    let start = 0, end = raw.length;
    while (start < end && !raw[start].trim()) start++;
    while (end > start && !raw[end - 1].trim()) end--;

    const lines = raw.slice(start, end);
    const localHl = hlLine == null ? null : hlLine - start;

    el.code.innerHTML = lines.map((ln, idx) => {
      const isHl = localHl != null && idx === localHl;
      return '<span class="ln' + (isHl ? ' hl' : '') + '">' + (highlight(ln) || ' ') + '</span>';
    }).join('');
  }

  /* ---------------- 首页统计 ---------------- */
  function totalStars() {
    return Object.values(save.stars).reduce((a, b) => a + b, 0);
  }
  function clearedCount() {
    return Object.values(save.stars).filter((s) => s >= PASS_STARS).length;
  }
  function isUnlocked(idx) {
    if (idx === 0) return true;
    const prev = CQ[idx - 1];
    return (save.stars[prev.id] || 0) >= PASS_STARS;
  }

  function refreshHome() {
    el.statStars.textContent = totalStars();
    el.statCleared.textContent = clearedCount() + ' / ' + CQ.length;
    el.statBest.textContent = save.bestTotal || 0;
    el.statWrong.textContent = save.wrong.length;
  }

  /* ---------------- 章节地图 ---------------- */
  function renderMap() {
    el.mapScore.textContent = '总分 ' + (save.bestTotal || 0);
    el.chapterGrid.innerHTML = '';

    CQ.forEach((ch, idx) => {
      const unlocked = isUnlocked(idx);
      const stars = save.stars[ch.id] || 0;
      const card = document.createElement('button');
      card.className = 'chapter-card' + (unlocked ? '' : ' locked');
      card.type = 'button';
      card.disabled = !unlocked;

      const starHtml = [1, 2, 3].map((s) =>
        '<span class="' + (s <= stars ? 's-on' : 's-off') + '">★</span>'
      ).join('');

      const status = !unlocked ? '🔒 未解锁'
        : stars >= 3 ? '🏆 完美'
        : stars >= PASS_STARS ? '✅ 已通过'
        : '▶ 未挑战';

      card.innerHTML =
        '<div class="cc-top">' +
          '<span class="cc-icon">' + ch.icon + '</span>' +
          '<span class="cc-num">CH ' + String(idx + 1).padStart(2, '0') + '</span>' +
        '</div>' +
        '<div class="cc-name">' + esc(ch.name) + '</div>' +
        '<div class="cc-desc">' + esc(ch.desc) + '</div>' +
        '<div class="cc-foot">' +
          '<span class="cc-stars">' + starHtml + '</span>' +
          '<span class="cc-status' + (stars >= PASS_STARS ? ' done' : '') + '">' + status + '</span>' +
        '</div>';

      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'cc-lock';
        lock.textContent = '🔒';
        card.appendChild(lock);
      }

      card.addEventListener('click', () => {
        if (!unlocked) {
          toast('先通过「' + CQ[idx - 1].name + '」才能解锁哦');
          return;
        }
        startChapter(idx);
      });

      el.chapterGrid.appendChild(card);
    });
  }

  /* ---------------- 开始章节 ---------------- */
  function startChapter(idx) {
    state.chapter = idx;
    state.qi = 0;
    state.hearts = MAX_HEARTS;
    state.score = 0;
    state.correct = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.locked = false;
    state.order = shuffle(CQ[idx].qs.map((_, i) => i));

    showScreen('quiz');
    renderQuestion();
  }

  /* ---------------- 渲染题目 ---------------- */
  function currentQ() {
    const ch = CQ[state.chapter];
    return ch.qs[state.order[state.qi]];
  }

  function renderHearts(animateLost) {
    el.hearts.innerHTML = '';
    for (let i = 0; i < MAX_HEARTS; i++) {
      const s = document.createElement('span');
      s.className = 'heart' + (i >= state.hearts ? ' lost' : '');
      s.textContent = '❤️';
      if (animateLost && i === state.hearts) {
        s.classList.add('pop');
        s.style.animation = 'none';
      }
      el.hearts.appendChild(s);
    }
  }

  function typeLabel(t) {
    return t === 'output' ? '预测输出' : t === 'bug' ? '找出 Bug 行' : '概念选择';
  }

  /* 题干支持极简 Markdown：**加粗** 和 `代码`。先转义再替换，避免 XSS。 */
  function richText(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function renderQuestion() {
    const ch = CQ[state.chapter];
    const q = currentQ();
    const total = ch.qs.length;

    state.locked = false;

    el.qChapterName.textContent = ch.icon + ' ' + ch.name;
    el.qProgressText.textContent = '第 ' + (state.qi + 1) + ' / ' + total + ' 题';
    el.progressFill.style.width = ((state.qi) / total * 100) + '%';
    el.qScore.textContent = state.score;
    el.qIndex.textContent = 'Q' + (state.qi + 1);
    el.qType.textContent = typeLabel(q.t);
    el.qText.innerHTML = richText(q.q);

    if (state.combo >= 2) {
      el.combo.hidden = false;
      el.combo.querySelector('b').textContent = state.combo;
    } else {
      el.combo.hidden = true;
    }

    el.codeBadge.textContent = q.t === 'bug'
      ? '点出有问题的行号'
      : q.t === 'output' ? '这段代码会输出什么？' : '选出正确说法';

    renderCode(q.code, q.t === 'bug' && state.revealBug ? q.a : null);

    // 选项
    el.options.innerHTML = '';
    const isBug = q.t === 'bug';
    let optsHtml = [];

    if (isBug) {
      // bug 题：选项是行号
      const lines = q.code.split('\n');
      const candidates = shuffle(lines.map((_, i) => i).filter((i) => lines[i].trim().length > 0));
      const picks = [];
      picks.push(q.a);
      for (const c of candidates) {
        if (picks.length >= 4) break;
        if (c === q.a) continue;
        // 排除相邻的紧邻行，避免歧义（比如同一条语句跨行）
        if (!picks.includes(c)) picks.push(c);
      }
      optsHtml = shuffle(picks);
      optsHtml = optsHtml.map((lineIdx) => ({
        value: lineIdx,
        label: '第 ' + (lineIdx + 1) + ' 行：' + lines[lineIdx].trim().slice(0, 46)
      }));
    } else {
      optsHtml = q.opts.map((o, i) => ({ value: i, label: o }));
    }

    optsHtml.forEach((o, displayIdx) => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.type = 'button';
      btn.dataset.value = String(o.value);
      btn.innerHTML =
        '<span class="opt-key">' + (displayIdx + 1) + '</span>' +
        '<span class="opt-text">' + esc(o.label) + '</span>' +
        '<span class="opt-mark"></span>';
      btn.addEventListener('click', () => answer(o.value));
      el.options.appendChild(btn);
    });

    el.feedback.hidden = true;
    el.feedback.className = 'feedback';
    renderHearts(false);
  }

  /* ---------------- 作答 ---------------- */
  function answer(value) {
    if (state.locked) return;
    state.locked = true;

    const q = currentQ();
    const ch = CQ[state.chapter];
    const qi = state.order[state.qi];
    const correctValue = q.t === 'bug' ? q.a : q.a;
    const isRight = value === correctValue;

    const btns = Array.from(el.options.querySelectorAll('.opt'));
    btns.forEach((b) => {
      const v = Number(b.dataset.value);
      b.disabled = true;
      if (v === correctValue) {
        b.classList.add('correct');
        b.querySelector('.opt-mark').textContent = '✓';
      } else if (v === value) {
        b.classList.add('wrong');
        b.querySelector('.opt-mark').textContent = '✕';
      } else {
        b.classList.add('dimmed');
      }
    });

    if (q.t === 'bug') {
      state.revealBug = true;
      renderCode(q.code, q.a);
      state.revealBug = false;
    }

    // 反馈
    el.feedback.hidden = false;
    if (isRight) {
      state.correct++;
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const gain = PER_Q + (state.combo >= 2 ? COMBO_BONUS * (state.combo - 1) : 0);
      state.score += gain;
      el.feedback.className = 'feedback ok';
      el.fbHead.textContent = '✅ 答对了！ +' + gain + ' 分' +
        (state.combo >= 2 ? '（' + state.combo + ' 连击）' : '');
      // 从错题本移除
      removeWrong(ch.id, qi);
      burst(el.options.querySelector('.opt.correct'), ['#3ee08a', '#45d0ff', '#ffc94d'], 22);
      Sound.ok();
    } else {
      state.combo = 0;
      state.hearts--;
      el.feedback.className = 'feedback bad';
      el.fbHead.textContent = '❌ 答错了  −1 ❤️';
      addWrong(ch.id, qi);
      renderHearts(true);
      Sound.bad();
      document.body.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
         { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 260, easing: 'ease-in-out' }
      );
    }
    el.fbWhy.innerHTML = richText(q.why);
    el.qScore.textContent = state.score;
    el.progressFill.style.width = ((state.qi + 1) / ch.qs.length * 100) + '%';
    el.btnNext.focus({ preventScroll: true });

    // 生命耗尽 → 提前结算
    if (state.hearts <= 0) {
      el.btnNext.textContent = '查看结果';
      state.dead = true;
    } else {
      el.btnNext.innerHTML = (state.qi + 1 >= ch.qs.length ? '完成本章' : '继续') + ' <kbd>Enter</kbd>';
      state.dead = false;
    }
  }

  /* ---------------- 错题本 ---------------- */
  function addWrong(chId, qi) {
    if (!save.wrong.some((w) => w.ch === chId && w.qi === qi)) {
      save.wrong.push({ ch: chId, qi });
      persist();
    }
  }
  function removeWrong(chId, qi) {
    const before = save.wrong.length;
    save.wrong = save.wrong.filter((w) => !(w.ch === chId && w.qi === qi));
    if (save.wrong.length !== before) persist();
  }

  function renderReview() {
    el.reviewList.innerHTML = '';
    if (save.wrong.length === 0) {
      el.reviewList.innerHTML =
        '<div class="empty-state"><div class="big">🎉</div>' +
        '<p>错题本是空的，说明你很稳。</p>' +
        '<p style="font-size:13px;margin-top:8px;opacity:.7">答错过的题会出现在这里，答对后自动消失</p></div>';
      return;
    }

    save.wrong.forEach((w) => {
      const ch = CQ.find((c) => c.id === w.ch);
      if (!ch) return;
      const q = ch.qs[w.qi];
      if (!q) return;

      const item = document.createElement('div');
      item.className = 'review-item';
      const correctText = q.t === 'bug' ? '第 ' + (q.a + 1) + ' 行' : q.opts[q.a];

      item.innerHTML =
        '<div class="ri-head">' +
          '<span class="ri-ch">' + ch.icon + ' ' + esc(ch.name) + '</span>' +
          '<span class="ri-q">' + richText(q.q) + '</span>' +
        '</div>' +
        '<pre>' + esc(q.code) + '</pre>' +
        '<div class="ri-ans">正确答案：<b>' + esc(correctText) + '</b></div>' +
        '<div class="ri-why">' + richText(q.why) + '</div>';
      el.reviewList.appendChild(item);
    });
  }

  /* ---------------- 结算 ---------------- */
  function finishChapter() {
    const ch = CQ[state.chapter];
    const total = ch.qs.length;
    const dead = state.hearts <= 0;
    const passed = !dead && state.correct >= Math.ceil(total * 0.6);

    let stars = 0;
    if (passed) {
      if (state.correct === total) stars = 3;
      else if (state.correct >= Math.ceil(total * 0.85)) stars = 2;
      else stars = 1;
    }

    // 存档
    const prev = save.stars[ch.id] || 0;
    if (stars > prev) save.stars[ch.id] = stars;
    const prevBest = save.best[ch.id] || 0;
    if (state.score > prevBest) save.best[ch.id] = state.score;
    if (state.score > (save.bestTotal || 0)) save.bestTotal = state.score;
    persist();

    // 星星动画
    el.resultStars.innerHTML = [1, 2, 3].map((s) =>
      '<span class="' + (s <= stars ? 's-on' : 's-off') + '" style="animation-delay:' + (s * 0.13) + 's">★</span>'
    ).join('');

    el.resultTitle.textContent = stars === 3 ? '完美通关！' : passed ? '章节通过！' : (dead ? '生命耗尽…' : '再练练吧');
    el.resultSub.textContent = stars === 3
      ? '全对！这章你已经拿下了。'
      : passed ? '通关成功，再刷一遍可以冲 3 星。'
      : dead ? '三条命用完了。看看下面的错题，重来一次吧。'
      : '答对率不到 60%，回顾一下解析再来。';

    el.resCorrect.textContent = state.correct + '/' + total;
    el.resScore.textContent = state.score;
    el.resCombo.textContent = state.maxCombo;
    el.resHearts.textContent = Math.max(0, state.hearts);

    const nextIdx = state.chapter + 1;
    const hasNext = nextIdx < CQ.length;
    const btnNext = $('#btn-result-next');
    if (hasNext && passed) {
      btnNext.hidden = false;
      btnNext.textContent = '下一章：' + CQ[nextIdx].name + ' →';
    } else if (!hasNext && passed) {
      btnNext.hidden = false;
      btnNext.textContent = '🏆 全部通关！回到首页';
    } else {
      btnNext.hidden = true;
    }

    showScreen('result');
    if (passed) {
      Sound.win();
      celebrate();
    }
  }

  /* ---------------- 音效（WebAudio，无外部资源） ---------------- */
  const Sound = (() => {
    let ctx = null;
    let muted = false;
    function ac() {
      if (muted) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function beep(freq, dur, type, vol, delay) {
      const c = ac();
      if (!c) return;
      const t0 = c.currentTime + (delay || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol || 0.09, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    return {
      ok() {
        beep(660, 0.13, 'sine', 0.08, 0);
        beep(990, 0.16, 'sine', 0.075, 0.07);
      },
      bad() {
        beep(200, 0.18, 'sawtooth', 0.055, 0);
        beep(150, 0.24, 'sawtooth', 0.05, 0.09);
      },
      win() {
        [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.3, 'sine', 0.07, i * 0.1));
      },
      click() { beep(420, 0.05, 'square', 0.025, 0); },
      toggleMute() { muted = !muted; return muted; },
      get muted() { return muted; }
    };
  })();

  /* ---------------- 粒子特效 ---------------- */
  const fx = $('#fx');
  const ctx2d = fx.getContext('2d');
  let particles = [];
  let rafId = 0;

  function resizeFx() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = innerWidth * dpr;
    fx.height = innerHeight * dpr;
    fx.style.width = innerWidth + 'px';
    fx.style.height = innerHeight + 'px';
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeFx);
  resizeFx();

  function burst(node, colors, count) {
    if (!node) return;
    const r = node.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1.5,
        life: 1,
        size: 2 + Math.random() * 3,
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
    tick();
  }

  function celebrate() {
    const colors = ['#3ee08a', '#45d0ff', '#ffc94d', '#a78bfa', '#ff7ab6'];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        life: 1,
        size: 2 + Math.random() * 4,
        color: colors[(Math.random() * colors.length) | 0],
        gravity: 0.02
      });
    }
    tick();
  }

  function tick() {
    if (rafId) return;
    rafId = requestAnimationFrame(function loop() {
      ctx2d.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity == null ? 0.14 : p.gravity;
        p.vx *= 0.985;
        p.life -= 0.016;
        ctx2d.globalAlpha = Math.max(0, p.life);
        ctx2d.fillStyle = p.color;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
      particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 60);
      if (particles.length) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
        ctx2d.clearRect(0, 0, innerWidth, innerHeight);
      }
    });
  }

  /* ---------------- 事件绑定 ---------------- */
  $('#btn-start').addEventListener('click', () => {
    Sound.click();
    renderMap();
    showScreen('map');
  });

  $('#btn-review-home').addEventListener('click', () => {
    Sound.click();
    renderReview();
    showScreen('review');
  });

  $('#btn-clear-wrong').addEventListener('click', () => {
    if (save.wrong.length === 0) { toast('错题本是空的'); return; }
    save.wrong = [];
    persist();
    renderReview();
    refreshHome();
    toast('错题本已清空');
  });

  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => {
      Sound.click();
      const target = b.dataset.nav;
      if (target === 'map') { renderMap(); showScreen('map'); }
      else if (target === 'home') { refreshHome(); showScreen('home'); }
    });
  });

  el.btnNext.addEventListener('click', () => {
    Sound.click();
    if (state.dead) { finishChapter(); return; }
    if (state.qi + 1 >= CQ[state.chapter].qs.length) {
      finishChapter();
    } else {
      state.qi++;
      renderQuestion();
    }
  });

  $('#btn-retry').addEventListener('click', () => {
    Sound.click();
    startChapter(state.chapter);
  });

  $('#btn-result-next').addEventListener('click', () => {
    Sound.click();
    const nextIdx = state.chapter + 1;
    if (nextIdx < CQ.length) {
      startChapter(nextIdx);
    } else {
      refreshHome();
      showScreen('home');
    }
  });

  // 键盘
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const inQuiz = el.screens.quiz.classList.contains('is-active');

    if (inQuiz) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!el.feedback.hidden) {
          e.preventDefault();
          el.btnNext.click();
        }
        return;
      }
      if (!state.locked && /^[1-4]$/.test(e.key)) {
        const btns = el.options.querySelectorAll('.opt');
        const idx = Number(e.key) - 1;
        if (btns[idx]) { e.preventDefault(); btns[idx].click(); }
      }
      if (e.key === 'Escape') {
        renderMap();
        showScreen('map');
      }
    }

    if (el.screens.home.classList.contains('is-active') && e.key === 'Enter') {
      e.preventDefault();
      $('#btn-start').click();
    }
  });

  /* ---------------- 启动 ---------------- */
  refreshHome();
  showScreen('home');

  // 暴露给调试
  // 暴露给调试 / 实操模块（hands-on-ui.js）
  window.__CQuest = {
    CQ, save, state, startChapter,
    highlight, renderCode, richText, esc,
    showScreen, toast, celebrate, Sound
  };
})();
