#!/usr/bin/env node
/**
 * 04b-methods.cjs
 * 缺口 1：提取每个方法的【完整实现】
 *
 * 输入：03-源码还原/组件/*.js
 * 输出：BUILD-SPEC/02-组件/methods/<组件>.md
 *
 * 每份包含：方法名 + 完整代码
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const COMP = path.join(ROOT, '03-源码还原', '组件');
const MAP = path.join(ROOT, '03-源码还原', 'component-map.json');
const OUT = path.join(ROOT, 'BUILD-SPEC', '02-组件', 'methods');

fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function matchBrace(s, openIdx) {
  let d = 0, quote = null, esc = false;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/') {
      const prev = i > 0 ? s[i - 1] : '';
      if (!/[A-Za-z0-9_$)\]]/.test(prev)) {
        let k = i + 1, closed = false;
        while (k < s.length) {
          if (s[k] === '\\') { k += 2; continue; }
          if (s[k] === '\n') break;
          if (s[k] === '/') { closed = true; break; }
          k++;
        }
        if (closed) { i = k; continue; }
      }
    }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return i; }
  }
  return -1;
}

function findMethodsBlock(body) {
  const re = /(?:^|[\s,{])methods\s*:\s*\{/;
  const m = re.exec(body);
  if (!m) return null;
  const b = m.index + m[0].length - 1;
  if (body[b] !== '{') return null;
  const e = matchBrace(body, b);
  return e > 0 ? { start: b, end: e, block: body.slice(b, e + 1) } : null;
}

// 切出每个方法：name + 完整代码
function splitMethods(block) {
  const out = [];
  const re = /(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const name = m[1];
    const args = m[2];
    const b = block.indexOf('{', m.index + m[0].length - 1);
    if (b < 0) continue;
    const e = matchBrace(block, b);
    if (e < 0) continue;
    const code = block.slice(m.index + m[0].indexOf('function'), e + 1).replace(/^\s*/, '');
    out.push({ name, args, code, size: e - b });
    re.lastIndex = e + 1;
  }
  // 简写形式 name(...) { }
  const re2 = /(?:^|[\s,])([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  while ((m = re2.exec(block)) !== null) {
    const name = m[1];
    if (out.some((x) => x.name === name)) continue;
    if (/^(if|for|while|switch|catch|function|return|else|do|try|with)$/.test(name)) continue;
    const b = block.indexOf('{', m.index + m[0].length - 1);
    if (b < 0) continue;
    const e = matchBrace(block, b);
    if (e < 0) continue;
    out.push({ name, args: m[2], code: block.slice(m.index, e + 1).replace(/^\s*,\s*/, '').replace(/^\s*/, ''), size: e - b });
    re2.lastIndex = e + 1;
  }
  return out;
}

let done = 0;
const stats = [];

for (const c of map) {
  const p = path.join(COMP, c.fileName);
  if (!fs.existsSync(p)) continue;
  const body = fs.readFileSync(p, 'utf8');

  const mb = findMethodsBlock(body);
  if (!mb) continue;

  const methods = splitMethods(mb.block);
  if (!methods.length) continue;

  const md = ['# ' + c.name + ' · 方法实现', ''];
  md.push('> 来源：`' + c.fileName + '`');
  md.push('> 方法数：' + methods.length);
  md.push('');

  for (const m of methods) {
    md.push('## `' + m.name + '`');
    md.push('');
    if (m.args) md.push('参数：`' + m.args + '`');
    md.push('');
    md.push('```js');
    md.push(m.code);
    md.push('```');
    md.push('');
  }

  fs.writeFileSync(path.join(OUT, c.name + '.md'), md.join('\n'), 'utf8');
  done++;
  stats.push({ name: c.name, count: methods.length, size: md.join('\n').length });
}

console.log('已生成 ' + done + ' 份方法实现 -> ' + OUT);
console.log('\n方法最多的 10 个组件:');
stats.sort((a, b) => b.count - a.count).slice(0, 10)
  .forEach((x) => console.log('  ' + x.name.padEnd(26) + x.count + ' 个方法  ' + (x.size / 1024).toFixed(1) + 'KB'));
