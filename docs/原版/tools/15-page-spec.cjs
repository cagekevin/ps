#!/usr/bin/env node
/**
 * 15-page-spec.cjs
 * 页面规格：从 app.v4.js 的 render 提结构树，从 app.bf68b505.css 提实测样式。
 *
 * 为什么新加这一步：09-template.cjs 的输入是 `03-源码还原/webcrack输出/app/`（已不在），
 * 但它里面的配平/递归解析器是验证过的。这里**复用同一套解析逻辑**，只把输入换成
 * `reference/01-原版源码/panel/js/app.v4.js`（有缩进的单文件），并按根 staticClass 归属页面。
 *
 * 用法：
 *   node 15-page-spec.cjs --list            列出所有 render 的根 class（用于定页面映射）
 *   node 15-page-spec.cjs                   生成全部已映射页面
 *   node 15-page-spec.cjs --page Custom     只生成一个
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\稿定设计助理-存档';
const JS = path.join(ROOT, 'reference', '01-原版源码', 'panel', 'js', 'app.v4.js');
const CSS_DIR = path.join(ROOT, 'reference', '01-原版源码', 'panel', 'css');
const OUT = path.join(ROOT, 'app', 'docs', '生成', '页面规格');

/**
 * 页面定位。三种方式：
 *   root   —— 按 render 根的 staticClass 认（多数页面根 class 就是页面名）
 *   render —— 直接给 render 函数名（缩写名，如 Style 的 `EC`）
 *   name   —— 按组件对象的 `name: "X"` 认，取它前面最近的 render
 *
 * Style 只能用 `render`：它的页面 render 是 `EC()`（`app.v4.js:49616`，根 class `Style-wrap`），
 * 但 `name: "Style"`（`:54578`）之前最近的 render 是 `warehouse` 的 `H_()`（`:53743`，根 class `mian`）——
 * 用 name 模式会把「仓库下拉组件」当成整页，旧版 06-样式.md 就是这么错的。
 */
const PAGES = {
  Custom: { file: '04-自定义', root: 'Custom', children: [] },
  CommonUse: {
    file: '05-常用',
    root: 'CommonUse',
    children: ['comembed', 'comimport', 'comoptimization', 'comcustomChange', 'comexport', 'comreference', 'comspacing'],
  },
  FontSet: {
    file: '02-字体面板',
    root: 'FontSet',
    children: ['translateCom', 'split', 'btnCom', 'pasteFont', 'fontSetQuick', 'fontSetHierarych', 'fontSetColor', 'distributed'],
  },
  Style: {
    file: '06-样式',
    // 页面 render 是 EC()（app.v4.js:49616，根 class `Style-wrap`）；
    // 组件对象 `var aS = { name: "Style", … }`（:54577）→ `Object(Y.a)(iS, EC, PC, false, null, "7f4f5fe0", null)`（:55044）
    render: 'EC',
    children: ['color', 'gradients', 'font', 'stylecom', 'warehouse', 'warehouseList', 'imgColor'],
  },
  Rename: { file: '07-重命名', root: 'Rename', children: ['dropDown'] },
  Set: {
    file: '08-设置',
    root: 'Set',
    children: ['tips', 'addcom', 'dropDowncom', 'open', 'DevicesManageModal', 'ClearCacheDialog'],
    // 设备管理弹窗内部还有两个独立 render（devices-list / device-input），
    // 只按名字配 children 收不到，用「body 含该 class」补收
    extra: ['devices-list', 'device-input'],
  },
  Action: { file: '03-动作', root: 'Action', children: ['open', 'addContext', 'warehouse'] },
  // 模板库页（route /template）。页面根 render 是 `Aa()`（app.v4.js:17989，组件对象 name:"Template" 在 :33382），
  // 根 class 是 `relative`——不能用 name 模式：byComponentName 取「name 之前最近的 render」，会落到 topic-banner(:33130)。
  // `relative` 精确匹配按文件顺序取第一个 = :17989，正确。
  // 本地库主体（个人模板 tab）不在根 render 里，而在 TemplateOwn(`:24148`) 及其子组件，
  // 这些子组件根 class 各式各样，用 extra 按独特 class 逐个收。
  Template: {
    file: '09-模板库',
    root: 'relative',
    children: ['lib-layout', 'nav'],
    extra: [
      'absolute right0 zindex99 topPopGap', // MyTemplatesEntry 的 menu slot
      'mobile-wrap w100 f-arrayY', // TemplateOwn 列表主体
      'template-menu', // TemplateCenterMenu（:18089，先命中）
      'baseCheck_box', // PersonalTemplateMenu（:31053，本地库 ⋯ 菜单）
      'folder_nav', // FileNav 文件夹导航
      'app-padding mt5 show_sub_folder_box', // ShowFolderSubFolder
      'f-baseX item score-item', // TemplateItemDropdownMenu 单项右键菜单（:26020）
      'toggle-template-info-display',
      'create-new-library f-center', // CreateNewLibrary 新建模板库
      'label-manage-panel', // LabelManegePanel 标签管理
      'relate-tag-wrap f-center', // RelateTag 打标签浮层
    ],
  },
  // 字体管理页：根 class 是 `font-manage`（app.v4.js:43467）。
  // 子组件的 class 是 BEM 双下划线（`font-manage__list-item`），不是 01 清单里写的单横线。
  // 字体管理页：组件多且 class 全是 `font-manage__*`，用 prefix 一次收全，避免逐个猜组件名
  'font-manage': {
    file: '01-字体管理',
    root: 'font-manage',
    prefix: ['font-manage', 'user-font-page'],
  },
};

// ---------- 以下四个函数来自 09-template.cjs（同一套配平/递归解析） ----------
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

function parseCall(s, start) {
  // createElement 的别名：多数 render 是 `n`，也有 `return a("div", …)`（`a = t._self._c`，Style 的 EC()）
  const callee = s[start];
  let i = start + 1;
  if (s[i] !== '(') return null;
  i = skipWs(s, i + 1);
  if (s[i] !== '"' && s[i] !== "'") return null;
  const q = s[i];
  const tagEnd = s.indexOf(q, i + 1);
  if (tagEnd < 0) return null;
  const tag = s.slice(i + 1, tagEnd);
  i = skipWs(s, tagEnd + 1);

  let attrs = null;
  let children = [];
  if (s[i] === ',') i = skipWs(s, i + 1);
  if (s[i] === '{') {
    const e = matchPair(s, i, '{', '}');
    if (e < 0) return null;
    attrs = s.slice(i, e + 1);
    i = skipWs(s, e + 1);
    if (s[i] === ',') i = skipWs(s, i + 1);
  }
  if (s[i] === '[') {
    const e = matchPair(s, i, '[', ']');
    if (e < 0) return null;
    children = parseChildren(s.slice(i + 1, e), callee);
    i = e + 1;
  } else if (s.startsWith('t._l(', i)) {
    // children 位置直接是列表渲染：`a("div", {…}, t._l(列表, function(){ return a(…) }), 0)`
    // （Style 的 4 个 tab 就是这样，不展开的话格子会整个从树里消失）
    const e = matchPair(s, i + 4, '(', ')');
    if (e > 0) {
      const inner = s.slice(i + 5, e);
      const ri = inner.indexOf(`return ${callee}(`);
      const node = ri >= 0 ? parseCall(inner, ri + 'return '.length) : null;
      if (node) children = [{ type: 'element', loop: true, ...node }];
      i = e + 1;
    }
  }
  const closeIdx = matchPair(s, start + 1, '(', ')');
  return { tag, attrs, children, callee, end: closeIdx >= 0 ? closeIdx : i };
}

function parseChildren(src, callee = 'n') {
  const nodes = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    // 列表渲染：t._l(数组, function(item){ return n(...) })
    // 09-template.cjs 原本不展开这里，导致「列表项」在结构树里整个缺失。
    // 这里展开**一次**并标记 v-for（不是真实次数，只为拿到节点结构）。
    if (c === 't' && src.startsWith('t._l(', i)) {
      const paren = i + 4;
      const end = matchPair(src, paren, '(', ')');
      if (end > 0) {
        const inner = src.slice(paren + 1, end);
        const marker = `return ${callee}(`;
        const ri = inner.indexOf(marker);
        if (ri >= 0) {
          const node = parseCall(inner, ri + 'return '.length);
          if (node) {
            nodes.push({ type: 'element', loop: true, ...node });
            i = end + 1;
            continue;
          }
        }
      }
    }

    // 条件渲染：cond ? n("a", …) : n("b", …)
    // 各展开一次，标 then / else；不判断条件真假（那不是静态能知道的）。
    if (c === '?') {
      const j = skipWs(src, i + 1);
      if (src.startsWith(`${callee}(`, j)) {
        const node = parseCall(src, j);
        if (node) {
          nodes.push({ type: 'element', cond: 'then', ...node });
          i = node.end + 1;
          continue;
        }
      }
    }
    // else 分支只认「前面是 )」的冒号，避开对象字面量里的 `key: value`
    if (c === ':' && /\)\s*$/.test(src.slice(Math.max(0, i - 4), i))) {
      const j = skipWs(src, i + 1);
      if (src.startsWith(`${callee}(`, j)) {
        const node = parseCall(src, j);
        if (node) {
          nodes.push({ type: 'element', cond: 'else', ...node });
          i = node.end + 1;
          continue;
        }
      }
    }

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
    if (c === callee && src[i + 1] === '(') {
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

/** 只取看得懂的那几类绑定，避免把压缩代码抄进表格 */
function extractBindings(attrsSrc) {
  const out = [];
  if (!attrsSrc) return out;
  for (const m of attrsSrc.matchAll(/\b(v-if|v-show|v-model|v-for)\b/g)) out.push(m[1]);
  // 事件：on: { click: ..., mouseenter: ... } —— 只取事件名，不抄函数体
  const onBlock = attrsSrc.match(/on:\s*\{([\s\S]{0,800}?)\n\s*\}/);
  if (onBlock) {
    for (const em of onBlock[1].matchAll(/(?:^|[\s,{])([a-z]+)\s*:/g)) out.push('@' + em[1]);
  }
  const model = attrsSrc.match(/model:\s*\{[^}]*?expression:\s*"([^"]+)"/);
  if (model) out.push('v-model="' + model[1] + '"');
  const dirs = [...attrsSrc.matchAll(/name:\s*"(show|if|for|model)"[\s\S]{0,400}?expression:\s*"([^"]*)"/g)];
  for (const [, n, e] of dirs.slice(0, 4)) out.push('v-' + n + '="' + e + '"');
  return [...new Set(out)];
}

// ---------- CSS 索引（思路同 07-styles.cjs，路径换成 reference，且读全部 css） ----------
// 注意：panel/css 下有两个文件，只读 app.* 会漏掉 chunk-vendors 里的组件样式
function loadCss() {
  const map = new Map();
  if (!fs.existsSync(CSS_DIR)) return map;
  for (const file of fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'))) {
    const s = fs.readFileSync(path.join(CSS_DIR, file), 'utf8');
    for (const m of s.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim();
      const body = m[2].trim();
      if (!body) continue;
      for (const cm of sel.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
        const name = cm[1];
        if (!map.has(name)) map.set(name, []);
        const list = map.get(name);
        if (list.length < 4) list.push({ body, file });
      }
    }
  }
  return map;
}

/** 只留布局/尺寸/颜色这几类声明，太长的不抄 */
const KEEP_PROP =
  /^(width|height|min-|max-|padding|margin|background|color|border|border-radius|font-size|line-height|font-weight|letter-spacing|display|flex|justify-content|align-items|align-content|gap|position|top|right|bottom|left|overflow|opacity|box-shadow|z-index|cursor|text-align|white-space|transform|transition|visibility)/;

/**
 * 一个元素的样式：把它所有 class 的所有规则合并，同名属性后者覆盖。
 * 不能只取第一条——`.f-alignNone` 有两条规则（justify-content + display），只取第一条会漏。
 */
function styleOf(cls) {
  const props = new Map();
  const files = new Set();
  for (const c of cls.split(/\s+/).filter(Boolean)) {
    for (const rule of cssMap.get(c) ?? []) {
      files.add(rule.file);
      for (const kv of rule.body.split(';')) {
        const i = kv.indexOf(':');
        if (i < 0) continue;
        const k = kv.slice(0, i).trim();
        const v = kv.slice(i + 1).trim();
        if (k && v && KEEP_PROP.test(k)) props.set(k, v);
      }
    }
  }
  if (!props.size) return null;
  const decl = [...props].slice(0, 8).map(([k, v]) => `${k}:${v}`).join('; ');
  const tag = [...files].some((f) => f.startsWith('chunk-vendors')) ? 'vendors' : 'app';
  return { decl, tag };
}

const cssMap = loadCss();
const src = fs.readFileSync(JS, 'utf8');
const lines = src.split(/\r?\n/);

// ---------- 扫所有 render ----------
const renders = [];
const re = /function\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*\{/g;
let m;
while ((m = re.exec(src)) !== null) {
  const brace = src.indexOf('{', m.index + m[0].length - 1);
  if (brace < 0) continue;
  const end = matchPair(src, brace, '{', '}');
  if (end < 0) continue;
  const body = src.slice(brace, end + 1);
  if (!/return n\(/.test(body) || !/staticClass/.test(body)) continue;

  const ri = body.indexOf('return n(');
  const root = parseCall(body, ri + 7);
  if (!root) continue;
  const rootClass = (root.attrs?.match(/staticClass:\s*"([^"]+)"/) || [])[1] || '';
  const line = src.slice(0, m.index).split('\n').length;
  const count = (body.match(/staticClass:/g) || []).length;
  renders.push({ fn: m[1], line, rootClass, root, count, bodyStart: brace, bodyEnd: end });
}

/** 本 render 内的全部 staticClass（不漏 _l / v-if 分支里的节点） */
function flatClasses(r) {
  const seg = src.slice(r.bodyStart, r.bodyEnd);
  const baseLine = src.slice(0, r.bodyStart).split('\n').length;
  const out = [];
  for (const mm of seg.matchAll(/staticClass:\s*"([^"]*)"/g)) {
    const rel = seg.slice(0, mm.index).split('\n').length;
    out.push({ line: baseLine + rel - 1, cls: mm[1] });
  }
  return out;
}

/**
 * render 里 createElement 用别名的那些（`var a = t._self._c; return a("div", …)`）。
 *
 * 主扫描只认 `return n(`，因此 `EC()`（Style 页真实 render，`app.v4.js:49616`）进不了 `renders`。
 * 这份单独放，**只给 `PAGES.render` 显式指定时用**：混进 `renders` 会改变其它页面按 class 取 render 的结果。
 */
const aliasRenders = [];
{
  const reAlias = /function\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*\{/g;
  let ma;
  while ((ma = reAlias.exec(src)) !== null) {
    const brace = src.indexOf('{', ma.index + ma[0].length - 1);
    if (brace < 0) continue;
    const end = matchPair(src, brace, '{', '}');
    if (end < 0) continue;
    const body = src.slice(brace, end + 1);
    const mRet = /return\s+([A-Za-z_$][\w$]*)\s*\(/.exec(body);
    if (!mRet || mRet[1] === 'n' || !/staticClass/.test(body)) continue;
    const root = parseCall(body, body.indexOf(mRet[1], mRet.index));
    if (!root) continue;
    aliasRenders.push({
      fn: ma[1],
      line: src.slice(0, ma.index).split('\n').length,
      rootClass: (root.attrs?.match(/staticClass:\s*"([^"]+)"/) || [])[1] || '',
      root,
      count: (body.match(/staticClass:/g) || []).length,
      bodyStart: brace,
      bodyEnd: end,
    });
  }
}

/** 显式指定 render 函数名（`PAGES.render`）时用；两个列表都查 */
const byRenderName = (fn) =>
  renders.find((r) => r.fn === fn) ?? aliasRenders.find((r) => r.fn === fn) ?? null;

/**
 * 按根 class 认页面。注意有的页面 render 根是**无 class 的 div**（如字体管理：
 * `return n("div", [n("TabLayout", { staticClass: "font-manage" })])`），
 * 这时要看第一层子节点。
 */
const byRoot = (name) =>
  renders.find(
    (r) =>
      r.rootClass.split(/\s+/)[0] === name ||
      (r.root.children ?? []).some((c) => c.attrs?.includes(`staticClass: "${name}"`)),
  );

/** 按组件对象的 name 认：取它前面最近的一个 render（Style 用） */
function byComponentName(name) {
  const idx = src.indexOf(`name: "${name}"`);
  if (idx < 0) return null;
  const line = src.slice(0, idx).split('\n').length;
  const cands = renders.filter((r) => r.line < line && r.rootClass);
  return cands.length ? cands[cands.length - 1] : null;
}

/**
 * 子组件定位：不依赖 name（压缩产物里子组件多数没有 name 字段）。
 * 做法与 03-components.cjs 一致——按源码顺序，用根 class 关键字 + 就近行号认。
 * 例：comembed → 根 class `embed-wrap`（app.v4.js:35732）。
 */
const CHILD_KEY = {
  comimport: 'import',
  comoptimization: 'optimization',
  comcustomChange: 'customchange',
  comreference: 'reference',
  comspacing: 'spacing',
  comembed: 'embed',
  comexport: 'export',
  translateCom: 'translate',
  pasteFont: 'paste',
  fontSetQuick: 'quick',
  fontSetHierarych: 'hierarch',
  fontSetColor: 'fontsetcolor',
  imgColor: 'imgcolor',
  warehouseList: 'warehouselist',
  dropDowncom: 'dropdown',
  DevicesManageModal: 'devices',
  ClearCacheDialog: 'cache',
};

/**
 * 有些子组件复用同一个根 class（Style 的 color/gradients 都是 `export-wrap`），
 * 按 class 会认错。这类改用**它独有的 jsx 调用**反查所在 render。
 */
const CHILD_SIG = {
  color: 'cy_changeStyleColor',
  gradients: 'ys_getGradientInfo',
  font: 'ys_checkUseFont',
  stylecom: 'ys_AddStyle',
  fontSetQuick: 'zt_getCurrentFontInfo',
  fontSetHierarych: 'zt_setFontSize',
  fontSetColor: 'zt_setFontColor',
  translateCom: 'ztTranslate',
  split: 'zt_changeTextBranchMerge',
  btnCom: 'zt_createButton',
  pasteFont: 'ztPasteFont',
  warehouse: '新增仓库',
  addcom: '请输入',
  ClearCacheDialog: '缓存已清理',
  addContext: '添加动作',
};

/**
 * 精确映射：components 里的 key → 变量 → Object(Y.a)(script, render) 里的 render 函数。
 * 例：`components: { color: VC }` + `var VC = Object(Y.a)(Zf, DC, ...)` → color 用 DC()。
 */
const nameToRender = new Map();
{
  const varArgs = new Map();
  for (const mm of src.matchAll(
    /var\s+([A-Za-z_$][\w$]*)\s*=\s*Object\([\w$.]+\)\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)/g,
  )) {
    varArgs.set(mm[1], [mm[2], mm[3]]);
  }
  // `var VC = HC.exports` —— components 引用的是 exports，不是组装变量本身
  const alias = new Map();
  for (const mm of src.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\.exports/g)) {
    alias.set(mm[1], mm[2]);
  }
  for (const mm of src.matchAll(/components:\s*\{/g)) {
    const start = mm.index + mm[0].length - 1;
    const end = matchPair(src, start, '{', '}');
    if (end < 0) continue;
    const body = src.slice(start, end);
    for (const cm of body.matchAll(/([A-Za-z_$][\w$-]*)\s*:\s*([A-Za-z_$][\w$]*)/g)) {
      const key = cm[1];
      const v = cm[2];
      if (nameToRender.has(key)) continue;
      const args = varArgs.get(alias.get(v) ?? v) ?? varArgs.get(v) ?? [v];
      const hit = renders.find((rr) => args.includes(rr.fn));
      if (hit) nameToRender.set(key, hit);
    }
  }
}

function findChild(name, ownerLine) {
  const mapped = nameToRender.get(name);
  if (mapped) return mapped;

  // 精确匹配优先：`font-manage__list` 不能匹配到 `font-manage__list-item`
  const exact = renders.find((r) => r.rootClass.split(/\s+/).includes(name));
  if (exact) return exact;

  const sig = CHILD_SIG[name];
  if (sig) {
    const hits = renders.filter((r) => src.slice(r.bodyStart, r.bodyEnd).includes(sig));
    if (hits.length) {
      hits.sort((a, b) => Math.abs(a.line - ownerLine) - Math.abs(b.line - ownerLine));
      return hits[0];
    }
  }

  const key = (CHILD_KEY[name] ?? name.replace(/^com(?=[a-z])/, '')).toLowerCase();
  // 子组件不一定排在父组件后面（FontSet 的子组件在父之前定义），所以按"行号距离最近"取
  const cands = renders
    .filter(
      (r) =>
        r.line !== ownerLine &&
        (r.rootClass.toLowerCase().includes(key) || r.root.tag === name),
    )
    .sort((a, b) => Math.abs(a.line - ownerLine) - Math.abs(b.line - ownerLine));
  return cands[0] ?? null;
}

if (process.argv.includes('--list')) {
  console.log('render 根 class（按行号）：\n');
  const known = new Set(Object.values(PAGES).map((s) => s.root).filter(Boolean));
  for (const r of renders.sort((a, b) => a.line - b.line)) {
    const mapped = known.has(r.rootClass.split(/\s+/)[0]) ? '★' : ' ';
    const label = r.rootClass || `<${r.root.tag}>`;
    console.log(`${mapped} ${String(r.line).padStart(6)}  ${label.padEnd(28)} ${String(r.count).padStart(4)} 个 class   ${r.fn}()`);
  }
  process.exit(0);
}

// ---------- 生成 ----------
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.includes('--page') ? process.argv[process.argv.indexOf('--page') + 1] : null;

let written = 0;
const missAll = [];

for (const [rootName, spec] of Object.entries(PAGES)) {
  if (only && only !== rootName) continue;
  const pageFile = spec.file;
  const r = spec.render
    ? byRenderName(spec.render)
    : spec.root
      ? byRoot(spec.root)
      : byComponentName(spec.name);
  if (!r) {
    console.log(`⚠ 没找到 "${rootName}" 的 render`);
    continue;
  }

  const md = [];
  md.push(`# 页面规格 · ${pageFile.replace(/^\d+-/, '')}`);
  md.push('');
  md.push(`> **脚本产物，别手改。** 生成：\`node tools/15-page-spec.cjs --page ${rootName}\``);
  md.push('> 来源：`reference/01-原版源码/panel/js/app.v4.js`；样式：`reference/01-原版源码/panel/css/app.bf68b505.css`。');
  md.push('> 每个组件给两段：**结构树**（字面量节点，`_l()` / 三元分支不展开）+ **完整 class 清单**（本 render 内全量，不漏）。');
  md.push('');

  // 根 + 声明的子组件，逐个展开
  const entries = [{ label: rootName, r }];
  if (spec.prefix) {
    // 按 class 前缀收：凡是根 class 含该前缀的 render 都算本页（字体管理页有 30+ 个）
    const prefixes = [].concat(spec.prefix);
    for (const rr of renders) {
      if (rr === r) continue;
      const inRoot = rr.rootClass && prefixes.some((p) => rr.rootClass.includes(p));
      // 根节点无 class 时（如 `return n("div", [n("div",{staticClass:"font-manage__..."})])`），
      // 要看整个 render body，否则这类组件会被整段漏掉
      const inBody =
        !rr.rootClass && prefixes.some((p) => src.slice(rr.bodyStart, rr.bodyEnd).includes(p));
      if (inRoot || inBody) {
        const label = rr.rootClass ? rr.rootClass.split(/\s+/)[0] : `${rr.fn}()`;
        entries.push({ label, r: rr });
      }
    }
  } else {
    for (const child of spec.children ?? []) {
      const cr = findChild(child, r.line);
      if (cr) entries.push({ label: child, r: cr });
      else console.log(`  ⚠ ${rootName} 的子组件 "${child}" 没匹配到 render`);
    }
  }

  // 补充：按「body 里出现某个 class」收 render（用于子组件的子组件）
  for (const cls of spec.extra ?? []) {
    const rr = renders.find((x) => src.slice(x.bodyStart, x.bodyEnd).includes(`staticClass: "${cls}"`));
    if (rr && !entries.some((e) => e.r === rr)) {
      entries.push({ label: rr.rootClass.split(/\s+/)[0] || `${rr.fn}()`, r: rr });
    }
  }

  let totalClasses = 0;
  const missing = new Set();

  for (const entry of entries) {
    const rr = entry.r;
    const rows = [];
    const walk = (nodes, depth) => {
      for (const nd of nodes) {
        if (nd.type === 'text') {
          const t = nd.value.trim();
          if (t) rows.push({ depth, kind: 'text', text: t });
          continue;
        }
        const cls = (nd.attrs?.match(/staticClass:\s*"([^"]+)"/) || [])[1] || '';
        rows.push({
          depth,
          kind: 'el',
          tag: nd.tag,
          cls,
          loop: nd.loop === true,
          cond: nd.cond,
          binds: extractBindings(nd.attrs || ''),
        });
        if (nd.children?.length) walk(nd.children, depth + 1);
      }
    };
    walk([{ type: 'element', ...rr.root }], 0);

    const flat = flatClasses(rr);
    totalClasses += flat.length;

    md.push(`## ${entry.label}${entry.label === rootName ? '（页面根）' : ''}`);
    md.push('');
    const loops = rows.filter((r) => r.loop).length;
    const conds = rows.filter((r) => r.cond).length;
    md.push(
      `> render \`${rr.fn}()\` 行 ${rr.line}　根 class \`${rr.rootClass}\`　本 render 内 staticClass ${flat.length} 个` +
        `　v-for ${loops} 段 / 条件分支 ${conds} 段（各展开一次）`,
    );
    md.push('');
    md.push('### 结构树（静态骨架）');
    md.push('');
    md.push('```');
    for (const row of rows) {
      if (row.kind === 'text') {
        md.push(`${'  '.repeat(row.depth)}"${row.text.slice(0, 60)}"`);
        continue;
      }
      const attrs = [row.cls ? `class="${row.cls}"` : '', ...row.binds].filter(Boolean).join(' ');
      const mark = row.loop
        ? '   <!-- v-for 展开一次 -->'
        : row.cond
          ? `   <!-- v-${row.cond === 'then' ? 'if' : 'else'} 分支 -->`
          : '';
      md.push(`${'  '.repeat(row.depth)}<${row.tag}${attrs ? ' ' + attrs : ''}>${mark}`);
    }
    md.push('```');
    md.push('');
    md.push('### 完整 class 清单');
    md.push('');
    md.push('| 行 | class | 实测样式（app.bf68b505.css） |');
    md.push('|---|---|---|');
    for (const f of flat) {
      if (!f.cls) {
        md.push(`| ${f.line} | （无 class） | — |`);
        continue;
      }
      const style = styleOf(f.cls);
      if (!style) for (const c of f.cls.split(/\s+/).filter(Boolean)) if (!cssMap.has(c)) missing.add(c);
      const body = style
        ? `${style.decl} 〔${style.tag}〕`
        : '—（该 class 无 CSS 规则，判定见文末）';
      md.push(`| ${f.line} | \`${f.cls}\` | ${body.replace(/\|/g, '\\|')} |`);
    }
    md.push('');
  }

  md.push('## 无 CSS 规则的 class（逐条判定）');
  md.push('');
  if (!missing.size) {
    md.push('无。上面每个 class 都在 `app.bf68b505.css` 或 `chunk-vendors.*.css` 里有规则。');
  } else {
    md.push('| class | 源码出现次数 | 判定 |');
    md.push('|---|---|---|');
    for (const c of [...missing].sort()) {
      const n = (src.match(new RegExp(c.replace(/[-]/g, '\\-'), 'g')) || []).length;
      // 判据必须是「以选择器字符串形式出现」（".xxx"），不能只看次数：
      // 页面根 class `Custom` 在源码里出现 17 次（组件名/路由名），但它不是选择器。
      const asSelector =
        src.includes(`".${c}"`) || src.includes(`'.${c}'`) || src.includes(`".${c} `);
      const verdict = asSelector
        ? '**JS 选择器字符串**（引导图 / querySelector），不是样式类，不用写 CSS'
        : '只出现在 `staticClass`，纯标记；样式来自父级或不在本次范围内';
      md.push(`| \`${c}\` | ${n} | ${verdict} |`);
    }
  }
  md.push('');
  md.push('> 判定依据：在 `app.v4.js` 里对该字符串的全量计数。出现 >1 次说明它还被选择器/配置引用。');
  md.push('');

  const file = path.join(OUT, `${pageFile}.md`);
  fs.writeFileSync(file, md.join('\n'), 'utf8');
  written++;
  missAll.push({ page: pageFile, nodes: totalClasses, miss: missing.size });
  console.log(`✅ ${pageFile}.md  组件 ${entries.length}　class ${totalClasses}　CSS 未命中 ${missing.size}`);
}

console.log(`\n共 ${written} 份 -> ${OUT}`);
