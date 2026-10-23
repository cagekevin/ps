#!/usr/bin/env node
/**
 * 07-styles.cjs
 * class -> CSS 规则映射
 *
 * 输入：扩展目录 panel/css/*.css
 * 输出：BUILD-SPEC/05-样式.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const CANDIDATES = [
  path.join(process.env.APPDATA, 'Adobe', 'CEP', 'extensions', 'com.local.psz.panel.v4', 'panel', 'css'),
  path.join(ROOT, '01-稳定版', 'V4-可编辑源码版', 'panel', 'css'),
];
const OUT = path.join(ROOT, 'BUILD-SPEC', '05-样式.md');

let cssDir = null;
for (const c of CANDIDATES) if (fs.existsSync(c)) { cssDir = c; break; }
if (!cssDir) { console.log('找不到 css 目录'); process.exit(1); }

const files = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
console.log('CSS 文件: ' + files.join(', '));

const rules = [];
for (const f of files) {
  const s = fs.readFileSync(path.join(cssDir, f), 'utf8');
  // 提取 .selector { body }
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2].trim();
    if (!sel.startsWith('.')) continue;
    if (!body) continue;
    rules.push({ sel, body, file: f });
  }
}
console.log('CSS 规则 ' + rules.length + ' 条');

// 按前缀分组
const groups = new Map();
for (const r of rules) {
  const first = r.sel.split(/[\s,>]/)[0].replace(/^\./, '');
  const key = first.split('__')[0].split('-')[0] || 'other';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const md = ['# 样式映射', '', '> 来源：`panel/css/`　规则数：' + rules.length, ''];
md.push('## 按功能域分组');
md.push('');
md.push('| 前缀 | 规则数 |');
md.push('|---|---|');
[...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30)
  .forEach(([k, l]) => md.push('| `' + k + '` | ' + l.length + ' |'));
md.push('');

// 每组前 40 条规则
for (const [k, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  md.push('## ' + k + '（' + list.length + ' 条）');
  md.push('');
  md.push('```css');
  for (const r of list.slice(0, 40)) {
    md.push(r.sel + ' { ' + r.body.slice(0, 200) + ' }');
  }
  md.push('```');
  md.push('');
}

fs.writeFileSync(OUT, md.join('\n'), 'utf8');
console.log('已生成 ' + OUT);
console.log('\n主要功能域:');
[...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10)
  .forEach(([k, l]) => console.log('  ' + k.padEnd(20) + l.length));
