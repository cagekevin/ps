#!/usr/bin/env node
/**
 * 99-build-spec.cjs
 * 收敛：生成 BUILD-SPEC 总览 + 自检
 *
 * 输入：BUILD-SPEC/ 下各产物
 * 输出：BUILD-SPEC/00-总览.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SPEC = path.join(ROOT, 'BUILD-SPEC');

function count(dir) {
  if (!fs.existsSync(dir)) return { files: 0, size: 0 };
  let files = 0, size = 0;
  const walk = (d) => {
    for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) walk(p);
      else { files++; size += fs.statSync(p).size; }
    }
  };
  walk(dir);
  return { files, size };
}

const sections = [
  ['02-组件', '组件规格（一组件一文件，含完整源码）'],
  ['03-交互链路', '方法 → 接口/jsx/store 调用链'],
];

const md = [];
md.push('# BUILD-SPEC · 总览');
md.push('');
md.push('> 由 `10-逆向流水线` 自动生成，**禁止手改**');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');

md.push('## 一、这份规格是什么');
md.push('');
md.push('原始产物是一个 1.5MB 的压缩 webpack bundle。经过脚本流水线，拆成了「AI 可以照着写新源码」的规格。');
md.push('');
md.push('**能用它做什么**：让 AI 按组件、按方法、按调用关系，用 TypeScript 重写一份干净实现。');
md.push('');
md.push('**它不包含什么**：');
md.push('');
md.push('- jsxbin 的函数体（PS 侧能力，黑盒，只给了调用形态）');
md.push('- 变量语义名（minify 时被删除，无法恢复）');
md.push('');

md.push('## 二、产物清单');
md.push('');
md.push('| 部分 | 内容 | 文件数 | 体积 |');
md.push('|---|---|---|---|');

const fixed = [
  ['04-store.md', 'Vuex state/mutations/actions'],
  ['05-样式.md', 'CSS class → 规则'],
  ['06-jsx契约.md', 'PS 函数调用形态'],
];
for (const [d, desc] of sections) {
  const p = path.join(SPEC, d);
  const c = count(p);
  md.push('| `' + d + '/` | ' + desc + ' | ' + c.files + ' | ' + (c.size / 1024).toFixed(0) + ' KB |');
}
for (const [f, desc] of fixed) {
  const p = path.join(SPEC, f);
  if (fs.existsSync(p)) md.push('| `' + f + '` | ' + desc + ' | 1 | ' + (fs.statSync(p).size / 1024).toFixed(0) + ' KB |');
}
md.push('');

md.push('## 三、组件索引');
md.push('');
const compDir = path.join(SPEC, '02-组件');
if (fs.existsSync(compDir)) {
  const files = fs.readdirSync(compDir).filter((f) => f.endsWith('.md'));
  md.push('共 ' + files.length + ' 个组件。按大小排序：');
  md.push('');
  md.push('| 组件 | 规格 |');
  md.push('|---|---|');
  files.map((f) => ({ f, s: fs.statSync(path.join(compDir, f)).size }))
    .sort((a, b) => b.s - a.s)
    .forEach((x) => md.push('| `' + x.f.replace(/\.md$/, '') + '` | ' + (x.s / 1024).toFixed(0) + ' KB |'));
}
md.push('');

md.push('## 四、怎么用它写 TS');
md.push('');
md.push('以某个页面为例：');
md.push('');
md.push('```');
md.push('1. 打开 02-组件/<组件名>.md');
md.push('   → 看 methods 清单、jsx 调用、文案、完整源码');
md.push('2. 打开 03-交互链路/<组件名>.md');
md.push('   → 看每个方法调了什么接口、什么 PS 功能');
md.push('3. 打开 06-jsx契约.md');
md.push('   → 确认 PS 函数的调用形态');
md.push('4. 打开 05-样式.md');
md.push('   → 找到对应 class 的样式规则');
md.push('5. 让 AI 按以上信息写 TS 实现');
md.push('```');
md.push('');

md.push('## 五、自检');
md.push('');
const checks = [
  ['组件规格', count(path.join(SPEC, '02-组件'))],
  ['交互链路', count(path.join(SPEC, '03-交互链路'))],
  ['store', fs.existsSync(path.join(SPEC, '04-store.md')) ? 1 : 0],
  ['样式', fs.existsSync(path.join(SPEC, '05-样式.md')) ? 1 : 0],
  ['jsx契约', fs.existsSync(path.join(SPEC, '06-jsx契约.md')) ? 1 : 0],
];
for (const [name, c] of checks) {
  const ok = typeof c === 'object' ? c.files > 0 : c > 0;
  md.push('- ' + (ok ? '✅' : '❌') + ' ' + name + (typeof c === 'object' ? '：' + c.files + ' 个文件' : ''));
}
md.push('');

fs.mkdirSync(SPEC, { recursive: true });
fs.writeFileSync(path.join(SPEC, '00-总览.md'), md.join('\n'), 'utf8');

console.log('已生成 BUILD-SPEC/00-总览.md');
const total = count(SPEC);
console.log('BUILD-SPEC 共 ' + total.files + ' 文件  ' + (total.size / 1048576).toFixed(2) + 'MB');
