#!/usr/bin/env node
/**
 * 05-flows.cjs
 * 交互链路：每个方法调了什么（内部方法 / 接口 / jsx / store）
 *
 * 输入：03-源码还原/组件/*.js
 * 输出：BUILD-SPEC/03-交互链路/<组件>.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', '组件');
const MAP = path.join(ROOT, '03-源码还原', 'component-map.json');
const OUT = path.join(ROOT, 'BUILD-SPEC', '03-交互链路');
fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function matchBrace(s, i) {
  let d = 0, inStr = false, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

// 从 methods 块里切出每个方法
function parseMethods(methodsBlock) {
  const out = [];
  if (!methodsBlock) return out;
  const re = /(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*function\s*\(([^)]*)\)\s*/g;
  let m;
  while ((m = re.exec(methodsBlock)) !== null) {
    const name = m[1];
    const b = methodsBlock.indexOf('{', m.index + m[0].length - 1);
    if (b < 0) continue;
    const e = matchBrace(methodsBlock, b);
    if (e < 0) continue;
    out.push({ name, body: methodsBlock.slice(b, e + 1) });
  }
  // 箭头函数形式
  const re2 = /(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*/g;
  while ((m = re2.exec(methodsBlock)) !== null) {
    if (out.some((x) => x.name === m[1])) continue;
    const b = methodsBlock.indexOf('{', m.index + m[0].length - 1);
    if (b < 0) continue;
    const e = matchBrace(methodsBlock, b);
    if (e < 0) continue;
    out.push({ name: m[1], body: methodsBlock.slice(b, e + 1) });
  }
  return out;
}

let count = 0;
for (const c of map) {
  const f = path.join(SRC, c.fileName);
  if (!fs.existsSync(f)) continue;
  const body = fs.readFileSync(f, 'utf8');

  // methods 块
  const mi = body.search(/methods\s*:\s*\{/);
  let methodsBlock = null;
  if (mi >= 0) {
    const b = body.indexOf('{', mi);
    const e = matchBrace(body, b);
    if (e > 0) methodsBlock = body.slice(b, e + 1);
  }
  const methods = parseMethods(methodsBlock);
  if (!methods.length) continue;

  const md = ['# ' + c.name + ' · 交互链路', ''];
  md.push('> 来源：`' + c.fileName + '`，共 ' + methods.length + ' 个方法');
  md.push('');

  for (const m of methods) {
    const apis = [...new Set((m.body.match(/(?:getRequest|postRequest)\(\s*["']([^"']+)["']/g) || [])
      .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
    const jsxs = [...new Set((m.body.match(/jsx(?:NoCheck)?\(\s*["']([^"']+)["']/g) || [])
      .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
    const calls = [...new Set((m.body.match(/this\.([A-Za-z_$][\w$]*)\s*\(/g) || [])
      .map((x) => x.slice(5, -1)).filter((x) => x !== m.name))];
    const store = [...new Set((m.body.match(/(?:dispatch|commit)\(\s*["']([^"']+)["']/g) || [])
      .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
    const emits = [...new Set((m.body.match(/\$emit\(\s*["']([^"']+)["']/g) || [])
      .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];

    if (!apis.length && !jsxs.length && !calls.length && !store.length && !emits.length) continue;

    md.push('## `' + m.name + '`');
    md.push('');
    if (apis.length) md.push('- **接口**：' + apis.map((x) => '`' + x + '`').join('、'));
    if (jsxs.length) md.push('- **PS 能力**：' + jsxs.map((x) => '`' + x + '`').join('、'));
    if (store.length) md.push('- **store**：' + store.map((x) => '`' + x + '`').join('、'));
    if (emits.length) md.push('- **emit**：' + emits.map((x) => '`' + x + '`').join('、'));
    if (calls.length) md.push('- **内部调用**：' + calls.slice(0, 12).map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (md.length > 4) {
    fs.writeFileSync(path.join(OUT, c.name + '.md'), md.join('\n'), 'utf8');
    count++;
  }
}

console.log('已生成 ' + count + ' 份交互链路 -> ' + OUT);
