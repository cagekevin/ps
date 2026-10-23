#!/usr/bin/env node
/**
 * 04-spec.cjs
 * 为每个组件生成「AI 可照写的规格文档」
 *
 * 输入：03-源码还原/组件/*.js + component-map.json
 * 输出：BUILD-SPEC/02-组件/<name>.md
 *
 * 规格内容：基本信息 / data / computed / methods / 子组件 / 接口 / jsx / 文案 / class / 完整源码
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const SRC = path.join(ROOT, '03-源码还原', '组件');
const MAP = path.join(ROOT, '03-源码还原', 'component-map.json');
const OUT = path.join(ROOT, 'BUILD-SPEC', '02-组件');

fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function matchBrace(s, openIdx) {
  let d = 0, quote = null, esc = false;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    // 正则字面量：/ 前面不是标识符/右括号，则认为是正则开始，跳到收尾的 /
    if (c === '/') {
      const prev = i > 0 ? s[i - 1] : '';
      if (!/[A-Za-z0-9_$)\]]/.test(prev)) {
        let k = i + 1;
        let closed = false;
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

// 提取对象块字段的顶层 key
function topKeys(block) {
  const keys = [];
  let d = 0, inStr = false, esc = false;
  let lastWasComma = true;
  let buf = '';
  for (let i = 1; i < block.length - 1; i++) {
    const c = block[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    if (d === 0) {
      if (c === ':') {
        const k = buf.trim().replace(/^["']|["']$/g, '');
        if (/^[A-Za-z_$][\w$]*$/.test(k)) keys.push(k);
        buf = '';
      } else if (c === ',') {
        buf = '';
      } else {
        buf += c;
      }
    }
  }
  return keys;
}

// 解析 methods 块里的方法名，支持三种写法
function parseMethodNames(block) {
  const names = new Set();
  // foo: function(...)
  for (const m of block.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\s*\(/g)) names.add(m[1]);
  // foo: (...) => / foo: x => 
  for (const m of block.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)) names.add(m[1]);
  // foo(...) {  ← ES6 简写（排除控制语句）
  const CTRL = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'else', 'do', 'try', 'with']);
  for (const m of block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)) {
    if (!CTRL.has(m[1])) names.add(m[1]);
  }
  return [...names];
}

// 提取字段块（如 data / computed / methods）
function fieldBlock(body, field) {
  const re = new RegExp('(?:^|[\\s,{])' + field + '\\s*:\\s*(\\{|function)');
  const m = re.exec(body);
  if (!m) return null;
  // m[0] 的最后是 '{' 或 'function'，这里要精确定位到那个 '{'
  let i = m.index + m[0].length - 1;
  // 修正：如果 m[0] 末尾是 '{'，i 就指向它；否则找 function 后面的 {
  if (body[i] === 'f') {
    // function() { ... }
    const b = body.indexOf('{', i);
    if (b < 0) return null;
    const e = matchBrace(body, b);
    return e > 0 ? body.slice(b, e + 1) : null;
  }
  const e = matchBrace(body, i);
  return e > 0 ? body.slice(i, e + 1) : null;
}

let done = 0;
for (const c of map) {
  try {
  const srcFile = path.join(SRC, c.fileName);
  if (!fs.existsSync(srcFile)) { console.log('  跳过（文件不存在）: ' + c.fileName); continue; }
  const body = fs.readFileSync(srcFile, 'utf8');

  const dataBlock = fieldBlock(body, 'data');
  const dataKeys = dataBlock ? topKeys(dataBlock) : [];
  const compBlock = fieldBlock(body, 'computed');
  const compKeys = compBlock ? topKeys(compBlock) : [];
  const methBlock = fieldBlock(body, 'methods');
  // 只信 methods 块（块内配平正确，不会串到 data/computed）
  const methKeys = methBlock ? parseMethodNames(methBlock) : [];
  const propsBlock = fieldBlock(body, 'props');
  const propKeys = propsBlock ? topKeys(propsBlock) : [];
  const compsBlock = fieldBlock(body, 'components');
  const subComps = compsBlock ? topKeys(compsBlock) : [];

  // 接口 / jsx / 文案 / class
  const apiSet = new Set();
  for (const x of body.match(/(?:getRequest|postRequest|putRequest|deleteRequest)\(\s*["']([^"']+)["']/g) || []) {
    const m = x.match(/["']([^"']+)["']/); if (m) apiSet.add(m[1]);
  }
  for (const x of body.match(/url\s*:\s*["']([^"']+)["']/g) || []) {
    const m = x.match(/["']([^"']+)["']/); if (m && !/^http/.test(m[1])) apiSet.add(m[1]);
  }
  const apis = [...apiSet];
  const jsxs = [...new Set((body.match(/jsx(?:NoCheck)?\(\s*["']([^"']+)["']/g) || [])
    .map((x) => (x.match(/["']([^"']+)["']/) || [])[1]))];
  const texts = [...new Set((body.match(/[\u4e00-\u9fa5]{1,20}/g) || []))];
  const classes = [...new Set((body.match(/staticClass:\s*"([^"]{2,40})"/g) || [])
    .map((x) => x.slice(15, -1)))];

  const md = [];
  md.push('# ' + c.name);
  md.push('');
  md.push('> 来源：`app/' + c.file + '`　大小：' + (c.size / 1024).toFixed(1) + 'KB');
  md.push('> 特征：' + [c.hasProps && 'props', c.hasData && 'data', c.hasMethods && 'methods', c.hasRender && 'render']
    .filter(Boolean).join(' / '));
  md.push('');

  if (subComps.length) {
    md.push('## 子组件');
    md.push('');
    md.push(subComps.map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (propKeys.length) {
    md.push('## props（' + propKeys.length + '）');
    md.push('');
    md.push(propKeys.map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (dataKeys.length) {
    md.push('## data（' + dataKeys.length + '）');
    md.push('');
    md.push(dataKeys.map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (compKeys.length) {
    md.push('## computed（' + compKeys.length + '）');
    md.push('');
    md.push(compKeys.map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (methKeys.length) {
    md.push('## methods（' + methKeys.length + '）');
    md.push('');
    md.push(methKeys.map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (apis.length) {
    md.push('## 接口调用');
    md.push('');
    apis.forEach((x) => md.push('- `' + x + '`'));
    md.push('');
  }

  if (jsxs.length) {
    md.push('## jsx 调用（PS 能力）');
    md.push('');
    jsxs.forEach((x) => md.push('- `' + x + '`'));
    md.push('');
  }

  if (classes.length) {
    md.push('## 样式 class（' + classes.length + '）');
    md.push('');
    md.push(classes.slice(0, 40).map((x) => '`' + x + '`').join('、'));
    md.push('');
  }

  if (texts.length) {
    md.push('## 文案（' + texts.length + '）');
    md.push('');
    md.push(texts.join(' · '));
    md.push('');
  }

  md.push('## 源码');
  md.push('');
  md.push('```js');
  md.push(body);
  md.push('```');

  // 用 fileName 命名，避免组件重名覆盖
  const outName = c.fileName.replace(/\.js$/, '') + '.md';
  fs.writeFileSync(path.join(OUT, outName), md.join('\n'), 'utf8');
  done++;
  } catch (err) {
    console.log('  处理失败 ' + c.fileName + ': ' + err.message);
    // 失败也要落盘，至少保留源码
    try {
      const fb = path.join(OUT, c.fileName.replace(/\.js$/, '') + '.md');
      fs.writeFileSync(fb, '# ' + c.name + '\n\n> 自动解析失败，以下是原始源码\n\n```js\n' + c.body + '\n```\n', 'utf8');
      done++;
    } catch {}
  }
}

console.log('已生成 ' + done + ' 份组件规格 -> ' + OUT);
console.log('\n最大的几份:');
fs.readdirSync(OUT).map((f) => ({ f, s: fs.statSync(path.join(OUT, f)).size }))
  .sort((a, b) => b.s - a.s).slice(0, 8)
  .forEach((x) => console.log('  ' + x.f.padEnd(30) + (x.s / 1024).toFixed(1) + 'KB'));
