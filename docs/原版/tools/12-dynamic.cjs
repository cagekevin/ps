#!/usr/bin/env node
/**
 * 12-dynamic.cjs
 * 缺口 4：识别静态分析抓不到的动态逻辑
 *
 * 扫描：
 *   - :is / is: 动态组件
 *   - eval(...)
 *   - new Function(...)
 *   - 动态 require(...)
 *   - $options.xxx
 *   - window[...] 动态属性
 *
 * 输出：BUILD-SPEC/10-动态逻辑.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const COMP = path.join(ROOT, '03-源码还原', '组件');
const OUT = path.join(ROOT, 'BUILD-SPEC', '10-动态逻辑.md');

const PATTERNS = [
  { name: '动态组件 (:is / is:)', re: /(?:attrs:\s*\{[^}]*is:\s*[A-Za-z_$])|(:is=|v-bind:is)/g },
  { name: 'eval 求值', re: /\beval\s*\(/g },
  { name: 'new Function', re: /new\s+Function\s*\(/g },
  { name: '动态 require', re: /require\s*\(\s*[^"'`)]/g },
  { name: '$options 访问', re: /\$options\.([A-Za-z_$][\w$]*)/g },
  { name: 'window 动态属性', re: /window\s*\[\s*[^\]"']+\]/g },
  { name: 'setTimeout 字符串', re: /setTimeout\s*\(\s*["'`]/g },
  { name: '动态组件名', re: /_self\._c\(\s*[A-Za-z_$][\w$]*\s*,/g },
];

const findings = [];

function scan(dir, label) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f === 'deobfuscated.js') continue;
    const p = path.join(dir, f);
    let s;
    try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }

    for (const pat of PATTERNS) {
      pat.re.lastIndex = 0;
      let m;
      let count = 0;
      const samples = [];
      while ((m = pat.re.exec(s)) !== null) {
        count++;
        if (samples.length < 3) {
          const line = s.slice(0, m.index).split('\n').length;
          samples.push({ line, text: s.slice(m.index, m.index + 100).replace(/\s+/g, ' ') });
        }
        if (count > 200) break;
      }
      if (count > 0) {
        findings.push({ type: pat.name, file: f, label, count, samples });
      }
    }
  }
}

scan(SRC, 'webcrack输出');
scan(COMP, '组件');

// 按类型汇总
const byType = new Map();
for (const f of findings) {
  if (!byType.has(f.type)) byType.set(f.type, []);
  byType.get(f.type).push(f);
}

const md = ['# 动态逻辑（静态分析盲区）', ''];
md.push('> 目的：列出**静态提取抓不到**的代码，这些地方重写时必须人工看源码');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');

md.push('## 为什么这些是盲区');
md.push('');
md.push('| 类型 | 为什么抓不到 | 重写时怎么办 |');
md.push('|---|---|---|');
md.push('| 动态组件 `:is` | 组件名是变量，运行时才确定 | 看源码判断有哪些分支 |');
md.push('| `eval` / `new Function` | 代码是运行时字符串 | 人工读，或保留原样 |');
md.push('| 动态 `require` | 路径是变量 | 找出所有可能的取值 |');
md.push('| `$options` | 反射访问组件选项 | 改成显式引用 |');
md.push('| `window[...]` | 动态属性名 | 改成显式变量 |');
md.push('');

for (const [type, list] of [...byType.entries()].sort((a, b) => {
  const sa = a[1].reduce((x, y) => x + y.count, 0);
  const sb = b[1].reduce((x, y) => x + y.count, 0);
  return sb - sa;
})) {
  const total = list.reduce((x, y) => x + y.count, 0);
  md.push('## ' + type + '（' + total + ' 处）');
  md.push('');
  md.push('| 文件 | 次数 | 样例 |');
  md.push('|---|---|---|');
  for (const f of list.sort((a, b) => b.count - a.count).slice(0, 15)) {
    const s = f.samples[0];
    md.push('| `' + f.file + '` | ' + f.count + ' | ' + (s ? '`L' + s.line + ': ' + s.text.slice(0, 70) + '`' : '-') + ' |');
  }
  md.push('');
}

md.push('## 汇总');
md.push('');
md.push('| 类型 | 总处数 | 涉及文件 |');
md.push('|---|---|---|');
for (const [type, list] of byType) {
  const total = list.reduce((x, y) => x + y.count, 0);
  md.push('| ' + type + ' | ' + total + ' | ' + list.length + ' |');
}

fs.writeFileSync(OUT, md.join('\n'), 'utf8');

console.log('已生成 ' + OUT);
console.log('\n=== 动态逻辑统计 ===');
for (const [type, list] of [...byType.entries()].sort((a, b) => {
  const sa = a[1].reduce((x, y) => x + y.count, 0);
  const sb = b[1].reduce((x, y) => x + y.count, 0);
  return sb - sa;
})) {
  const total = list.reduce((x, y) => x + y.count, 0);
  console.log('  ' + type.padEnd(24) + String(total).padStart(4) + ' 处  ' + list.length + ' 个文件');
}
