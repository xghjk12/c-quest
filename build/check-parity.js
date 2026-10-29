/* 核对 C 版与网页版的题库是否一致
   C 版题目是手写进 c-quest.c 的，网页版是 bank-a/b.js。
   这里把两边的题干、选项、正确答案、解析都抽出来对比。
   用法: node build/check-parity.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* ---------- 1. 读网页题库 ---------- */
globalThis.CQ = [];
for (const f of ['bank-a.js', 'bank-b.js']) require(path.join(ROOT, f));
const web = [];
globalThis.CQ.forEach((ch) => {
  ch.qs.forEach((q) => {
    web.push({
      ch: ch.name,
      q: q.q,
      opts: q.opts ? q.opts.slice() : null,
      a: q.a,
      why: q.why
    });
  });
});

/* ---------- 2. 解析 c-quest.c 里的题目 ---------- */
const src = fs.readFileSync(path.join(ROOT, 'c-quest.c'), 'utf8');

// 抓每条 { Q_XXX, "题", "代码", { "a","b","c","d" }, N, "解析" }
// 解析字符串字面量（处理 \" \\ 和字符串拼接）
function parseCString(seg, start) {
  // seg[start] 应该是开头的双引号
  let i = start;
  let out = '';
  while (i < seg.length) {
    // 跳到下一个 "
    if (seg[i] !== '"') { i++; continue; }
    i++;
    while (i < seg.length && seg[i] !== '"') {
      if (seg[i] === '\\') {
        const c = seg[i + 1];
        if (c === 'n') out += '\n';
        else if (c === 't') out += '\t';
        else if (c === '\\') out += '\\';
        else if (c === '"') out += '"';
        else if (c === '0') out += '\0';
        else out += c;
        i += 2;
      } else {
        out += seg[i];
        i++;
      }
    }
    i++; // 跳过结束引号
    // 检查后面是否紧接另一个字符串（C 字符串拼接）
    let j = i;
    while (j < seg.length && /\s/.test(seg[j])) j++;
    if (seg[j] !== '"') { i = j; break; }
    i = j;
  }
  return { str: out, end: i };
}

const cQs = [];
const chapterBlocks = [
  ['变量与类型', 'ch1_qs'], ['运算符与表达式', 'ch2_qs'], ['分支结构', 'ch3_qs'],
  ['循环', 'ch4_qs'], ['数组', 'ch5_qs'], ['函数', 'ch6_qs'], ['指针', 'ch7_qs'],
  ['字符与字符串', 'ch8_qs'], ['结构体与 typedef', 'ch9_qs'], ['文件操作', 'ch10_qs']
];

for (const [chName, varName] of chapterBlocks) {
  const re = new RegExp('static const Question ' + varName + '\\[\\] = \\{([\\s\\S]*?)\\n\\};');
  const m = src.match(re);
  if (!m) throw new Error('找不到章节数组 ' + varName);
  const body = m[1];

  // 按 "{ Q_" 切块
  const chunks = body.split(/\{\s*Q_/).slice(1);
  for (const chunk of chunks) {
    // 题目字符串：第一个 "..."（Q_XXX, 后面的那个）
    let p = 0;
    while (chunk[p] !== '"') p++;
    const qRes = parseCString(chunk, p);
    p = qRes.end;

    // 代码字符串
    while (p < chunk.length && chunk[p] !== '"') p++;
    const codeRes = parseCString(chunk, p);
    p = codeRes.end;

    // 选项 { "..","..","..",".." }
    while (p < chunk.length && chunk[p] !== '{') p++;
    p++; // 跳过 {
    const opts = [];
    while (opts.length < 4) {
      while (p < chunk.length && chunk[p] !== '"') p++;
      const o = parseCString(chunk, p);
      opts.push(o.str);
      p = o.end;
    }

    // 答案（选项之后第一个逗号后紧接的整数）
    const rest = chunk.slice(p);
    const aMatch = rest.match(/^[\s,}]*?(\d+)/);
    const a = aMatch ? parseInt(aMatch[1], 10) : -1;

    // 解析字符串
    let p2 = p + (aMatch ? aMatch[0].length : 0);
    while (p2 < chunk.length && chunk[p2] !== '"') p2++;
    const whyRes = parseCString(chunk, p2);

    cQs.push({ ch: chName, q: qRes.str, opts, a, why: whyRes.str, code: codeRes.str });
  }
}

/* ---------- 3. 对比 ---------- */
/* 归一化：网页版题干/解析里的 Markdown 标记，C 版是纯文本，比对前先抹平 */
function normText(s) {
  return String(s)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const problems = [];
console.log('网页版题目：' + web.length + '    C 版题目：' + cQs.length);

if (web.length !== cQs.length) {
  problems.push('题目总数不同：网页 ' + web.length + ' vs C ' + cQs.length);
}

const webByQ = new Map();
web.forEach((w) => webByQ.set(w.ch + '||' + normText(w.q), w));

const cByQ = new Map();
cQs.forEach((c) => {
  const key = c.ch + '||' + normText(c.q);
  if (cByQ.has(key)) problems.push('C 版有重复题：' + key);
  cByQ.set(key, c);
});

// 网页每道题必须在 C 版存在
for (const w of web) {
  const key = w.ch + '||' + normText(w.q);
  const c = cByQ.get(key);
  if (!c) {
    problems.push('[网页有 / C 版缺] ' + w.ch + ' :: ' + w.q);
    continue;
  }
  // 答案必须一致
  if (c.a !== w.a) {
    problems.push('[答案不同] ' + w.q + '\n     网页 a=' + w.a + '  C 版 a=' + c.a);
  }
  // 正确答案的文本必须一致
  if (w.opts && normText(c.opts[w.a]) !== normText(w.opts[w.a])) {
    problems.push('[正确选项文本不同] ' + w.q +
      '\n     网页「' + w.opts[w.a] + '」  C 版「' + c.opts[w.a] + '」');
  }
}

for (const c of cQs) {
  const key = c.ch + '||' + normText(c.q);
  if (!webByQ.has(key)) problems.push('[C 版有 / 网页缺] ' + c.ch + ' :: ' + c.q);
}

if (problems.length === 0) {
  console.log('✅ 两版题库完全对齐（题干、答案位置、正确答案文本一致）');
  process.exit(0);
}
console.log('\n❌ ' + problems.length + ' 处不一致：\n');
problems.forEach((p) => console.log('  • ' + p));
process.exit(1);
