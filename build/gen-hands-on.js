/* 实操题答案校准工具

   做法：不搞文本替换（太脆），改成——
     1. 编译运行每道题的参考解答，拿到实跑输出
     2. 和 expect 比对，列出不一致
     3. --write 时，用"行级替换"精确改写 expect 那一行

   为什么是行级：每个用例在源码里都占一行（或几行），
   我们只改 expect 字面量，其余字节不动。这样多行文本、转义都不会出问题。
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');
const TMP = path.join(ROOT, 'build', '.tmp-hands');
const WRITE = process.argv.includes('--write');

globalThis.HQ = [];
require(path.join(ROOT, 'hands-on.js'));
require(path.join(ROOT, 'hands-on-algo.js'));
require(path.join(ROOT, 'hands-on-game.js'));
const HQ = globalThis.HQ;

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

/* 只把 CRLF 归一，保留末尾换行（严格比对） */
const norm = (s) => String(s || '').replace(/\r\n/g, '\n');

function runOne(id, code, stdin, tag) {
  const dir = path.join(TMP, id + '_' + tag);
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, 'main.c');
  const exe = path.join(dir, 'main.exe');
  fs.writeFileSync(src, code, 'utf8');

  try {
    execFileSync(TCC, ['-o', exe, src], { stdio: 'pipe', cwd: dir });
  } catch (e) {
    return { ok: false, stage: 'compile', detail: (e.stderr || e.stdout || e.message || '').toString().slice(0, 500) };
  }
  try {
    const out = execFileSync(exe, [], {
      input: stdin, encoding: 'utf8', stdio: 'pipe', cwd: dir, timeout: 10000
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, stage: 'run', detail: (e.stderr || e.message || '').toString().slice(0, 300) };
  }
}

/* ---------- 找到每题在源码文件里的位置 ---------- */
/* 返回 { file, startLine, endLine } —— 用题目 id 定位 */
function locateProblem(id) {
  for (const f of ['hands-on.js', 'hands-on-algo.js', 'hands-on-game.js']) {
    const p = path.join(ROOT, f);
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*id:\s*'/.test(lines[i]) && lines[i].includes("'" + id + "'")) {
        start = i;
        break;
      }
    }
    if (start < 0) continue;
    // 这一题的结束：下一个 "id: '" 行之前，或者文件末尾
    let end = lines.length - 1;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*id:\s*'/.test(lines[i])) { end = i - 1; break; }
    }
    return { file: p, startLine: start, endLine: end, lines };
  }
  return null;
}

/* 在一个题目的行范围内，把所有 cases 的 expect 行找出来 */
function findExpectLines(lines, startLine, endLine) {
  const out = [];
  for (let i = startLine; i <= endLine; i++) {
    if (/\bexpect:\s*'/.test(lines[i])) out.push(i);
  }
  return out;
}

const problems = [];
const pendingWrites = [];   // { file, lineIdx, newLine }
let caseCount = 0;

/* 这几道题的期望输出和"编译器实现"有关（rand 序列），
   本地 TCC 和网页端 Clang(wasm) 会给出不同的值。
   答案以网页端 wasm 为准（用 build/regen-wasm-answers.js 生成），
   所以本地生成器跳过它们，避免互相打架。 */
const COMPILER_DEPENDENT = new Set(['g1', 'g2']);

for (const q of HQ) {
  if (COMPILER_DEPENDENT.has(q.id)) {
    console.log('  [跳过] ' + q.id + ' ' + q.title + '（依赖随机实现，答案由 wasm 生成）');
    continue;
  }

  // 参考解答能编译吗
  const comp = runOne(q.id, q.solution, '', 'compile');
  if (!comp.ok && comp.stage === 'compile') {
    problems.push(q.id + ' 「' + q.title + '」参考解答编译失败:\n     ' + comp.detail.trim());
    continue;
  }

  const loc = locateProblem(q.id);
  if (!loc) {
    problems.push(q.id + ' 「' + q.title + '」在源码里定位不到（id 行没找到）');
    continue;
  }
  const expLineIdxs = findExpectLines(loc.lines, loc.startLine, loc.endLine);

  if (expLineIdxs.length !== q.cases.length) {
    problems.push(q.id + ' 「' + q.title + '」用例数 ' + q.cases.length +
      ' 和源码里的 expect 行数 ' + expLineIdxs.length + ' 对不上（可能一个用例跨多行）');
    continue;
  }

  q.cases.forEach((c, i) => {
    caseCount++;
    const r = runOne(q.id, q.solution, c.in, 'case' + i);
    if (!r.ok) {
      problems.push(q.id + ' 「' + q.title + '」用例 ' + (i + 1) + ' 运行失败: ' + r.detail);
      return;
    }
    const actual = norm(r.out);
    const expect = norm(c.expect);

    if (actual !== expect) {
      problems.push(
        q.id + ' 「' + q.title + '」用例 ' + (i + 1) + ' 期望输出不符\n' +
        '     输入: ' + JSON.stringify(c.in) + '\n' +
        '     期望: ' + JSON.stringify(expect) + '\n' +
        '     实跑: ' + JSON.stringify(actual)
      );
      if (WRITE) {
        const lineIdx = expLineIdxs[i];
        const oldLine = loc.lines[lineIdx];
        // 把这一行里的 expect: '...' 整体换掉
        const m = oldLine.match(/^(\s*\{\s*in:\s*'[\s\S]*?',\s*expect:\s*)'[\s\S]*?'(\s*\}.*)$/);
        if (m) {
          const esc = actual
            .split('\\').join('\\\\')
            .split("'").join("\\'")
            .split('\n').join('\\n');
          const newLine = m[1] + "'" + esc + "'" + m[2];
          pendingWrites.push({ file: loc.file, lineIdx, newLine, qid: q.id, caseNo: i + 1 });
        } else {
          problems.push(q.id + ' 用例 ' + (i + 1) + ' 那一行的格式无法识别，没自动改：' + JSON.stringify(oldLine));
        }
      }
    }
  });

  // 起手代码必须能编译
  const st = runOne(q.id, q.starter, '', 'starter');
  if (!st.ok && st.stage === 'compile') {
    problems.push(q.id + ' 「' + q.title + '」起手代码编译失败:\n     ' + st.detail.trim());
  }

  // 禁用词
  if (q.forbidden) {
    for (const w of q.forbidden) {
      if (q.solution.includes(w)) problems.push(q.id + ' 参考解答含禁用词「' + w + '」');
      if (q.starter.includes(w)) problems.push(q.id + ' 起手代码含禁用词「' + w + '」');
    }
  }
}

/* ---------- 写回 ---------- */
if (WRITE && pendingWrites.length) {
  const byFile = new Map();
  for (const w of pendingWrites) {
    if (!byFile.has(w.file)) byFile.set(w.file, []);
    byFile.get(w.file).push(w);
  }
  for (const [file, ws] of byFile) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const w of ws) {
      console.log('  改 ' + path.basename(file) + ':' + (w.lineIdx + 1) +
        '  (' + w.qid + ' 用例 ' + w.caseNo + ')');
      lines[w.lineIdx] = w.newLine;
    }
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }
  console.log('\n已写回 ' + pendingWrites.length + ' 处');
  console.log('请不带 --write 再跑一次确认。');
  process.exit(0);
}

console.log('实操题：' + HQ.length + ' 道，测试用例 ' + caseCount + ' 个');

if (problems.length === 0) {
  console.log('✅ 全部通过：参考解答可编译、每个用例实跑与期望一致、起手代码可编译');
  process.exit(0);
}

console.log('\n❌ ' + problems.length + ' 处问题：\n');
problems.forEach((p) => console.log('  • ' + p + '\n'));
console.log('提示：node build/gen-hands-on.js --write 用实跑结果自动修正期望输出。');
process.exit(1);
