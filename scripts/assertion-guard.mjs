#!/usr/bin/env node
/**
 * 断言守卫 —— 禁 `as any` / `as unknown as`（双转型），禁消费者替生产者捏造。
 *
 *   node scripts/assertion-guard.mjs            检查（默认，进 `npm run check`）
 *   node scripts/assertion-guard.mjs --update   把当前违规数量写进 docs/生成/断言基线.json
 *
 * 为什么要有这一道：T-97-8 真机 bug——`readCommonUseOptions() as unknown as Record<string, unknown>`
 * 把 async 的 Promise 当同步对象用，分支恒为 `'none'`：**点了没反应、不报错、测试全绿**。
 * 规则见 AGENTS.md 硬规则 20。
 *
 * 允许的只有两类：
 * 1. **第三方边界**（CEP 注入的 `__adobe_cep__` / `require`、`process.env`、`globalThis`），
 *    且**同一条语句或上一行**写了 `// 断言理由：…`；
 * 2. 基线里已登记的存量（只许减少，不许增加）。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'src')
const BASELINE = join(root, 'docs', '生成/断言基线.json')

/** 违规形态：`as any` 与双转型 `as unknown as` */
const RULES = [
  { name: 'as any', re: /\bas\s+any\b/g },
  { name: 'as unknown as', re: /\bas\s+unknown\s+as\b/g },
]

/** 转型理由注释的固定标记；换写法守卫不认，避免"随便写个注释就过" */
const REASON = '断言理由：'

/**
 * 结构闸：`pick()` 不许在**模块加载时**定死实现（T-113）。
 *
 * 13 个仓库都在 import 期调 `pick()`（`actions.ts` / `common-use.ts` / `font-extra.ts` / …）。
 * 一旦 `pick.ts` 里写回 `return hasCep() ? fileRepo(...) : memoryRepo(...)`，
 * 测试只要把 CEP 桥装晚一步（或者忘了装），就静默走 `memoryRepo`——**永不失败**，
 * 于是"喂 EPERM 也不会红"：用例全绿但测的是内存仓库。T-111 第一版、更早的 mock 类型闸
 * 都是这个形态。
 *
 * 这条不是"规矩"，是**根因的形状**：只要 pick 是懒求值，顺序问题就不存在。
 * 所以它拦的不是测试怎么写，而是 pick 又变回急求值。
 */
const PICK_FILE = join(root, 'src/cep/data/pick.ts')
const EAGER_PICK = /return\s+hasCep\s*\(\s*\)\s*\?/

function checkPickIsLazy() {
  const lines = readFileSync(PICK_FILE, 'utf8').split('\n')
  const hits = []
  lines.forEach((line, index) => {
    if (isCommentLine(line)) return
    if (EAGER_PICK.test(line)) {
      hits.push({ file: 'src/cep/data/pick.ts', line: index + 1, text: line.trim() })
    }
  })
  return hits
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(abs))
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(abs)
  }
  return out
}

/** 注释行不算违规（注释里提到 `as unknown as` 是在讲道理，不是在做转型） */
function isCommentLine(line) {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

function scan() {
  /** @type {Map<string, Array<{line:number, text:string, rule:string}>>} */
  const found = new Map()

  for (const abs of walk(SRC)) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    const lines = readFileSync(abs, 'utf8').split('\n')

    lines.forEach((line, index) => {
      if (isCommentLine(line)) return
      for (const { name, re } of RULES) {
        re.lastIndex = 0
        if (!re.test(line)) continue
        // 理由注释可以写在同一行末尾，也可以写在上一条非空行
        let prev = index - 1
        while (prev >= 0 && lines[prev].trim() === '') prev -= 1
        const hasReason = line.includes(REASON) || (prev >= 0 && lines[prev].includes(REASON))
        if (hasReason) continue
        if (!found.has(rel)) found.set(rel, [])
        found.get(rel).push({ line: index + 1, text: line.trim(), rule: name })
      }
    })
  }

  return found
}

const found = scan()
const counts = {}
for (const [file, hits] of found) counts[file] = hits.length

/** 结构闸的命中（不受基线影响：这条例外为零，不存在"存量"） */
const eagerPick = checkPickIsLazy()

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  const total = Object.values(sorted).reduce((a, b) => a + b, 0)
  console.log(
    `[assert] 已写入 ${relative(root, BASELINE)}：${Object.keys(sorted).length} 个文件 / ${total} 处`,
  )
  process.exit(0)
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}
const violations = []

for (const [file, hits] of found) {
  const allowed = baseline[file] ?? 0
  if (hits.length > allowed) {
    for (const hit of hits.slice(allowed)) violations.push({ file, ...hit })
  }
}

const stale = Object.entries(baseline).filter(([file, n]) => (counts[file] ?? 0) < n)

if (violations.length === 0 && eagerPick.length === 0) {
  console.log(
    '[assert] 通过：没有新增 `as any` / `as unknown as`（第三方边界需写 `// 断言理由：…`）',
  )
  console.log('[assert] 通过：`pick()` 仍是首次使用时定实现（模块加载期定死会制造测试假绿）')
  if (stale.length) {
    console.log(
      `[assert] 提示：${stale.length} 个文件的违规数已下降，跑 \`npm run assert:baseline\` 收紧基线`,
    )
  }
  process.exit(0)
}

if (eagerPick.length) {
  console.error('[assert] 失败：`pick()` 又变回模块加载时定实现（T-113）\n')
  for (const v of eagerPick) {
    console.error(`  ${v.file}:${v.line}`)
    console.error(`    ${v.text.slice(0, 120)}`)
  }
  console.error(
    '\n为什么拦：13 个仓库在 import 期调 `pick()`。写回 `return hasCep() ? … : memoryRepo(…)`',
  )
  console.error('之后，测试只要把 CEP 桥装晚一步（或忘了装）就静默走内存仓库——永不失败，')
  console.error('喂 EPERM 也不会红，用例全绿但测的不是真实接线（T-111 第一版踩过）。')
  console.error(
    '\n怎么改：保留 `let impl: Repo<T> | null` + `impl ??= hasCep() ? … : …` 的懒求值写法，',
  )
  console.error('让实现在**第一次调用**时才定；顺序问题就不存在了。')
  process.exit(1)
}

console.error(`[assert] 失败：${violations.length} 处新增双转型（AGENTS.md 硬规则 20）\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.rule}`)
  console.error(`    ${v.text.slice(0, 120)}`)
}
console.error('\n怎么改：')
console.error('  1. 改**生产者**的类型（函数签名 / 返回值 / 契约），不要改消费者的断言；')
console.error('  2. 字段/返回值缺了就补生产者，不许在消费侧兜底、补默认值、猜字段；')
console.error(`  3. 只有第三方边界（CEP 注入的 __adobe_cep__ / require / process.env）可以转型，`)
console.error(`     且必须在同一行或上一行写 \`// ${REASON}<为什么>\`。`)
process.exit(1)
