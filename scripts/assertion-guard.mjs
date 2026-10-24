#!/usr/bin/env node
/**
 * 断言守卫 —— 禁 `as any` / `as unknown as`（双转型），禁消费者替生产者捏造。
 *
 *   node scripts/assertion-guard.mjs            检查（默认，进 `npm run check`）
 *   node scripts/assertion-guard.mjs --update   把当前违规数量写进 docs/生成/断言基线.json
 *   node scripts/assertion-guard.mjs --root=<dir>   只给测试用（临时目录里造 src/）
 *
 * 为什么要有这一道：T-97-8 真机 bug——`readCommonUseOptions() as unknown as Record<string, unknown>`
 * 把 async 的 Promise 当同步对象用，分支恒为 `'none'`：**点了没反应、不报错、测试全绿**。
 * 规则见 AGENTS.md 硬规则 20；判据归属 TD-17-11 / TD-17-23。
 *
 * 【判据：转型必须作用在「第三方边界」上，理由注释只是登记，不是许可证】
 *   旧版判据是"同行或上一行写了 `// 断言理由：…` 就放行"，于是 `// 断言理由：我懒得改`
 *   等于一张空白许可证。现在反过来：
 *     ① 语句里必须出现**运行时注入的边界符号**（`window` / `globalThis` / `import.meta`，
 *        以及 `*.d.ts` 里 `declare var|const` 声明的全局、`interface Window` 的成员）；
 *     ② 还要有 `// 断言理由：…`（AGENTS 硬规则 20：无注释即违规）。
 *   边界符号集合**从 `.d.ts` 读出来**，不在这里手抄一份 —— 抄一份就是第二份真相：
 *   运行时注入什么，只有类型声明知道。
 *
 * 【跨行】整份文件按偏移量扫（`\s` 天然吃换行），不再逐行 matchAll：
 *   `foo as unknown` ⏎ `as Record<…>` 这种折行写法旧版整条漏扫。
 *
 * 【存量：只在「具名例外清单」里放行】
 *   盘上既有 2 处由 `NAMED` 具名（文件:行 + 为什么现在不改 + 谁负责），放行条数在
 *   `docs/生成/断言基线.json`（`--update`）。两者必须对齐：基线里有、NAMED 里没有 ⇒ 红；
 *   NAMED 里有、基线里没有 ⇒ 红（过期豁免要删）；条数不一致 ⇒ 红。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSources, maskComments, lineOf, statementAt, walkSources } from './source-scan.mjs'

/** `--root=<dir>` 只给测试用；生产不传 = 仓库根 */
const ROOT =
  process.argv.find((a) => a.startsWith('--root='))?.slice(7) ??
  fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const BASELINE = join(ROOT, 'docs', '生成/断言基线.json')

/** 违规形态：`as any` 与双转型 `as unknown as` */
const RULES = [
  { name: 'as any', re: /\bas\s+any\b/g },
  { name: 'as unknown as', re: /\bas\s+unknown\s+as\b/g },
]

/** 转型理由注释的固定标记；换写法守卫不认，避免"随便写个注释就过" */
const REASON = '断言理由：'

/** 语言自带的边界载体：它们不是仓库代码，类型系统里没有出处 */
const LIB_BOUNDARY = ['window', 'globalThis', 'import.meta', 'self']

/**
 * 从 `.d.ts` 读「运行时注入」的符号：
 *   `declare var process` / `declare const __BUILD_TIME__` / `interface Window { __adobe_cep__?… }`
 * 为什么读声明而不是写一份名单：注入什么由运行时与声明共同决定，
 * 名单一旦手写，就永远慢于声明一步（A4：手写名单式白名单本身是母体）。
 */
function boundarySymbols() {
  const names = new Set(LIB_BOUNDARY)
  for (const file of [
    ...walkSources(SRC, ['.d.ts']),
    ...walkSources(join(ROOT, 'types'), ['.d.ts']),
  ]) {
    const text = maskComments(readFileSync(file, 'utf8'))
    for (const m of text.matchAll(/declare\s+(?:var|const|let|function)\s+([A-Za-z_$][\w$]*)/g)) {
      names.add(m[1])
    }
    for (const block of text.matchAll(/interface\s+Window\s*\{([\s\S]*?)\n\}/g)) {
      for (const m of block[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*[:(]/gm)) names.add(m[1])
    }
  }
  return names
}

const BOUNDARY = boundarySymbols()

/** 语句里是否出现边界符号（整词，避免 `windowed` 之类误命中） */
function touchesBoundary(statement) {
  for (const name of BOUNDARY) {
    const re = new RegExp(name.includes('.') ? name.replace('.', '\\.') : `\\b${name}\\b`)
    if (re.test(statement)) return name
  }
  return null
}

/** 理由注释：同一行尾，或紧邻的上一行（允许隔空行） */
function hasReason(lines, lineNo) {
  if (lines[lineNo - 1]?.includes(REASON)) return true
  let prev = lineNo - 2
  while (prev >= 0 && lines[prev].trim() === '') prev -= 1
  return prev >= 0 && lines[prev].includes(REASON)
}

function scan() {
  /** @type {Map<string, Array<{line:number, text:string, rule:string, why:string}>>} */
  const found = new Map()
  const excused = []

  for (const { file, text, masked } of loadSources(SRC, ['.ts', '.vue'])) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    const lines = text.split('\n')

    for (const { name, re } of RULES) {
      const global = new RegExp(re.source, 'g')
      for (const match of masked.matchAll(global)) {
        const { text: statement } = statementAt(masked, match.index)
        const line = lineOf(masked, match.index)
        const boundary = touchesBoundary(statement)
        const reasoned = hasReason(lines, line)
        const snippet = statement.replace(/\s+/g, ' ').trim().slice(0, 140)

        if (boundary && reasoned) {
          excused.push({ file: rel, line, boundary, name })
          continue
        }
        if (!found.has(rel)) found.set(rel, [])
        found.get(rel).push({
          line,
          text: lines[line - 1]?.trim() ?? snippet,
          rule: name,
          why: boundary
            ? `作用在第三方边界 \`${boundary}\` 上，但没写 \`// ${REASON}…\``
            : '转型不在第三方边界上（语句里没有 `window` / `globalThis` / `.d.ts` 声明的注入符号）',
        })
      }
    }
  }
  return { found, excused }
}

/**
 * 结构闸：`hasCep()` 不许出现在**模块顶层语句**里（T-113）。
 *
 * 13 个仓库都在 import 期调 `pick()`。一旦 `pick.ts` 写成
 * `const impl = hasCep() ? fileRepo(...) : memoryRepo(...)`（或 `return hasCep() ? …`），
 * 测试只要把 CEP 桥装晚一步就静默走 `memoryRepo`——**永不失败**，喂 EPERM 也不红。
 *
 * 判据是**位置**而不是写法：模块顶层（缩进 0）出现 `hasCep()` 即红。
 * 旧版只认 `return hasCep() ?` 一种写法，`const impl = hasCep() ?` 照样放行（TD-17-23 补）。
 *
 * 只扫 `src/cep/data/**`：这条闸拦的是"选错的实现**静默成功**"（memoryRepo 永不失败）。
 * `src/cep/jsx/index.ts:32` 的 `createJsxPort(hasCep())` 也是加载期求值，但选错的 mock port
 * 在 CEP 里会**当场报错**而不是静默成功，危害不同形，故不在本条判据内（另案登记）。
 */
function checkTopLevelHasCep() {
  const hits = []
  for (const { file, masked } of loadSources(join(SRC, 'cep', 'data'), ['.ts'])) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    masked.split('\n').forEach((line, index) => {
      if (!/\bhasCep\s*\(/.test(line)) return
      if (/^\s/.test(line)) return // 缩进 = 在函数体内，属于首次使用时求值
      // 声明行不是求值：`export function hasCep(` / `const hasCep =`
      if (/\bfunction\s+hasCep\b/.test(line) || /\bconst\s+hasCep\b/.test(line)) return
      hits.push({ file: rel, line: index + 1, text: line.trim() })
    })
  }
  return hits
}

const { found, excused } = scan()
const counts = {}
for (const [file, hits] of found) counts[file] = hits.length

/** 具名例外清单：文件:行 + 为什么现在不改 + 谁负责 */
const NAMED = [
  {
    file: 'src/cep/data/common-use.ts',
    count: 1,
    where: 'src/cep/data/common-use.ts:106  `(file as unknown as { info?: unknown } | null)?.info`',
    why: '读坏文件仍要渲染 + `degraded` 提示（ADR-0014 合规降级），转型在数据层归一旧格式；改成形状守卫要动 repo 的读侧契约',
    owner: '阶段 3（G1 剩余）/ 用户决定',
  },
  {
    file: 'src/cep/transport.ts',
    count: 1,
    where: 'src/cep/transport.ts:118  `return raw as unknown as T`',
    why: 'jsx 回包是 `unknown`（CEP 注入），transport 是唯一把它交给泛型的口子；应改成出口处形状守卫，属契约折叠',
    owner: '阶段 4（G3 契约折叠）/ 用户决定',
  },
]

const eagerPick = checkTopLevelHasCep()

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  const total = Object.values(sorted).reduce((a, b) => a + b, 0)
  console.log(
    `[assert] 已写入 ${relative(ROOT, BASELINE)}：${Object.keys(sorted).length} 个文件 / ${total} 处`,
  )
  process.exit(0)
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}
const isRepoRun = !process.argv.some((a) => a.startsWith('--root='))
const unnamed = isRepoRun
  ? Object.keys(baseline).filter((f) => !NAMED.some((n) => n.file === f))
  : []
const expired = isRepoRun ? NAMED.filter((n) => !(n.file in baseline)) : []
const mismatched = isRepoRun
  ? NAMED.filter((n) => n.file in baseline && (baseline[n.file] ?? 0) !== n.count)
  : []

/** 逐条扣减基线配额：允许 N 处，只报第 N+1 处 */
const quota = {}
for (const [file, hits] of found) {
  const allowed = baseline[file] ?? 0
  quota[file] = allowed
  if (hits.length > allowed) {
    if (!quota.violations) quota.violations = []
    quota.violations.push(...hits.slice(allowed).map((hit) => ({ file, ...hit })))
  }
}
const violations = quota.violations ?? []
const stale = Object.entries(baseline).filter(([file, n]) => (counts[file] ?? 0) < n)

if (
  violations.length === 0 &&
  eagerPick.length === 0 &&
  unnamed.length === 0 &&
  expired.length === 0 &&
  mismatched.length === 0
) {
  console.log(
    `[assert] 通过：没有新增 \`as any\` / \`as unknown as\`（转型必须在第三方边界上且写 \`// ${REASON}…\`）`,
  )
  console.log(
    `[assert] 通过：\`hasCep()\` 不在模块顶层（首次使用时定实现；顶层定死会制造测试假绿）`,
  )
  if (excused.length) {
    const list = [...new Set(excused.map((e) => `${e.file}:${e.line}(${e.boundary})`))]
    console.log(
      `[assert] 边界内转型 ${list.length} 处（已核对语句里确有注入符号）：${list.join(', ')}`,
    )
  }
  const allowed = Object.values(baseline).reduce((a, b) => a + b, 0)
  if (allowed)
    console.log(`[assert] 放行存量 ${allowed} 处，全部在 NAMED 里具名（为什么现在不改 / 谁负责）`)
  if (stale.length) {
    console.log(`[assert] 提示：${stale.length} 个文件的违规数已下降，跑 \`--update\` 再同步 NAMED`)
  }
  process.exit(0)
}

if (eagerPick.length) {
  console.error('[assert] 失败：`hasCep()` 出现在模块顶层（T-113）\n')
  for (const v of eagerPick) {
    console.error(`  ${v.file}:${v.line}`)
    console.error(`    ${v.text.slice(0, 120)}`)
  }
  console.error('\n为什么拦：13 个仓库在 import 期调 `pick()`。顶层求值意味着"桥装晚一步/忘了装"')
  console.error('就静默走 `memoryRepo`——永不失败，喂 EPERM 也不会红，用例全绿但测的不是真实接线。')
  console.error('\n怎么改：把 `hasCep()` 放进只在**首次调用**时执行的闭包里，')
  console.error(
    '例如 `let impl: Repo<T> | null = null; const repo = () => (impl ??= hasCep() ? … : …)`。',
  )
  console.error('')
}

if (violations.length) {
  console.error(`[assert] 失败：${violations.length} 处违规转型（AGENTS.md 硬规则 20）\n`)
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.rule}`)
    console.error(`    ${v.text.slice(0, 120)}`)
    console.error(`    ${v.why}`)
  }
  console.error('\n怎么改：')
  console.error('  1. 改**生产者**的类型（函数签名 / 返回值 / 契约），不要改消费者的断言；')
  console.error('  2. 字段/返回值缺了就补生产者，不许在消费侧兜底、补默认值、猜字段；')
  console.error('  3. 只有第三方边界（CEP 注入的 __adobe_cep__ / require / process.env）可以转型，')
  console.error(`     且必须在同一行或上一行写 \`// ${REASON}<为什么>\`。`)
  console.error('')
}

for (const [label, list] of [
  ['基线里有存量没进 NAMED（不许出现没人认领的放行）：', unnamed.map((f) => `  ${f}`)],
  ['NAMED 里的例外已经不在基线里（过期豁免要删）：', expired.map((n) => `  ${n.where}`)],
  [
    'NAMED 的条数与基线不一致：',
    mismatched.map((n) => `  ${n.file}：NAMED=${n.count} 基线=${baseline[n.file]}`),
  ],
]) {
  if (list.length) {
    console.error(`[assert] ${label}`)
    for (const line of list) console.error(line)
    console.error('')
  }
}
process.exit(1)
