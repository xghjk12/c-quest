/* 从网页题库（bank-a.js / bank-b.js）自动生成 c-quest.c 的题目数组。
   这样两版共用同一份数据源，永远不会走样。
   用法: node build/gen-c-bank.js   （会直接改写 c-quest.c 里的题库区段）
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

globalThis.CQ = [];
for (const f of ['bank-a.js', 'bank-b.js']) require(path.join(ROOT, f));
const CQ = globalThis.CQ;

const VAR_NAMES = ['ch1_qs', 'ch2_qs', 'ch3_qs', 'ch4_qs', 'ch5_qs', 'ch6_qs', 'ch7_qs',
                   'ch8_qs', 'ch9_qs', 'ch10_qs'];

/* 把网页文本转成 C 字符串字面量，并去掉 Markdown 标记 */
function cstr(s) {
  let t = String(s);
  // 去 Markdown：**粗体** -> 粗体，`代码` -> 代码
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  // 去 HTML 实体（题库里没有，防御性处理）
  t = t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  const body = t
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');

  // 长字符串折行，保持源码可读（C 相邻字符串会自动拼接）
  if (body.length <= 78) return '"' + body + '"';

  const lines = t.split('\n');
  const out = [];
  for (const ln of lines) {
    const b = ln.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\t/g, '\\t');
    out.push('"' + b + '\\n"');
  }
  // 去掉最后一个多余的 \n（原文本末尾没有换行时）
  if (!t.endsWith('\n')) {
    out[out.length - 1] = out[out.length - 1].replace(/\\n"$/, '"');
  }
  return out.join('\n      ');
}

function renderQuestion(q) {
  const typeMap = { output: 'Q_OUTPUT', choice: 'Q_CHOICE', bug: 'Q_BUG' };
  const ty = typeMap[q.t] || 'Q_CHOICE';
  let opts;

  if (q.t === 'bug') {
    // 找 Bug 题的选项在运行时按代码行号生成，这里放占位符
    opts = '{ "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" }';
  } else {
    opts = '{ ' + q.opts.map((o) => cstr(o)).join(', ') + ' }';
  }

  return `    { ${ty},
      ${cstr(q.q)},
      ${cstr(q.code)},
      ${opts},
      ${q.a},
      ${cstr(q.why)} }`;
}

let out = '';
out += '/* =============================================================\n';
out += ' *  题库（本段由 build/gen-c-bank.js 从 bank-a.js / bank-b.js 自动生成）\n';
out += ' *  想改题目请改网页版题库，然后跑一次： node build/gen-c-bank.js\n';
out += ' * ============================================================= */\n\n';

CQ.forEach((ch, i) => {
  const varName = VAR_NAMES[i] || ('ch' + (i + 1) + '_qs');
  out += `static const Question ${varName}[] = {\n`;
  out += ch.qs.map(renderQuestion).join(',\n\n');
  out += '\n};\n\n';
});

out += '/* ---------- 章节表 ---------- */\n';
out += 'static const Chapter CHAPTERS[] = {\n';
CQ.forEach((ch, i) => {
  const varName = VAR_NAMES[i] || ('ch' + (i + 1) + '_qs');
  const name = cstr(ch.name);
  const desc = cstr(ch.desc);
  const tail = i === CQ.length - 1 ? '\n' : ',\n';
  out += `    { ${name}, ${desc}, ${varName},\n`;
  out += `      (int)(sizeof(${varName}) / sizeof(${varName}[0])) }${tail}`;
});
out += '};\n';

/* ---------- 替换 c-quest.c 里的题库段 ---------- */
const FILE = path.join(ROOT, 'c-quest.c');
let src = fs.readFileSync(FILE, 'utf8');

// 用"题库区段起始注释"定位；这个标题在第一次生成后就会变化，所以用宽松匹配
const BEGIN = '/* =============================================================\n *  题库';
const END = '#define CHAPTER_COUNT ((int)(sizeof(CHAPTERS) / sizeof(CHAPTERS[0])))';

const b = src.indexOf(BEGIN);
const e = src.indexOf(END);
if (b < 0 || e < 0 || e < b) throw new Error('找不到题库区段标记');

src = src.slice(0, b) + out + '\n' + src.slice(e);

/* ---------- 同时生成实操题数据（终端版用） ---------- */
globalThis.HQ = [];
const handsPath = path.join(ROOT, 'hands-on.js');
if (fs.existsSync(handsPath)) {
  require(handsPath);
  const algoPath = path.join(ROOT, 'hands-on-algo.js');
  if (fs.existsSync(algoPath)) require(algoPath);
  const gamePath = path.join(ROOT, 'hands-on-game.js');
  if (fs.existsSync(gamePath)) require(gamePath);
  const HQ = globalThis.HQ || [];

  let h = '\n/* ---------- 实操题（由 build/gen-c-bank.js 自动生成） ---------- */\n';
  h += '#define HANDS_COUNT ' + HQ.length + '\n\n';

  h += 'typedef struct {\n';
  h += '    const char *title;\n';
  h += '    const char *ch;\n';
  h += '    const char *task;\n';
  h += '    const char *detail;\n';
  h += '    int         level;\n';
  h += '} HandMeta;\n\n';

  h += 'typedef struct {\n';
  h += '    const char *in;\n';
  h += '    const char *expect;\n';
  h += '} HandCase;\n\n';

  h += 'static const HandCase HANDS_CASES[' + HQ.length + '][4] = {\n';
  HQ.forEach((q) => {
    const cs = [];
    for (let i = 0; i < 4; i++) {
      const c = q.cases[i];
      if (c) cs.push('{ ' + cstr(c.in) + ', ' + cstr(c.expect) + ' }');
      else cs.push('{ "", "" }');
    }
    h += '    { ' + cs.join(', ') + ' },\n';
  });
  h += '};\n\n';

  h += 'static const int HANDS_CASE_N[' + HQ.length + '] = { ';
  h += HQ.map((q) => q.cases.length).join(', ');
  h += ' };\n\n';

  h += 'static const HandMeta HANDS[' + HQ.length + '] = {\n';
  HQ.forEach((q, i) => {
    const tail = i === HQ.length - 1 ? '\n' : ',\n';
    h += '    { ' + cstr(q.title) + ', ' + cstr(q.ch) + ',\n      ' +
         cstr(q.task) + ',\n      ' + cstr(q.detail || '') + ',\n      ' + q.level + ' }' + tail;
  });
  h += '};\n';

  h += '\n/* 每题的起手代码，运行时写到 practice.c */\n';
  h += 'static const char *HANDS_STARTER[' + HQ.length + '] = {\n';
  HQ.forEach((q, i) => {
    const tail = i === HQ.length - 1 ? '\n' : ',\n';
    h += '    ' + cstr(q.starter) + tail;
  });
  h += '};\n';

  h += '\n/* 参考解答 */\n';
  h += 'static const char *HANDS_SOLUTION[' + HQ.length + '] = {\n';
  HQ.forEach((q, i) => {
    const tail = i === HQ.length - 1 ? '\n' : ',\n';
    h += '    ' + cstr(q.solution) + tail;
  });
  h += '};\n';

  h += '\n/* 提示 */\n';
  h += 'static const char *HANDS_HINTS[' + HQ.length + '][3] = {\n';
  HQ.forEach((q, i) => {
    const hs = [];
    for (let k = 0; k < 3; k++) hs.push(cstr((q.hints || [])[k] || ''));
    const tail = i === HQ.length - 1 ? '\n' : ',\n';
    h += '    { ' + hs.join(', ') + ' }' + tail;
  });
  h += '};\n';

  // 先清掉上一次生成的实操段（从标记到章节表之间），保证可重复生成
  const anchor = '/* ---------- 章节表 ---------- */';
  const oldMark = '/* ---------- 实操题（由 build/gen-c-bank.js 自动生成） ---------- */';
  const oi = src.indexOf(oldMark);
  const ai = src.indexOf(anchor);
  if (ai < 0) throw new Error('找不到章节表锚点');
  if (oi >= 0 && oi < ai) {
    // 旧段从 oldMark 开始，到章节表之前结束
    src = src.slice(0, oi) + src.slice(ai);
  }

  const ai2 = src.indexOf(anchor);
  src = src.slice(0, ai2) + h + '\n' + src.slice(ai2);

  console.log('已生成实操数据：' + HQ.length + ' 道');
}

fs.writeFileSync(FILE, src, 'utf8');

console.log('已生成 ' + CQ.length + ' 个章节、' +
  CQ.reduce((s, c) => s + c.qs.length, 0) + ' 道题到 c-quest.c');
