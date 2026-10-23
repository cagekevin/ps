#!/usr/bin/env node
/**
 * 11-tree.cjs
 * 缺口 3：组件父子关系（组件树）
 *
 * 做法：
 *   1. 从路由表拿到 15 个页面组件（变量名）
 *   2. 解析每个组件的 components: {} 映射
 *   3. 追踪变量名 → 组件对象 → 组件名
 *   4. 构建树
 *
 * 输出：BUILD-SPEC/11-组件树.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const COMP = path.join(ROOT, '03-源码还原', '组件');
const MAP = path.join(ROOT, '03-源码还原', 'component-map.json');
const OUT = path.join(ROOT, 'BUILD-SPEC', '11-组件树.md');

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function matchBrace(s, i) {
  let d = 0, quote = null, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

// 1. 路由表：path -> component 变量名
const app = fs.readFileSync(path.join(SRC, '56d7.js'), 'utf8');
const routes = [];
const routeRe = /\{\s*path:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*component:\s*([A-Za-z_$][\w$]*)\s*\}/g;
let m;
while ((m = routeRe.exec(app)) !== null) {
  routes.push({ path: m[1], name: m[2], varName: m[3] });
}
console.log('路由 ' + routes.length + ' 条');

// 2. 变量名 -> 组件名 的映射
// 组件的典型形态：var XXX = { name: "...", components: {...}, data: ... }
// 或者 var XXX = Object(Y.a)(组件对象, render, ...) 的结果
const varToComp = new Map();
for (const c of map) {
  // 用 component-map 的精确 start 位置向前找 var XXX =
  const before = app.slice(Math.max(0, c.start - 500), c.start);
  const vm = /var\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(before);
  if (vm) {
    if (!varToComp.has(vm[1])) varToComp.set(vm[1], []);
    varToComp.get(vm[1]).push(c.name);
  }
  // 组件对象后面常有 var YYY = Object(...)(XXX, render, ...) —— 记录别名
  const after = app.slice(c.end, c.end + 400);
  const vm2 = /\}\s*;\s*var\s+([A-Za-z_$][\w$]*)\s*=\s*Object\(/.exec(after);
  if (vm2) {
    if (!varToComp.has(vm2[1])) varToComp.set(vm2[1], []);
    varToComp.get(vm2[1]).push(c.name);
  }
}

// 补：编译链 var mf = Object(Y.a)(pf, render, ...) ; var vf = mf.exports
const compiled = new Map();   // mf -> pf（组件对象变量）
const cre = /var\s+([A-Za-z_$][\w$]*)\s*=\s*Object\([^)]{0,40}\)\(([A-Za-z_$][\w$]*)\s*,/g;
let cm;
while ((cm = cre.exec(app)) !== null) compiled.set(cm[1], cm[2]);

const exported = new Map();   // vf -> mf
const ere = /var\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\.exports/g;
let em;
while ((em = ere.exec(app)) !== null) exported.set(em[1], em[2]);

// 别名链：var pf = ff;  →  pf -> ff
const alias = new Map();
const are = /var\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
let am;
while ((am = are.exec(app)) !== null) alias.set(am[1], am[2]);

function resolveAlias(v, depth = 0) {
  if (depth > 8) return v;
  const a = alias.get(v);
  return a ? resolveAlias(a, depth + 1) : v;
}

// 展开：vf -> mf -> pf -> (别名) -> 组件名
for (const [exp, mid] of exported) {
  const objVar = compiled.get(mid);
  if (!objVar) continue;
  const real = resolveAlias(objVar);
  const names = varToComp.get(real) || varToComp.get(objVar) || [];
  if (!names.length) continue;
  if (!varToComp.has(exp)) varToComp.set(exp, []);
  for (const n of names) {
    if (!varToComp.get(exp).includes(n)) varToComp.get(exp).push(n);
  }
}

console.log('变量映射 ' + varToComp.size + ' 条（含编译链展开）');

// 3. 每个组件的子组件
const children = new Map();
for (const c of map) {
  const body = fs.readFileSync(path.join(COMP, c.fileName), 'utf8');
  const mi = body.search(/components\s*:\s*\{/);
  if (mi < 0) continue;
  const b = body.indexOf('{', mi);
  const e = matchBrace(body, b);
  if (e < 0) continue;
  const blk = body.slice(b, e + 1);
  const pairs = [...blk.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$.]*)/g)];
  const subs = [];
  for (const [, tag, varRef] of pairs) {
    const base = varRef.split('.')[0];
    const targets = varToComp.get(base) || [];
    subs.push({ tag, varRef, targets });
  }
  if (subs.length) children.set(c.name, subs);
}

console.log('有子组件的 ' + children.size + ' 个');

// 4. 输出
const md = ['# 组件树', ''];
md.push('> 目的：重写时知道组件之间谁包含谁');
md.push('> 生成时间：' + new Date().toLocaleString('zh-CN'));
md.push('');

md.push('## 一、路由 → 页面组件');
md.push('');
md.push('| 路由 | 名称 | 组件变量 | 解析到的组件 |');
md.push('|---|---|---|---|');
for (const r of routes) {
  const targets = varToComp.get(r.varName) || [];
  md.push('| `' + r.path + '` | ' + r.name + ' | `' + r.varName + '` | ' + (targets.length ? targets.map((x) => '`' + x + '`').join(', ') : '⚠ 未解析') + ' |');
}
md.push('');

md.push('## 二、组件 → 子组件');
md.push('');
md.push('> 说明：`tag` 是模板里用的标签名，`变量` 是代码里的引用，`解析到` 是对应的组件名');
md.push('');

for (const [parent, subs] of [...children.entries()].sort((a, b) => b[1].length - a[1].length)) {
  md.push('### ' + parent + '（' + subs.length + ' 个子组件）');
  md.push('');
  md.push('| 标签 | 变量引用 | 解析到 |');
  md.push('|---|---|---|');
  for (const s of subs) {
    md.push('| `' + s.tag + '` | `' + s.varRef + '` | ' + (s.targets.length ? s.targets.map((x) => '`' + x + '`').join(', ') : '⚠') + ' |');
  }
  md.push('');
}

// 统计
const unresolved = [...children.values()].flat().filter((s) => !s.targets.length).length;
const totalSubs = [...children.values()].flat().length;

md.push('## 三、统计');
md.push('');
md.push('| 项 | 数量 |');
md.push('|---|---|');
md.push('| 路由 | ' + routes.length + ' |');
md.push('| 组件总数 | ' + map.length + ' |');
md.push('| 有子组件的 | ' + children.size + ' |');
md.push('| 子组件引用总数 | ' + totalSubs + ' |');
md.push('| 已解析 | ' + (totalSubs - unresolved) + ' |');
md.push('| 未解析 | ' + unresolved + ' |');

fs.writeFileSync(OUT, md.join('\n'), 'utf8');

console.log('已生成 ' + OUT);
console.log('\n=== 统计 ===');
console.log('  路由: ' + routes.length);
console.log('  组件: ' + map.length);
console.log('  有子组件: ' + children.size);
console.log('  子组件引用: ' + totalSubs + '（已解析 ' + (totalSubs - unresolved) + '，未解析 ' + unresolved + '）');

// 打印路由解析结果
console.log('\n路由解析:');
for (const r of routes) {
  const t = varToComp.get(r.varName) || [];
  console.log('  ' + r.path.padEnd(22) + r.varName.padEnd(8) + (t.length ? t.join(',') : '⚠未解析'));
}
