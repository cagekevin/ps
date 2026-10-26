/**
 * 从原版 render 的 AST 提取页面组件树（100% 精确，不用正则、不用组件树）。
 *
 *   node scripts/audit-page.mjs Action
 *
 * 为什么不用 `08-模板`：模板文件名整体错位（`tpl_Action_*` 里装的是 Rename，
 * `tpl_Style_*` 里装的是 Action），按文件名找必错。
 * 为什么不用 `11-组件树`：31% 未解析且名字错位（D-19）。
 *
 * 输出：控制台树。后续可接 --md 生成页面清单。
 */
import { parse } from '@babel/parser'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireExternal } from './_env-guard.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

/**
 * 两份源文件，行号完全不同：
 * - `app.v4.js`：未压缩带缩进（73946 行），读起来快
 * - `56d7.js`：webcrack 解包输出，`08-模板` 和 `交互清单` 都是它生成的
 *
 * **交叉审计必须同源**：模板来自 56d7.js，用 app.v4.js 的 AST 去比，差异里混着版本差。
 */
const src = process.argv.find((a) => a.startsWith('--src='))?.slice(6) ?? 'v4'
const FILE =
  src === '56d7'
    ? join(root, '..', 'archive', '源码还原', 'webcrack输出', 'app', '56d7.js')
    : join(root, 'docs', '原版', '01-原版源码', 'panel', 'js', 'app.v4.js')
requireExternal(FILE, '需要 docs/原版/01-原版源码/panel/js/app.v4.js（美化版原版源码，已入库）。')
const code = readFileSync(FILE, 'utf8')
const ast = parse(code, {
  sourceType: 'script',
  errorRecovery: true,
  allowReturnOutsideFunction: true,
})

const EVENTS = new Set([
  'click',
  'dblclick',
  'contextmenu',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'input',
  'change',
  'keydown',
  'keyup',
  'scroll',
  'drop',
  'dragstart',
  'dragend',
  'add',
  'rename',
  'delete',
  'select',
  'ok',
  'cancel',
  'choose',
  'confirm',
  'handle',
  'dropchange',
  'close',
])

function walk(node, fn, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return
  seen.add(node)
  if (node.type) fn(node)
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue
    const v = node[k]
    if (Array.isArray(v)) v.forEach((x) => walk(x, fn, seen))
    else if (v && typeof v === 'object') walk(v, fn, seen)
  }
}

// 1. 组件对象：var X = { name: "Action", ... }
const varToComp = new Map()
const nodeByName = new Map()
const nodeByVar = new Map()
walk(ast, (node) => {
  if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
  const init = node.init
  if (!init || init.type !== 'ObjectExpression') return
  // 有 components 的对象就是组件选项（有些组件没有 name，如字体面板的 `tg`）
  const hasComponents = init.properties.some((p) => p.key?.name === 'components')
  if (hasComponents) nodeByVar.set(node.id.name, init)
  const nameProp = init.properties.find(
    (p) => p.key?.name === 'name' && p.value.type === 'StringLiteral',
  )
  if (nameProp) {
    varToComp.set(node.id.name, nameProp.value.value)
    if (!nodeByName.has(nameProp.value.value)) nodeByName.set(nameProp.value.value, init)
  }
})

// 2. 别名：var DS = PS
const alias = new Map()
walk(ast, (node) => {
  if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
  if (node.init?.type === 'Identifier') alias.set(node.id.name, node.init.name)
})

function resolveComp(name) {
  let cur = name
  for (let i = 0; i < 10 && alias.has(cur); i++) cur = alias.get(cur)
  return varToComp.get(cur) ?? null
}

// 3. 挂载：Object(...)(ComponentVar, renderFn, ...)
const renderOf = new Map()
const renderOfVar = new Map()
walk(ast, (node) => {
  if (node.type !== 'CallExpression' || node.callee.type !== 'CallExpression') return
  const [first, second] = node.arguments
  if (!first || first.type !== 'Identifier') return
  if (!second) return
  if (second.type === 'Identifier' || second.type === 'FunctionExpression') {
    renderOfVar.set(first.name, second)
    const comp = resolveComp(first.name)
    if (comp) renderOf.set(comp, second)
  }
})

// 4. 函数定义表
const fnByName = new Map()
walk(ast, (node) => {
  if (node.type === 'FunctionDeclaration' && node.id) fnByName.set(node.id.name, node)
  // 有些 render 是 `var vg = function(){}` 而不是函数声明（字体面板就是这样）
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'Identifier' &&
    node.init?.type === 'FunctionExpression'
  ) {
    fnByName.set(node.id.name, node.init)
  }
})

function renderBody(node) {
  if (!node) return null
  if (node.type === 'FunctionExpression') return node.body
  if (node.type === 'Identifier') {
    const fn = fnByName.get(node.name)
    return fn ? fn.body : null
  }
  return null
}

// 5. 解析元素树
function readOpt(objNode) {
  const info = { classes: '', events: [] }
  if (!objNode || objNode.type !== 'ObjectExpression') return info

  for (const p of objNode.properties) {
    const key = p.key?.name ?? p.key?.value
    if (key === 'staticClass' && p.value.type === 'StringLiteral') info.classes = p.value.value
    if (key === 'class' && p.value.type === 'StringLiteral') info.classes = p.value.value
    if (key === 'on' && p.value.type === 'ObjectExpression') {
      for (const h of p.value.properties) {
        const ev = h.key?.name ?? h.key?.value
        if (ev) info.events.push(ev)
      }
    }
  }
  info.events = [...new Set(info.events)].filter((e) => EVENTS.has(e) || e.startsWith('on'))
  return info
}

/**
 * `scopedSlots: t._u([{ key: "header", fn: function () { return [...] } }])`
 *
 * 之前只遍历 children，插槽里的节点全部漏掉（CommonUse 的 svg/use 就是这样丢的）。
 * 这里把每个 fn 的返回值展开，包一层 `slot:<key>` 标明来源。
 */
function readSlots(optNode) {
  const out = []
  if (!optNode || optNode.type !== 'ObjectExpression') return out

  for (const p of optNode.properties) {
    const key = p.key?.name ?? p.key?.value
    if (key !== 'scopedSlots' && key !== 'slot') continue
    if (p.value.type !== 'CallExpression') continue

    const arr = p.value.arguments[0]
    if (!arr || arr.type !== 'ArrayExpression') continue

    for (const el of arr.elements) {
      if (!el || el.type !== 'ObjectExpression') continue
      const fnProp = el.properties.find((x) => (x.key?.name ?? x.key?.value) === 'fn')
      const keyProp = el.properties.find((x) => (x.key?.name ?? x.key?.value) === 'key')
      if (fnProp?.value?.type !== 'FunctionExpression') continue

      const slotName = keyProp?.value?.value ?? 'default'
      const ret = fnProp.value.body.body?.find((s) => s.type === 'ReturnStatement')?.argument
      if (!ret) continue

      out.push({
        tag: `slot:${slotName}`,
        classes: '',
        events: [],
        children: listChildren(ret),
      })
    }
  }

  return out
}

function listChildren(argNode) {
  if (argNode.type === 'ArrayExpression') return argNode.elements.map(parseNode).filter(Boolean)
  if (argNode.type === 'CallExpression') {
    const c = argNode.callee
    // t._l(array, fn)
    if (c.type === 'MemberExpression' && c.property.name === '_l') {
      const fn = argNode.arguments[1]
      const inner = parseNode(fnBody(fn))
      return [{ tag: 'v-for', classes: '', events: [], children: inner ? [inner] : [] }]
    }
    // t._e()
    if (c.type === 'MemberExpression' && c.property.name === '_e') return []
    return [parseNode(argNode)].filter(Boolean)
  }
  return []
}

/**
 * 只看**当前函数体顶层**的 return：`walk` 会把嵌套函数（`_l` 回调里的回调）也算进来，
 * 取到最深的那个就解析成别的东西了（CommonUse 曾因此变成 0 节点）。
 * 多个顶层 return 时取最后一个——条件返回里它通常是主结构。
 */
function topLevelReturn(fnNode) {
  const stmts = fnNode?.body?.body ?? []
  const top = [...stmts].reverse().find((s) => s.type === 'ReturnStatement')
  return top?.argument ?? null
}

function fnBody(fnNode) {
  if (!fnNode || fnNode.type !== 'FunctionExpression') return null
  return topLevelReturn(fnNode)
}

function parseNode(node) {
  if (!node) return null

  if (node.type === 'ConditionalExpression') {
    return {
      tag: 'v-if',
      classes: '',
      events: [],
      children: [parseNode(node.consequent), parseNode(node.alternate)].filter(Boolean),
    }
  }

  if (node.type !== 'CallExpression') return null

  const callee = node.callee
  const isCreate =
    (callee.type === 'Identifier' && callee.name.length === 1) ||
    (callee.type === 'MemberExpression' && callee.property.name === '_c')

  if (!isCreate) return null

  const [tagArg, optArg, childArg] = node.arguments
  if (!tagArg || tagArg.type !== 'StringLiteral') return null

  const info = readOpt(optArg)
  return {
    tag: tagArg.value,
    classes: info.classes,
    events: info.events,
    children: [...(childArg ? listChildren(childArg) : []), ...readSlots(optArg)],
  }
}

function findReturn(body) {
  if (!body) return null
  if (body.type === 'ReturnStatement') return body.argument
  const stmts = body.body ?? []
  const top = [...stmts].reverse().find((s) => s.type === 'ReturnStatement')
  return top?.argument ?? null
}

// 6. 输出
const pageName = process.argv[2] ?? 'Action'
/** 有些组件没有 `name`（如字体面板 `anon_56d7_L34996`），直接指定 render 函数名 */
const renderArg = process.argv.find((a) => a.startsWith('--render='))?.slice(9)
const wantMd = process.argv.includes('--md')
const wantCross = process.argv.includes('--cross')
const varArg = process.argv.find((a) => a.startsWith('--var='))?.slice(6)
const render = varArg
  ? renderOfVar.get(varArg)
  : renderArg
    ? { type: 'Identifier', name: renderArg, loc: fnByName.get(renderArg)?.loc }
    : renderOf.get(pageName)
const body = renderBody(render)
const rootNode = parseNode(findReturn(body))

/**
 * 交叉审计：AST 树 vs `08-模板` 结构树。
 *
 * 模板文件名整体错位（`tpl_Action_*` 里是 Rename，`tpl_Style_*` 里是 Action），
 * 所以**按内容匹配**：取模板 jsx 块根节点的 class，与 AST 根节点的第一个 class 比。
 * 差异必须逐条解释，不许\"差不多\"。
 */
if (wantCross) {
  const rootClass = (rootNode?.classes ?? '').split(/\s+/)[0]
  const renderName = render?.type === 'Identifier' ? render.name : null
  // 两套行号（模板是 56d7.js、我们读 app.v4.js），只能按函数名匹配
  const renderLine = fnByName.get(render?.name ?? '')?.loc.start.line ?? render?.loc?.start?.line
  const tplDir = join(root, 'docs', '原版', '02-组件文档', '08-模板')
  const candidates = []

  for (const name of readdirSync(tplDir)) {
    if (!name.endsWith('.md')) continue
    const text = readFileSync(join(tplDir, name), 'utf8')
    const block = text.match(/```jsx\n([\s\S]*?)```/)?.[1]
    if (!block) continue
    const cls = block.match(/class="([^"]*)"/)?.[1] ?? ''
    // 模板头：`> 来源：\`56d7.js\` render 函数 \`oS\`（行 47111）`
    // 行号是 56d7.js 的，app.v4.js 是另一套（oS 在 55046），跨文件比不了。
    // 唯一可靠的标识是函数名。
    const tplFn = text.match(/render 函数\s*`?([A-Za-z_$][\w$]*)`?/)?.[1]
    if (renderName && tplFn === renderName) candidates.push({ name, cls })
  }

  console.log(`## 交叉审计 · ${pageName}\n`)
  console.log(`页面根 class：\`${rootClass || '?'}\`，render 行：\`${renderLine ?? '?'}\``)

  if (!candidates.length) {
    console.log(`\n**无对应模板**：\`08-模板\` 里没有 render 行 ${renderLine ?? '?'} 的文件。`)
    console.log(`本页只能以 AST 为准；\`08-模板\` 覆盖不全，不要用 class 相近的文件硬套。`)
    process.exit(0)
  }

  console.log(
    `对应模板：${candidates.map((c) => `\`${c.name}\``).join('、')}（按 render 行号精确匹配）\n`,
  )

  const tplText = readFileSync(join(tplDir, candidates[0].name), 'utf8')
  const jsxBlock = tplText.match(/```jsx\n([\s\S]*?)```/)?.[1] ?? ''
  const tplTags = [...jsxBlock.matchAll(/<([a-zA-Z][\w-]*)/g)].map((m) => m[1])

  const astTags = []
  const collectTags = (node) => {
    if (!node) return
    if (node.tag !== 'v-for' && node.tag !== 'v-if') astTags.push(node.tag)
    for (const c of Array.isArray(node.children) ? node.children : []) collectTags(c)
  }
  collectTags(rootNode)

  const count = (arr) => {
    const m = new Map()
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1)
    return m
  }
  const a = count(astTags)
  const t = count(tplTags)
  const all = [...new Set([...a.keys(), ...t.keys()])].sort()

  console.log(`AST ${astTags.length} 个 DOM 节点，模板 ${tplTags.length} 个\n`)
  console.log('| 标签 | AST | 模板 | 差异说明 |')
  console.log('|---|---|---|---|')

  let diff = 0
  for (const k of all) {
    const av = a.get(k) ?? 0
    const tv = t.get(k) ?? 0
    const note =
      av === tv
        ? ''
        : tv === 0
          ? '模板未覆盖（循环体 / 条件分支）'
          : av === 0
            ? '**AST 漏了，需查**'
            : '数量不同，需查'
    if (av !== tv) diff++
    console.log(`| \`${k}\` | ${av} | ${tv} | ${note} |`)
  }

  console.log(`\n差异 ${diff} 项。模板漏的必须保留在清单里；AST 的互斥分支要标 \`v-if\`。`)
  process.exit(0)
}

if (wantMd) {
  const rows = []
  const collect = (node, depth) => {
    if (!node) return
    rows.push({ depth, ...node })
    for (const child of Array.isArray(node.children) ? node.children : []) collect(child, depth + 1)
  }
  collect(rootNode, 0)

  const lines = [
    '| 层级 | 标签 | class | 事件 | 我方 | 状态 |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => {
      const indent = '　'.repeat(r.depth)
      return `| ${r.depth} | ${indent}\`${r.tag}\` | ${r.classes || '—'} | ${r.events.join(' / ') || '—'} |  | ☐ |`
    }),
  ]
  console.log(lines.join('\n'))
  console.log(`\n共 ${rows.length} 个节点`)

  // 方法表：从组件定义的 methods 对象直接读 key + 行号
  const compNode = varArg ? nodeByVar.get(varArg) : nodeByName.get(pageName)
  const methodsProp = compNode?.properties.find((p) => p.key?.name === 'methods')
  if (methodsProp?.value?.type === 'ObjectExpression') {
    const ms = methodsProp.value.properties
      .filter((p) => p.key?.name)
      .map((p) => ({ name: p.key.name, line: p.loc.start.line }))
    console.log('\n## 方法（AST 读取，含行号）\n')
    console.log('| 方法 | 行号 | 我方 | 状态 |')
    console.log('|---|---|---|---|')
    for (const m of ms) console.log(`| \`${m.name}\` | ${m.line} |  | ☐ |`)
    console.log(`\n共 ${ms.length} 个方法`)
  } else {
    console.log('\n（该组件没有 methods 对象）')
  }
  process.exit(0)
}

function print(node, depth = 0) {
  if (!node) return
  const pad = '  '.repeat(depth)
  const cls = node.classes ? `.${node.classes.split(/\s+/).join('.')}` : ''
  const ev = node.events.length ? `  [${node.events.join(', ')}]` : ''
  console.log(`${pad}${node.tag}${cls}${ev}`)
  const kids = Array.isArray(node.children) ? node.children : []
  for (const child of kids) print(child, depth + 1)
}

console.log(
  `# ${pageName}  render=${render?.name ?? render?.type} @${render?.loc?.start?.line ?? '?'}`,
)
if (rootNode) print(rootNode)
else console.log('（未解析到根节点）')
