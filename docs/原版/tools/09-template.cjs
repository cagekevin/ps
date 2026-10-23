#!/usr/bin/env node
/**
 * 09-template.cjs  v2
 * 模板结构提取：解析 render 函数的【嵌套树】，不是扁平列表
 *
 * Vue 2 编译产物：
 *   n("div", { staticClass: "a" }, [
 *     n("span", [t._v("文字")]),
 *     n("div", { ... })
 *   ])
 *
 * 输出带层级的伪 JSX。
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';

/**
 * 单文件模式（2026-10-21）：
 * `03-源码还原/` 已清理，改用 `reference/.../app.v4.js`（同一份代码的合并可读版）。
 * 组件索引由 `03-components.cjs` 重新生成到 `tools/_out/component-map.json`。
 * 输出放 `tools/_out/templates/`，**不写回** `reference/02-组件文档/08-模板/`（那是已人工校对的版本）。
 */
const SINGLE = path.join(ROOT, 'reference', '01-原版源码', 'panel', 'js', 'app.v4.js');
const MAP = path.join(__dirname, '_out', 'component-map.json');
const OUT = path.join(__dirname, '_out', 'templates');
fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

// ---------- 配平工具 ----------
function matchPair(s, i, open, close) {
  let d = 0, quote = null, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === open) d++;
    else if (c === close) { d--; if (d === 0) return k; }
  }
  return -1;
}

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

// ---------- 解析一个 n(...) 调用 ----------
// 返回 { tag, attrs, text, children, end }
function parseCall(s, start) {
  // s[start] 应该是 'n'，下一个是 '('
  let i = start + 1;
  if (s[i] !== '(') return null;
  i = skipWs(s, i + 1);

  // tag 必须是字符串字面量
  if (s[i] !== '"' && s[i] !== "'") return null;
  const q = s[i];
  const tagEnd = s.indexOf(q, i + 1);
  if (tagEnd < 0) return null;
  const tag = s.slice(i + 1, tagEnd);
  i = skipWs(s, tagEnd + 1);

  let attrs = null;
  let children = [];

  // 第二个参数：{...} 或 [...]
  if (s[i] === ',') { i = skipWs(s, i + 1); }

  if (s[i] === '{') {
    const e = matchPair(s, i, '{', '}');
    if (e < 0) return null;
    attrs = s.slice(i, e + 1);
    i = skipWs(s, e + 1);
    if (s[i] === ',') { i = skipWs(s, i + 1); }
  }

  if (s[i] === '[') {
    const e = matchPair(s, i, '[', ']');
    if (e < 0) return null;
    children = parseChildren(s.slice(i + 1, e));
    i = e + 1;
  }

  // 跳到调用的右括号
  const closeIdx = matchPair(s, start + 1, '(', ')');
  return { tag, attrs, children, end: closeIdx >= 0 ? closeIdx : i };
}

// ---------- 解析 children 源码里的节点 ----------
function parseChildren(src) {
  const nodes = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    // 静态文本 t._v("...")
    if (c === 't' && src.startsWith('t._v(', i)) {
      const s2 = i + 5;
      const q = src[s2];
      if (q === '"' || q === "'") {
        const e = src.indexOf(q, s2 + 1);
        if (e > 0) {
          nodes.push({ type: 'text', value: src.slice(s2 + 1, e) });
          i = e + 1;
          continue;
        }
      }
    }

    // 元素 n("tag", ...)
    if (c === 'n' && src[i + 1] === '(') {
      // 确认前面不是标识符的一部分
      const prev = i > 0 ? src[i - 1] : '';
      if (!/[A-Za-z0-9_$]/.test(prev)) {
        const node = parseCall(src, i);
        if (node) {
          nodes.push({ type: 'element', ...node });
          i = node.end + 1;
          continue;
        }
      }
    }

    i++;
  }
  return nodes;
}

// ---------- 从 attrs 对象里提取动态绑定 ----------
function extractBindings(attrsSrc) {
  const out = [];
  if (!attrsSrc) return out;

  // directives: [{ name: "show", rawName: "v-show", value: xxx, expression: "xxx" }]
  const dirBlocks = [...attrsSrc.matchAll(/directives:\s*\[([\s\S]{0,3000}?)\]\s*,?\s*(?=on:|attrs:|class:|style:|model:|staticClass:|key:|ref:|domProps:|scopedSlots:|slot:|$)/g)];
  for (const [, body] of dirBlocks) {
    for (const dm of body.matchAll(/name:\s*"([^"]+)"[\s\S]{0,400}?expression:\s*"([^"]*)"/g)) {
      out.push('v-' + dm[1] + '="' + dm[2] + '"');
    }
  }

  // model: { value: xxx, callback: ..., expression: "xxx" }
  const modelMatch = attrsSrc.match(/model:\s*\{([\s\S]{0,800}?)\}\s*,?\s*(?=directives:|on:|attrs:|class:|style:|staticClass:|key:|ref:|domProps:|$)/);
  if (modelMatch) {
    const expr = (modelMatch[1].match(/expression:\s*"([^"]+)"/) || [])[1];
    if (expr) out.push('v-model="' + expr + '"');
  }

  // class: {...} 对象形式
  const classMatch = attrsSrc.match(/(?:^|[\s,{])class:\s*(\{[\s\S]{0,400}?\})\s*,?\s*(?=staticClass:|on:|attrs:|style:|directives:|model:|key:|ref:|domProps:|$)/);
  if (classMatch) out.push(':class="' + classMatch[1].replace(/\s+/g, ' ').slice(0, 80) + '"');

  // style: {...}
  const styleMatch = attrsSrc.match(/(?:^|[\s,{])style:\s*(\{[\s\S]{0,400}?\})\s*,?\s*(?=staticClass:|on:|attrs:|class:|directives:|model:|key:|ref:|domProps:|$)/);
  if (styleMatch) out.push(':style="' + styleMatch[1].replace(/\s+/g, ' ').slice(0, 80) + '"');

  // attrs: {...} 里的动态属性
  const attrsMatch = attrsSrc.match(/(?:^|[\s,{])attrs:\s*\{([\s\S]{0,600}?)\}\s*,?\s*(?=staticClass:|on:|class:|style:|directives:|model:|key:|ref:|domProps:|$)/);
  if (attrsMatch) {
    for (const am of attrsMatch[1].matchAll(/([a-zA-Z][\w-]*)\s*:\s*([^,}]{1,60})/g)) {
      const k = am[1], v = am[2].trim();
      if (k === 'src' || k === 'alt' || k === 'type') {
        if (/^["']/.test(v)) out.push(k + '=' + v);
        else out.push(':' + k + '="' + v + '"');
      }
    }
  }

  return out;
}

// ---------- 渲染成带缩进的伪 JSX ----------
function render(nodes, indent, lines) {
  const pad = '  '.repeat(indent);
  for (const nd of nodes) {
    if (nd.type === 'text') {
      const t = nd.value.trim();
      if (t) lines.push(pad + t);
      continue;
    }
    const cls = nd.attrs ? (nd.attrs.match(/staticClass:\s*"([^"]+)"/) || [])[1] : '';
    const ev = nd.attrs ? (nd.attrs.match(/on:\s*\{([^}]{0,300})\}/) || [])[1] : '';
    const evName = ev ? (ev.match(/([a-zA-Z]+)\s*:/) || [])[1] : '';
    const attrs = [];
    if (cls) attrs.push('class="' + cls + '"');
    if (evName) attrs.push('@' + evName);
    // 动态绑定
    const bindings = extractBindings(nd.attrs);
    attrs.push(...bindings);

    const hasChildren = nd.children && nd.children.length > 0;
    const tag = nd.tag;
    const isVoid = /^(img|br|input|hr|meta|link)$/i.test(tag);

    if (!hasChildren || isVoid) {
      lines.push(pad + '<' + tag + (attrs.length ? ' ' + attrs.join(' ') : '') + ' />');
    } else {
      lines.push(pad + '<' + tag + (attrs.length ? ' ' + attrs.join(' ') : '') + '>');
      render(nd.children, indent + 1, lines);
      lines.push(pad + '</' + tag + '>');
    }
  }
}

// ---------- 主流程 ----------
let written = 0;
const summary = [];

for (const f of [path.basename(SINGLE)]) {
  const s = fs.readFileSync(SINGLE, 'utf8');
  if (!/_self\._c|_vm\._c/.test(s)) continue;

  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(\)\s*\{/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const name = m[1];
    const b = s.indexOf('{', m.index + m[0].length - 1);
    if (b < 0) continue;
    const e = matchPair(s, b, '{', '}');
    if (e < 0) continue;
    const body = s.slice(b, e + 1);
    if (!/_self\._c|_vm\._c|return n\(/.test(body)) continue;

    // 找 return n( 的位置，从这里开始解析树
    const ri = body.indexOf('return n(');
    if (ri < 0) continue;
    const rootStart = ri + 7;
    const root = parseCall(body, rootStart);
    if (!root) continue;

    const line = s.slice(0, m.index).split('\n').length;

    // 归属（D-10，2026-10-22 重做）：
    // render 不一定紧挨组件对象，最可靠的是组件后面的
    // `Object(Y.a)(组件变量, render 函数名, ...)` 绑定。
    // 之前的“最近 render 之前/之后”都会把 License 之类的相邻组件算错。
    let owner = null;
    const wrapper = new RegExp(
      'Object\\(Y\\.a\\)\\(\\s*[A-Za-z_$][\\w$]*\\s*,\\s*' +
        name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\s*,',
    );
    for (const c of map) {
      if (c.file !== f) continue;
      const chunk = s.slice(c.start, Math.min(s.length, c.start + 6000));
      if (wrapper.test(chunk)) {
        owner = c;
        break;
      }
    }

    // 兜底：没有包装绑定时，退回“render 之后最近的组件”
    if (!owner) {
      for (const c of map) {
        if (c.file === f && c.start > m.index) {
          if (!owner || c.start < owner.start) owner = c;
        }
      }
    }
    const compName = owner ? owner.name : 'unknown';
    const outName = 'tpl_' + compName + '_L' + line + '.md';

    const lines = [];
    render([{ type: 'element', ...root }], 0, lines);

    const md = ['# 模板 · ' + compName, ''];
    md.push('> 来源：`' + f + '` render 函数 `' + name + '`（行 ' + line + '）');
    md.push('> 结构：**带层级**，缩进表示嵌套');
    md.push('');
    md.push('## 结构树');
    md.push('');
    md.push('```jsx');
    md.push(...lines);
    md.push('```');
    md.push('');
    // 动态渲染统计（v-if / v-for 是控制流，不是属性，无法从 attrs 提取）
    const listCount = (body.match(/_l\s*\(/g) || []).length;
    const ifCount = (body.match(/\bif\s*\(/g) || []).length;
    const terrCount = (body.match(/\?.*?:/g) || []).length;
    if (listCount || ifCount) {
      md.push('## 动态渲染（需人工对照）');
      md.push('');
      md.push('| 类型 | 处数 | 对应 |');
      md.push('|---|---|---|');
      if (listCount) md.push('| `_l()` 列表渲染 | ' + listCount + ' | `v-for` |');
      if (ifCount) md.push('| `if` 条件分支 | ' + ifCount + ' | `v-if` / `v-else` |');
      md.push('');
      md.push('> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。');
      md.push('> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。');
      md.push('');
    }

    md.push('## render 源码');
    md.push('');
    md.push('```js');
    md.push(body);
    md.push('```');

    fs.writeFileSync(path.join(OUT, outName), md.join('\n'), 'utf8');
    written++;
    const rootClass = (root.attrs?.match(/staticClass:\s*"([^"]+)"/) || [])[1] || '';
    summary.push({ comp: compName, depth: lines.length, file: outName, rootClass, line });
  }
}

// ---------- 按根 class 排序的索引 ----------
// 文件名带的是行号，人记不住；这里给一张「根 class → 文件」的表，搜 class 就能找到模板。
const indexRows = [...summary]
  .sort((a, b) => (a.rootClass || '~').localeCompare(b.rootClass || '~'))
  .map((x) => `| \`${x.rootClass || '（无 class）'}\` | ${x.comp} | ${x.line} | ${x.depth} | [${x.file}](${encodeURI(x.file)}) |`);

fs.writeFileSync(
  path.join(OUT, '_索引.md'),
  [
    '# 模板索引（按根 class 排序）',
    '',
    '> 由 `node 09-template.cjs` 生成。**文件名不可信**（历史遗留错位），找模板请按本表的根 class 搜。',
    '> 归属修复：2026-10-22，`09-template.cjs` 改为读取 `Object(Y.a)(组件变量, render, ...)` 包装绑定；不再按 render 前后位置猜。',
    '',
    '| 根 class | 组件名 | render 行 | 节点数 | 文件 |',
    '|---|---|---|---|---|',
    ...indexRows,
    '',
  ].join('\n'),
  'utf8',
);

console.log('已生成 ' + written + ' 份模板结构 -> ' + OUT);
console.log('\n行数最多的 10 个（结构最复杂）:');
summary.sort((a, b) => b.depth - a.depth).slice(0, 10)
  .forEach((x) => console.log('  ' + x.comp.padEnd(26) + x.depth + ' 行'));
