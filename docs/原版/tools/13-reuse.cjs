/**
 * 13-reuse.cjs —— 组件复用度分析
 *
 * 输入：BUILD-SPEC/11-组件树.md（路由表 + 组件→子组件表）
 * 输出：BUILD-SPEC/12-组件复用度.md
 *
 * 为什么不用 09-依赖关系.json 的 parents 字段：那份只算了 3 个组件，其余全是 0。
 * 这里从组件树重建反向索引，并把「未解析的 tag 名」一起统计——
 * 那 140 个未解析子组件恰恰就是最该先写的原子组件（Icon / InputSearch / GButton ...）。
 */
const fs = require('fs')
const path = require('path')

const SPEC = path.join(__dirname, '..', 'BUILD-SPEC')
const TREE = path.join(SPEC, '11-组件树.md')
const OUT = path.join(SPEC, '12-组件复用度.md')

const text = fs.readFileSync(TREE, 'utf8')

function cells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((s) => s.trim().replace(/^`|`$/g, '').trim())
}

const lines = text.split(/\r?\n/)
const routes = [] // { route, name, comp }
const children = new Map() // parent -> [{ tag, comp }]
let section = ''
let current = null

for (const raw of lines) {
  const line = raw.trim()

  if (line.startsWith('## ')) {
    section = line
    current = null
    continue
  }

  const h3 = line.match(/^###\s+(.+?)（/)
  if (h3) {
    current = h3[1].trim()
    if (!children.has(current)) children.set(current, [])
    continue
  }

  if (!line.startsWith('|')) continue
  if (/^\|\s*-+/.test(line)) continue

  const c = cells(line)
  if (c.length < 3) continue
  if (c[0] === '路由' || c[0] === '标签' || c[0] === '项') continue

  if (section.includes('路由')) {
    if (c.length >= 4) routes.push({ route: c[0], name: c[1], comp: /^⚠/.test(c[3]) ? null : c[3] })
  } else if (current) {
    children.get(current).push({ tag: c[0], comp: /^⚠/.test(c[2]) ? null : c[2] })
  }
}

// app / window 这类是 ExtendScript 全局对象，被当成组件抓进来了，排除
const IGNORE = new Set(['app', 'window', 'document', '$'])
for (const [key, list] of children) {
  children.set(
    key,
    list.filter((x) => !(x.comp && IGNORE.has(x.comp))),
  )
}

// ---------- 反向索引 ----------
const directParents = new Map() // comp -> Set(parent)
const tagParents = new Map() // tag  -> Set(parent)
const tagCount = new Map() // tag  -> 出现次数
const tagResolved = new Map() // tag  -> 有几次能解析到具体组件

let refTotal = 0
let resolvedTotal = 0

for (const [parent, list] of children) {
  for (const { tag, comp } of list) {
    refTotal++
    tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
    if (!tagParents.has(tag)) tagParents.set(tag, new Set())
    tagParents.get(tag).add(parent)

    if (comp) {
      resolvedTotal++
      tagResolved.set(tag, (tagResolved.get(tag) || 0) + 1)
      if (!directParents.has(comp)) directParents.set(comp, new Set())
      directParents.get(comp).add(parent)
    }
  }
}

// ---------- 可达性 ----------
const reach = new Map() // comp -> Set(route)：哪些路由能到达它
const depth = new Map() // comp -> 距最近根的最短层数
const routeSize = new Map() // route -> 该路由能到达的组件数

for (const r of routes) {
  if (!r.comp) continue
  const seen = new Set([r.comp])
  const queue = [[r.comp, 0]]
  while (queue.length) {
    const [cur, d] = queue.shift()
    const prev = depth.get(cur)
    if (prev === undefined || d < prev) depth.set(cur, d)
    for (const kid of children.get(cur) || []) {
      if (!kid.comp || seen.has(kid.comp)) continue
      seen.add(kid.comp)
      queue.push([kid.comp, d + 1])
    }
  }
  for (const comp of seen) {
    if (!reach.has(comp)) reach.set(comp, new Set())
    reach.get(comp).add(r.route)
  }
  routeSize.set(r.route, seen.size)
}

// ---------- 报表 ----------
const out = []
const push = (...xs) => out.push(...xs)

const tagRows = [...tagParents.entries()]
  .map(([tag, parents]) => ({
    tag,
    parentCount: parents.size,
    count: tagCount.get(tag) || 0,
    resolved: tagResolved.get(tag) || 0,
  }))
  .sort((a, b) => b.parentCount - a.parentCount || b.count - a.count)

const compRows = [...directParents.entries()]
  .map(([name, parents]) => ({
    name,
    parentCount: parents.size,
    routeCount: (reach.get(name) || new Set()).size,
    routes: [...(reach.get(name) || new Set())],
    depth: depth.get(name) ?? -1,
    childCount: (children.get(name) || []).length,
  }))
  .sort((a, b) => b.routeCount - a.routeCount || b.parentCount - a.parentCount)

push('# 组件复用度分析')
push('')
push('> 由 `10-逆向流水线/13-reuse.cjs` 从 `11-组件树.md` 生成，别手改')
push('')
push('## 一、概览')
push('')
push('| 项 | 数量 |')
push('|---|---|')
push(`| 路由 | ${routes.length} |`)
push(`| 组件总数 | ${children.size + [...directParents.keys()].filter((k) => !children.has(k)).length} |`)
push(`| 有子组件的 | ${children.size} |`)
push(`| 子组件引用总数 | ${refTotal} |`)
push(`| 已解析 | ${resolvedTotal} |`)
push(`| 未解析 | ${refTotal - resolvedTotal} |`)
push('')

push('## 二、按 tag 名的复用度（含未解析）')
push('')
push('> `出现组件数` = 有多少个不同的父组件用到它。这个数字才是"该先写谁"的依据。')
push('> `已解析` 为 0 的，说明原版用的是全局模块（`ie.a` 这种），没有对应文件，得自己写。')
push('')
// 已经写好的组件，用来标注进度
const DONE = new Set([
  'Icon',
  'IconFont',
  'GIcon',
  'GButton',
  'Button',
  'GInput',
  'GDropdown',
  'GMenu',
  'GMenuItem',
  'GTooltip',
  'BackTop',
  'NewSpin',
])

push('| 标签 | 出现组件数 | 出现次数 | 已解析 | 状态 |')
push('|---|---|---|---|---|')
for (const r of tagRows) {
  const state = DONE.has(r.tag) ? '已实现' : r.resolved === 0 ? '待写' : '待写（有原组件可参照）'
  push(`| \`${r.tag}\` | ${r.parentCount} | ${r.count} | ${r.resolved === 0 ? '0' : r.resolved} | ${state} |`)
}
push('')

push('## 三、已解析组件的可达页面数')
push('')
push('> `可达页面` 从路由根做 BFS 得到，包含间接引用。')
push('')
push('| 组件 | 可达页面 | 直接父数 | 深度 | 子组件数 |')
push('|---|---|---|---|---|')
for (const r of compRows.slice(0, 30)) {
  push(`| \`${r.name}\` | ${r.routeCount} | ${r.parentCount} | ${r.depth} | ${r.childCount} |`)
}
push('')

push('## 四、建议的第一批：原子组件')
push('')
push('> 判定标准：出现组件数 ≥ 3 且没有任何一次能解析到具体组件。')
push('> 这些是纯 UI 积木，不碰 jsx，写完所有页面都能复用。')
push('')
push('| 标签 | 出现组件数 | 出现次数 |')
push('|---|---|---|')
const atoms = tagRows.filter((r) => r.parentCount >= 3 && r.resolved === 0)
for (const r of atoms) push(`| \`${r.tag}\` | ${r.parentCount} | ${r.count} |`)
if (!atoms.length) push('| （无） | - | - |')
push('')

push('## 五、每个页面的组件规模')
push('')
push('> 用来判断哪个页面最重、该往后排。')
push('')
push('| 路由 | 页面 | 根组件 | 可达组件数 |')
push('|---|---|---|---|')
for (const r of routes) {
  const size = routeSize.get(r.route) ?? 0
  push(`| \`${r.route}\` | ${r.name} | ${r.comp ? `\`${r.comp}\`` : '⚠ 未解析'} | ${size} |`)
}
push('')

fs.writeFileSync(OUT, out.join('\n'), 'utf8')

// 控制台摘要
console.log(`已写入 ${OUT}`)
console.log(`路由 ${routes.length} / 组件 ${children.size} / 引用 ${refTotal}（已解析 ${resolvedTotal}）`)
console.log('\nTop 12 原子候选：')
for (const r of atoms.slice(0, 12)) console.log(`  ${r.tag.padEnd(24)} 用于 ${r.parentCount} 个组件，共 ${r.count} 次`)
console.log('\nTop 8 已解析组件：')
for (const r of compRows.slice(0, 8)) console.log(`  ${r.name.padEnd(24)} 可达 ${r.routeCount} 页，直接父 ${r.parentCount}`)
