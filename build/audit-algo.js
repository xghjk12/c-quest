/* ===========================================================
   算法题对拍器（differential testing）

   算法题最怕的不是"样例错"，而是"边界没考虑到"：
     - 全负数
     - 已经有序 / 完全逆序
     - 只有一个元素
     - 有重复值
     - 极大的数（溢出）

   做法：每道题额外写了一个"暴力解法"（brutal），
   用随机数据同时喂给参考解答和暴力解，输出必须一致。
   暴力解不追求快，只追求"一眼能看出是对的"。

   用法: node build/audit-algo.js [轮数]
   =========================================================== */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TCC = path.join(ROOT, 'tools', 'tcc', 'tcc.exe');
const ROUNDS = Number(process.argv[2] || 60);

globalThis.HQ = [];
require(path.join(ROOT, 'hands-on.js'));
require(path.join(ROOT, 'hands-on-algo.js'));
const HQ = globalThis.HQ;

/* ---------- 确定性随机（跑两次结果一样，方便复现）---------- */
let seed = 20261030;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function ri(a, b) {                       // 闭区间 [a, b]
  return a + Math.floor(rnd() * (b - a + 1));
}

/* ---------- 数据生成器 ---------- */
const GEN = {
  // 两个小整数 [-10,10] 和 [0,30]：用于快速幂
  base() {
    return ri(-10, 10) + ' ' + ri(0, 30) + '\n';
  },
  // 随机数组，带重复、可能全负
  array() {
    const n = ri(1, 12);
    const vs = [];
    for (let i = 0; i < n; i++) vs.push(ri(-20, 20));
    return n + '\n' + vs.join(' ') + '\n';
  },
  // 有序数组 + 目标值（目标可能不在数组里）
  sorted() {
    const n = ri(1, 10);
    const vs = [];
    let cur = ri(-10, 0);
    for (let i = 0; i < n; i++) { vs.push(cur); cur += ri(1, 3); }
    const t = rnd() < 0.6 ? vs[ri(0, n - 1)] : ri(-20, 30);
    return n + ' ' + t + '\n' + vs.join(' ') + '\n';
  },
  // 平方根：覆盖 0、1、完全平方数、大数
  sqrt() {
    const r = rnd();
    if (r < 0.2) return '0\n';
    if (r < 0.4) return ri(1, 100) + '\n';
    if (r < 0.6) { const k = ri(1, 1000); return (k * k) + '\n'; }
    if (r < 0.8) { const k = ri(1, 1000); return (k * k + ri(1, 2 * k)) + '\n'; }
    return ri(1, 2000000000) + '\n';
  },
  // 爬楼梯：1~20（小，暴力递归扛得住）
  smalln() {
    return ri(1, 20) + '\n';
  },
  // 带符号数组，用于最大子段和
  signed() {
    const n = ri(1, 10);
    const vs = [];
    for (let i = 0; i < n; i++) vs.push(ri(-10, 10));
    return n + '\n' + vs.join(' ') + '\n';
  },
  // 0-1 背包：物品少一点，暴力枚举 2^12
  knapsack() {
    const n = ri(1, 8);
    const W = ri(1, 20);
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(ri(1, 10) + ' ' + ri(1, 30));
    return n + ' ' + W + '\n' + lines.join('\n') + '\n';
  },
  // 两数之和：有序数组（可能有解也可能无解）
  twosum() {
    const n = ri(2, 10);
    const vs = [];
    let cur = ri(-10, 0);
    for (let i = 0; i < n; i++) { vs.push(cur); cur += ri(1, 4); }
    const hit = rnd() < 0.6;
    let t;
    if (hit) {
      const i = ri(0, n - 1);
      let j = ri(0, n - 1);
      if (i === j) j = (j + 1) % n;
      t = vs[i] + vs[j];
    } else {
      t = ri(100, 200);
    }
    return n + ' ' + t + '\n' + vs.join(' ') + '\n';
  },
  // 无符号数，含 0、1、全 1、高位
  unsigned() {
    const r = rnd();
    if (r < 0.2) return '0\n';
    if (r < 0.4) return ri(1, 1000) + '\n';
    if (r < 0.6) return '2147483647\n';
    if (r < 0.8) return (1 << ri(0, 30)) + '\n';
    return ri(0, 2147483647) + '\n';
  }
};

/* ---------- 编译一次，反复运行 ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cquest-diff-'));
function build(code, tag) {
  const dir = path.join(tmp, tag);
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, 'main.c');
  const exe = path.join(dir, 'main.exe');
  fs.writeFileSync(src, code, 'utf8');
  execFileSync(TCC, ['-o', exe, src], { stdio: 'pipe', cwd: dir });
  return { dir, exe };
}
function run(bin, input) {
  return execFileSync(bin.exe, [], {
    input, encoding: 'utf8', stdio: 'pipe', cwd: bin.dir, timeout: 10000
  }).replace(/\r\n/g, '\n');
}

const norm = (s) => String(s || '').replace(/\r\n/g, '\n').replace(/\s+$/, '');

let tested = 0;
let bad = 0;
const failures = [];

for (const q of HQ) {
  if (!q.brutal || !q.fuzz) continue;
  const gen = GEN[q.fuzz.gen];
  if (!gen) {
    console.log('[跳过] ' + q.id + ' 的数据生成器 ' + q.fuzz.gen + ' 不存在');
    continue;
  }

  let sol, bru;
  try {
    sol = build(q.solution, q.id + '_sol');
    bru = build(q.brutal, q.id + '_bru');
  } catch (e) {
    console.log('[编译失败] ' + q.id + ' ' + q.title);
    console.log('   ' + (e.stderr || e.message || '').toString().slice(0, 300));
    bad++;
    continue;
  }

  let ok = true;
  for (let r = 0; r < ROUNDS; r++) {
    const input = gen();
    let a, b;
    try {
      a = norm(run(sol, input));
    } catch (e) {
      failures.push({ id: q.id, title: q.title, input, kind: '参考解答运行失败', detail: String(e.message || e) });
      ok = false;
      break;
    }
    try {
      b = norm(run(bru, input));
    } catch (e) {
      failures.push({ id: q.id, title: q.title, input, kind: '暴力解运行失败', detail: String(e.message || e) });
      ok = false;
      break;
    }
    tested++;
    if (a !== b) {
      failures.push({
        id: q.id, title: q.title, input, kind: '输出不一致',
        detail: '参考=' + JSON.stringify(a) + '  暴力=' + JSON.stringify(b)
      });
      ok = false;
      break;
    }
  }

  if (ok) {
    console.log('  [OK] ' + q.id.padEnd(4) + q.title + '  (' + ROUNDS + ' 轮随机)');
  } else {
    bad++;
    console.log('  [X]  ' + q.id.padEnd(4) + q.title);
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n对拍：' + tested + ' 次比较，' + bad + ' 道题有问题');

if (failures.length === 0) {
  console.log('✅ 所有带对拍数据的算法题，参考解答与暴力解在随机数据上完全一致');
  process.exit(0);
}

console.log('\n❌ 发现不一致：\n');
for (const f of failures) {
  console.log('  ' + f.id + ' 「' + f.title + '」 ' + f.kind);
  console.log('     输入: ' + JSON.stringify(f.input));
  console.log('     ' + f.detail + '\n');
}
process.exit(1);
