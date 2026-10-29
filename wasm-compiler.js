/* =========================================================
   C 语言闯关 · 浏览器内 C 编译器

   用 @live-codes/clang-wasm（Clang 22 → WebAssembly），
   完全跑在浏览器里，不需要任何后端。

   ── 三个关键设计 ──────────────────────────────────

   1. 【懒加载】28MB 资源只在第一次点"运行/提交"时才下载。
      看题、写代码、做读代码题完全不碰它。

   2. 【Worker 隔离】C 程序里写个 while(1) 会把线程卡死，
      主线程的 setTimeout 根本没机会执行。
      所以编译和运行都放在 Worker 里，超时直接 terminate()。
      这一点是实测出来的 —— 不这么做，死循环会挂死整个页面。

   3. 【按脚本自身位置解析资源】
      页面可能在任何目录（index.html 在根，测试页在 build/）。
      所以不能用 location.href 算基准，
      要用 document.currentScript.src 找到自己在哪。
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 找到自己的位置，据此定位 clang/ ---------- */
  const mySrc = (document.currentScript && document.currentScript.src) || '';
  const baseDir = mySrc ? mySrc.slice(0, mySrc.lastIndexOf('/') + 1) : location.href;
  const BUNDLE_URL = baseDir + 'clang/clang-wasm.global.js';
  const ASSET_BASE = baseDir + 'clang/assets/';

  /* ---------- 配置 ---------- */
  const BOOT_TIMEOUT = 120000;   // 首次要下载+解压 84MB，给足 2 分钟
  const RUN_TIMEOUT = 8000;      // 单次运行 8 秒，超了当死循环

  /* ---------- 状态 ---------- */
  let worker = null;
  let loading = null;
  let seq = 0;
  const pending = new Map();

  function isFileProtocol() {
    return location.protocol === 'file:';
  }

  /* ---------- Worker 源码 ---------- */
  const WORKER_SRC = `
'use strict';

let compiler = null;
let ready = false;

self.onmessage = async function (e) {
  const msg = e.data;

  if (msg.type === 'init') {
    if (ready) { self.postMessage({ type: 'ready' }); return; }
    try {
      importScripts(msg.bundleUrl);
      if (!self.clangWasm || typeof self.clangWasm.createCompiler !== 'function') {
        throw new Error('clang-wasm 加载后没有找到 createCompiler');
      }
      compiler = await self.clangWasm.createCompiler('c', { baseUrl: msg.baseUrl });
      ready = true;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({
        type: 'init-error',
        error: String((err && err.message) || err)
      });
    }
    return;
  }

  if (msg.type === 'run') {
    try {
      if (!compiler) throw new Error('编译器还没准备好');
      const r = await compiler.run(msg.code, msg.stdin || '');
      self.postMessage({
        type: 'result',
        id: msg.id,
        ok: true,
        stdout: r.stdout,
        stderr: r.stderr,
        errors: r.errors,
        exitCode: r.exitCode,
        compileMs: r.compileMs,
        runMs: r.runMs
      });
    } catch (err) {
      self.postMessage({
        type: 'result',
        id: msg.id,
        ok: false,
        error: String((err && err.message) || err)
      });
    }
  }
};
`;

  /* ---------- 初始化 ---------- */
  function init() {
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
      if (isFileProtocol()) {
        return reject(new Error('FILE_PROTOCOL'));
      }

      let url;
      try {
        const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
        url = URL.createObjectURL(blob);
        worker = new Worker(url);   // classic worker，importScripts 可用
      } catch (err) {
        return reject(new Error('无法创建 Worker：' + err.message));
      }

      let settled = false;
      const bootTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        killWorker();
        reject(new Error('编译器加载超时（可能是资源没下载完）'));
      }, BOOT_TIMEOUT);

      worker.onmessage = (e) => {
        const msg = e.data;

        if (msg.type === 'ready') {
          if (settled) return;
          settled = true;
          clearTimeout(bootTimer);
          URL.revokeObjectURL(url);
          resolve();
          return;
        }

        if (msg.type === 'init-error') {
          if (settled) return;
          settled = true;
          clearTimeout(bootTimer);
          URL.revokeObjectURL(url);
          killWorker();
          reject(new Error(msg.error));
          return;
        }

        if (msg.type === 'result') {
          const p = pending.get(msg.id);
          if (!p) return;
          clearTimeout(p.timer);
          pending.delete(msg.id);
          p.resolve(msg);
        }
      };

      worker.onerror = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(bootTimer);
        reject(new Error('Worker 启动失败：' + (err.message || '未知错误')));
      };

      worker.postMessage({
        type: 'init',
        bundleUrl: BUNDLE_URL,
        baseUrl: ASSET_BASE
      });
    });

    return loading;
  }

  /* ---------- 运行 ---------- */
  async function run(code, stdin) {
    await init();

    const id = ++seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        killWorker();
        resolve({
          ok: false,
          timedOut: true,
          error: '运行超过 ' + (RUN_TIMEOUT / 1000) + ' 秒，已强制停止（可能是死循环）'
        });
      }, RUN_TIMEOUT);

      pending.set(id, { resolve, timer });
      worker.postMessage({ type: 'run', id, code, stdin: stdin || '' });
    });
  }

  function killWorker() {
    if (worker) {
      try { worker.terminate(); } catch (_) {}
      worker = null;
    }
    loading = null;
    for (const [, p] of pending) clearTimeout(p.timer);
    pending.clear();
  }

  /* ---------- 对外接口 ---------- */
  globalThis.CCompiler = {
    isFileProtocol,
    available() { return !isFileProtocol(); },
    warmup() {
      if (isFileProtocol()) return Promise.resolve(false);
      return init().then(() => true).catch(() => false);
    },
    run,
    isReady() { return !!worker; },
    /* 给页面显示用 */
    bundleUrl: BUNDLE_URL,
    assetBase: ASSET_BASE
  };
})();
