/* ===========================================================
   C 语言闯关 · 本地编译服务（网页版实操题用）
   ===========================================================

   为什么需要它？
     浏览器不能执行 C 代码。要"真的编译运行你写的代码"，就得有个本地进程帮忙。
     这个服务只做三件事：收代码 → 调 TCC 编译 → 运行 → 把输出回传。

   启动： node server.js
         （或者双击 开始游戏.bat 选 2）

   安全设计：
     - 只监听 127.0.0.1，外网访问不到
     - 每个请求一个临时目录，跑完就删
     - 编译和运行都有超时（默认 8 / 10 秒）
     - 只调用本目录下的 TCC，不接受任意命令
     - 依赖 Node.js 内置模块，不需要 npm install
   =========================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const ROOT = __dirname;
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');
const PORT = Number(process.env.CQUEST_PORT || 7788);
const COMPILE_TIMEOUT = 8000;
const RUN_TIMEOUT = 10000;
const MAX_BODY = 512 * 1024;
const MAX_CODE = 64 * 1024;

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const BS = String.fromCharCode(92);

/* 把 Windows 的 CRLF 换成 LF，让输出可以直接和题目期望比对 */
function normalizeOutput(t) {
  return String(t || '').split(CRLF).join(LF);
}

/* 把编译报错里的临时目录路径洗掉，只留 main.c */
function cleanCompileError(msg, workDir) {
  let s = normalizeOutput(msg);
  s = s.split(workDir).join('');
  s = s.split(workDir.split(BS).join('/')).join('');
  // 形如 C:/Users/xxx/AppData/Local/Temp/cquest-abcd/main.c => main.c
  s = s.replace(/[A-Za-z]:[^:\s]*main\.c/g, 'main.c');
  s = s.replace(/\/main\.c/g, 'main.c');
  s = s.replace(/main\.c:\d+:\s*error:/g, 'main.c: error:');
  return s.trim();
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ---------- 核心：编译并运行 ---------- */
function compileAndRun(code, stdin, cb) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cquest-'));
  const src = path.join(workDir, 'main.c');
  const exe = path.join(workDir, 'main.exe');

  const cleanup = () => {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  };

  try {
    fs.writeFileSync(src, code, 'utf8');
  } catch (e) {
    cleanup();
    return cb({ stage: 'write', error: '无法写入临时文件: ' + e.message });
  }

  execFile(TCC, ['-o', exe, src], { timeout: COMPILE_TIMEOUT, cwd: workDir }, (cerr, cout, cerrOut) => {
    if (cerr) {
      const raw = (cerrOut || cout || cerr.message || '').toString();
      cleanup();
      return cb({ stage: 'compile', error: '编译失败', detail: cleanCompileError(raw, workDir) });
    }

    const child = execFile(exe, [], { timeout: RUN_TIMEOUT, cwd: workDir }, (rerr, rout, rerrOut) => {
      const timedOut = !!(rerr && rerr.killed);
      cleanup();
      cb({
        stage: 'run',
        ok: !rerr || timedOut,
        exitCode: rerr ? (rerr.code == null ? null : rerr.code) : 0,
        stdout: normalizeOutput(rout),
        stderr: normalizeOutput(rerrOut),
        timedOut
      });
    });

    if (child.stdin) {
      child.stdin.end(stdin || '');
    }
  });
}

/* ---------- HTTP ---------- */
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (url === '/ping') {
    return json(res, 200, {
      ok: true,
      service: 'cquest-compiler',
      tcc: fs.existsSync(TCC),
      node: process.version
    });
  }

  if (url === '/run' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return json(res, 413, { ok: false, error: e.message });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (_) {
      return json(res, 400, { ok: false, error: '请求不是合法 JSON' });
    }

    const code = payload.code;
    if (typeof code !== 'string' || code.trim() === '') {
      return json(res, 400, { ok: false, error: '代码为空' });
    }
    if (code.length > MAX_CODE) {
      return json(res, 413, { ok: false, error: '代码太长（上限 64KB）' });
    }
    if (!fs.existsSync(TCC)) {
      return json(res, 500, { ok: false, error: '找不到编译器 tools/tcc/tcc.exe' });
    }

    const stdin = typeof payload.stdin === 'string' ? payload.stdin : '';

    return compileAndRun(code, stdin, (r) => {
      if (r.stage === 'compile') {
        return json(res, 200, { ok: false, stage: 'compile', error: r.error, detail: r.detail });
      }
      if (r.stage === 'write') {
        return json(res, 500, { ok: false, stage: 'write', error: r.error });
      }
      json(res, 200, {
        ok: true,
        stage: 'run',
        stdout: r.stdout,
        stderr: r.stderr,
        timedOut: r.timedOut,
        exitCode: r.exitCode
      });
    });
  }

  /* 静态文件：支持 GET / HEAD / Range，这样部署到线上也稳 */
  if (req.method === 'GET' || req.method === 'HEAD') {
    const safe = url === '/' ? '/index.html' : url;
    const ext = path.extname(safe).toLowerCase();

    const allowed = [
      '.html', '.css', '.js', '.png', '.svg', '.ico', '.json', '.c', '.md', '.txt',
      '.gz', '.wasm', '.tar'
    ];

    if (allowed.includes(ext)) {
      const rel = path.normalize(safe).replace(/^([.][.][/\\])+/, '');
      const file = path.join(ROOT, rel);

      if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.c': 'text/plain; charset=utf-8',
          '.md': 'text/plain; charset=utf-8',
          '.txt': 'text/plain; charset=utf-8',
          '.gz': 'application/gzip',
          '.wasm': 'application/wasm',
          '.tar': 'application/x-tar'
        };

        const stat = fs.statSync(file);
        const total = stat.size;

        /*
          wasm 资源很大（15MB），必须让浏览器能缓存。
          其他小文件用较短的缓存，方便改完立刻看到效果。
        */
        const isWasmAsset = /\.(gz|wasm|tar)$/.test(safe);
        const cacheControl = isWasmAsset
          ? 'public, max-age=31536000, immutable'
          : 'no-cache';

        const headers = {
          'Content-Type': types[ext] || 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl,
          'Last-Modified': stat.mtime.toUTCString()
        };

        /* ---- Range 请求（断点续传 / 分块）---- */
        const range = req.headers.range;
        if (range) {
          const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
          if (m) {
            let startByte = m[1] === '' ? null : parseInt(m[1], 10);
            let endByte = m[2] === '' ? null : parseInt(m[2], 10);

            // 处理 "bytes=-500" 这种（最后 500 字节）
            if (startByte === null && endByte !== null) {
              startByte = Math.max(0, total - endByte);
              endByte = total - 1;
            } else if (startByte !== null && endByte === null) {
              endByte = total - 1;
            }

            if (startByte !== null && endByte !== null &&
                startByte <= endByte && startByte < total) {
              endByte = Math.min(endByte, total - 1);
              const len = endByte - startByte + 1;

              res.writeHead(206, Object.assign({}, headers, {
                'Content-Range': 'bytes ' + startByte + '-' + endByte + '/' + total,
                'Content-Length': len
              }));

              if (req.method === 'HEAD') return res.end();
              return fs.createReadStream(file, { start: startByte, end: endByte }).pipe(res);
            }

            // 范围不合法
            res.writeHead(416, { 'Content-Range': 'bytes */' + total });
            return res.end();
          }
        }

        /* ---- 普通请求 ---- */
        headers['Content-Length'] = total;
        res.writeHead(200, headers);
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(file).pipe(res);
      }
    }
  }

  json(res, 404, { ok: false, error: '没有这个接口', path: url });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('');
    console.log('  端口 ' + PORT + ' 已经被占用了。');
    console.log('  可能已经开着一个了——直接去浏览器用就行。');
    console.log('  想换端口: set CQUEST_PORT=7799 && node server.js');
    console.log('');
  } else {
    console.log('  服务启动失败: ' + e.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ================================================');
  console.log('    C 语言闯关 · 本地编译服务已启动');
  console.log('  ================================================');
  console.log('');
  console.log('    地址:   http://127.0.0.1:' + PORT);
  console.log('    编译器: ' + (fs.existsSync(TCC) ? '已找到 tools/tcc/tcc.exe' : '找不到 tcc.exe'));
  console.log('');
  console.log('    在浏览器打开上面的地址就能玩实操题。');
  console.log('    关掉服务：按 Ctrl+C 或直接关这个窗口。');
  console.log('');
});
