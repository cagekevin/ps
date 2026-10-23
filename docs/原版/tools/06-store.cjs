#!/usr/bin/env node
/**
 * 06-store.cjs  v2
 * Vuex store 完整拆解：state / mutations / actions / getters / modules
 *
 * 定位方式：new X.Store({ ... })
 * 输出：BUILD-SPEC/04-store.md（含每个字段、每个 mutation/action 的完整实现）
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', 'webcrack输出', 'app');
const OUT = path.join(ROOT, 'BUILD-SPEC', '04-store.md');

function matchBrace(s, i) {
  let d = 0, quote = null, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/') {
      const prev = k > 0 ? s[k - 1] : '';
      if (!/[A-Za-z0-9_$)\]]/.test(prev)) {
        let j = k + 1, closed = false;
        while (j < s.length) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === '\n') break;
          if (s[j] === '/') { closed = true; break; }
          j++;
        }
        if (closed) { k = j; continue; }
      }
    }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

function topKeys(block) {
  const keys = [];
  let d = 0, quote = null, esc = false, buf = '';
  for (let i = 1; i < block.length - 1; i++) {
    const c = block[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    if (d === 0) {
      if (c === ':') {
        const k = buf.trim().replace(/^["']|["']$/g, '');
        if (/^[A-Za-z_$][\w$]*$/.test(k)) keys.push(k);
        buf = '';
      } else if (c === ',') buf = '';
      else buf += c;
    }
  }
  return keys;
}

// 从块里切出每个 key 的值
function splitEntries(block) {
  const out = [];
  let d = 0, quote = null, esc = false;
  let keyStart = -1, valStart = -1, curKey = null;
  for (let i = 1; i < block.length - 1; i++) {
    const c = block[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    if (d === 0 && c === ':' && curKey === null) {
      curKey = block.slice(keyStart, i).trim().replace(/^["']|["']$/g, '');
      valStart = i + 1;
    }
    if (d === 0 && c === ',') {
      if (curKey) {
        out.push({ key: curKey, value: block.slice(valStart, i).trim() });
      }
      curKey = null; keyStart = i + 1; valStart = -1;
    }
  }
  if (curKey) out.push({ key: curKey, value: block.slice(valStart, block.length - 1).trim() });
  return out;
}

const md = ['# Vuex Store', '', '> 来源：webcrack 还原源码', '> 定位：`new X.Store({ ... })`', ''];
let found = false;

for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js') && x !== 'deobfuscated.js')) {
  const p = path.join(SRC, f);
  let s;
  try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }

  const m = /new\s+[A-Za-z_$][\w$]*\.a\.Store\s*\(\s*\{/.exec(s);
  if (!m) continue;

  const b = s.indexOf('{', m.index + m[0].length - 1);
  const e = matchBrace(s, b);
  if (e < 0) continue;
  const storeBlock = s.slice(b, e + 1);
  found = true;

  md.push('## 位置');
  md.push('');
  md.push('`' + f + '` 第 ' + s.slice(0, m.index).split('\n').length + ' 行');
  md.push('');

  for (const field of ['state', 'getters', 'mutations', 'actions', 'modules']) {
    const re = new RegExp('(?:^|[\\s,{])' + field + '\\s*:\\s*\\{');
    const fm = re.exec(storeBlock);
    if (!fm) continue;
    const fb = storeBlock.indexOf('{', fm.index + fm[0].length - 1);
    const fe = matchBrace(storeBlock, fb);
    if (fe < 0) continue;
    const block = storeBlock.slice(fb, fe + 1);
    const keys = topKeys(block);
    if (!keys.length) continue;

    md.push('## ' + field + '（' + keys.length + '）');
    md.push('');

    if (field === 'state') {
      // state 给字段名 + 初值
      md.push('| 字段 | 初值 |');
      md.push('|---|---|');
      for (const ent of splitEntries(block)) {
        const v = ent.value.replace(/\s+/g, ' ').slice(0, 60);
        md.push('| `' + ent.key + '` | `' + v + '` |');
      }
      md.push('');
    } else {
      // mutations / actions / getters 给完整实现
      md.push('方法：' + keys.map((k) => '`' + k + '`').join('、'));
      md.push('');
      for (const ent of splitEntries(block)) {
        md.push('### `' + ent.key + '`');
        md.push('');
        md.push('```js');
        md.push(ent.value);
        md.push('```');
        md.push('');
      }
    }
  }
}

if (!found) md.push('未找到 Vuex store 定义');

fs.writeFileSync(OUT, md.join('\n'), 'utf8');
console.log('已生成 ' + OUT);
console.log('文件大小: ' + (fs.statSync(OUT).size / 1024).toFixed(1) + 'KB');
