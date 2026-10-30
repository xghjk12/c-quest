/* 自由写代码的样式 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'style.css');

const css = `

/* ═══════════════════════════════════════════════
   自由写代码（Playground）
   ═══════════════════════════════════════════════ */

.playground-stdin {
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, .03);
  overflow: hidden;
}

.ps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 14px;
  background: rgba(255, 255, 255, .035);
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  color: var(--dim-2);
  font-family: var(--mono);
}

#playground-stdin {
  width: 100%;
  min-height: 68px;
  max-height: 160px;
  background: #070b13;
  border: 0;
  outline: 0;
  resize: vertical;
  color: #b9c8e0;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  padding: 10px 14px;
  display: block;
}
#playground-stdin::placeholder { color: #3d4a63; }
`;

fs.appendFileSync(FILE, css, 'utf8');
console.log('CSS 已追加');
