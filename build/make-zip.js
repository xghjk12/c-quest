/* 打包 dist/ 成 zip，确保内部路径用正斜杠（跨平台兼容）
   自己实现 zip 写入，避免 tar/powershell 的路径问题。
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'C-Quest.zip');

/* ---------- 收集文件 ---------- */
const entries = [];
(function walk(dir, base) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) walk(full, rel);
    else entries.push({ full, rel, stat: fs.statSync(full) });
  }
})(DIST, '');

console.log('收集到 ' + entries.length + ' 个文件');

/* ---------- 极简 ZIP 写入器 ---------- */
function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function dosTime(d) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

const chunks = [];
const central = [];
let offset = 0;

for (const e of entries) {
  const data = fs.readFileSync(e.full);
  const nameBuf = Buffer.from(e.rel, 'utf8');
  const crc = crc32(data);
  const { time, date } = dosTime(e.stat.mtime);

  /*
    压缩策略：.gz / .wasm / .tar 已经压缩过，用 store(0)；
    文本文件用 deflate(8)。
  */
  const alreadyCompressed = /\.(gz|wasm|tar|zip|png|jpg|jpeg|webp)$/i.test(e.rel);
  let compData, method;

  if (alreadyCompressed) {
    compData = data;
    method = 0;
  } else {
    const deflated = zlib.deflateRawSync(data, { level: 6 });
    // 如果压缩后反而更大，也存原始
    if (deflated.length < data.length) {
      compData = deflated;
      method = 8;
    } else {
      compData = data;
      method = 0;
    }
  }

  /* ---- 本地文件头 ---- */
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);   // signature
  local.writeUInt16LE(20, 4);            // version needed
  local.writeUInt16LE(0x0800, 6);        // flags: UTF-8 文件名
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compData.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);            // extra len

  chunks.push(local, nameBuf, compData);

  /* ---- 中央目录项 ---- */
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(20, 4);              // version made by
  cen.writeUInt16LE(20, 6);              // version needed
  cen.writeUInt16LE(0x0800, 8);          // flags: UTF-8
  cen.writeUInt16LE(method, 10);
  cen.writeUInt16LE(time, 12);
  cen.writeUInt16LE(date, 14);
  cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(compData.length, 20);
  cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(nameBuf.length, 28);
  cen.writeUInt16LE(0, 30);              // extra
  cen.writeUInt16LE(0, 32);              // comment
  cen.writeUInt16LE(0, 34);              // disk
  cen.writeUInt16LE(0, 36);              // internal attr
  cen.writeUInt32LE(0, 38);              // external attr
  cen.writeUInt32LE(offset, 42);         // local header offset

  central.push(Buffer.concat([cen, nameBuf]));

  offset += local.length + nameBuf.length + compData.length;
}

const centralBuf = Buffer.concat(central);

/* ---- 中央目录结束记录 ---- */
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const zip = Buffer.concat([...chunks, centralBuf, end]);
fs.writeFileSync(OUT, zip);

console.log('\n打包完成');
console.log('  文件数: ' + entries.length);
console.log('  压缩后: ' + (zip.length / 1024 / 1024).toFixed(1) + ' MB');
console.log('  输出:   ' + OUT);
