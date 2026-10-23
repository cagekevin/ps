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

if (violations.length === 0) {
  console.log(
    '[assert] 通过：没有新增 `as any` / `as unknown as`（第三方边界需写 `// 断言理由：…`）',
  )
  if (stale.length) {
    console.log(
      `[assert] 提示：${stale.length} 个文件的违规数已下降，跑 \`npm run assert:baseline\` 收紧基线`,
    )
  }
  process.exit(0)
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
