#!/usr/bin/env node
/**
 * 01-text.cjs
 * 中文文案 → 模块索引
 *
 * 输入：03-源码还原/webcrack输出/app/*.js
 * 输出：03-源码还原/文案索引.md + .json
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const OUT_MD = path.join(ROOT, '03-源码还原', '文案索引.md');
const OUT_JSON = path.join(ROOT, '03-源码还原', '文案索引.json');

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js') && f !== 'deobfuscated.js');
const rows = [];

for (const f of files) {
  const p = path.join(SRC, f);
  let s;
  try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }
  if (!/[\u4e00-\u9fa5]/.test(s)) continue;

  const texts = new Set();
  const re = /["'`]([^"'`\n]{1,45})["'`]/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const v = m[1];
    if (/[\u4e00-\u9fa5]/.test(v)) texts.add(v.trim());
  }

  const cls = new Set();
  const clsRe = /staticClass:\s*"([^"]{1,50})"/g;
  let c;
  while ((c = clsRe.exec(s)) !== null) cls.add(c[1].split('__')[0].split(' ')[0]);

  const apis = new Set();
  const apiRe = /(?:getRequest|postRequest)\(\s*["']([^"']+)["']/g;
  while ((m = apiRe.exec(s)) !== null) apis.add(m[1]);

  const jsx = new Set();
  const jsxRe = /jsx(?:NoCheck)?\(\s*["']([^"']+)["']/g;
  while ((m = jsxRe.exec(s)) !== null) jsx.add(m[1]);

  rows.push({ file: f, size: fs.statSync(p).size, texts: [...texts], classes: [...cls], apis: [...apis], jsx: [...jsx] });
}

rows.sort((a, b) => b.texts.length - a.texts.length);

const rev = new Map();
for (const r of rows) for (const t of r.texts) {
  if (!rev.has(t)) rev.set(t, new Set());
  rev.get(t).add(r.file);
}

const md = ['# 中文文案 → 模块索引', ''];
md.push('> 用途：**搜中文 → 定位模块文件**');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');
md.push('含中文的模块 ' + rows.length + ' 个，唯一文案 ' + rev.size + ' 条。');
md.push('');
md.push('| 模块 | 大小 | 文案数 | 接口 | jsx |');
md.push('|---|---|---|---|---|');
for (const r of rows.slice(0, 50)) {
  md.push('| `' + r.file + '` | ' + (r.size / 1024).toFixed(0) + 'KB | ' + r.texts.length + ' | ' + (r.apis.length || '-') + ' | ' + (r.jsx.length || '-') + ' |');
}
md.push('');
md.push('## 反向索引');
md.push('');
for (const [t, set] of [...rev.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 400)) {
  md.push('- `' + t + '` → ' + [...set].map((x) => '`' + x + '`').join(', '));
}

fs.writeFileSync(OUT_MD, md.join('\n'), 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify({ modules: rows, reverse: Object.fromEntries([...rev].map(([k, v]) => [k, [...v]])) }, null, 2), 'utf8');

console.log('已生成文案索引（' + rows.length + ' 模块 / ' + rev.size + ' 条文案）');
