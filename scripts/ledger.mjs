/**
 * 债务账本校验（旧「台账」已于 2026-10-24 迁入 daily/架构日志/债务.md）。
 *
 *   node scripts/ledger.mjs
 *
 * 校验三件事（口径与 scripts/debt.mjs 的 `audit` 对齐，本文件多查一件它查不了的）：
 *   1. ID 唯一（主表 + 归档各自唯一，且跨两表也不重复）
 *   2. 锚点必须是区域日志文件名，且文件真的存在
 *   3. 代码里 `TODO(T-xx)` / `FIXME(D-xx)` 引用的 ID 必须在
 *      `daily/架构日志/00-任务-总索引.md` 里存在（T-xx 是任务编号，见该文件）
 *
 * 【为什么还留这个脚本】`npm run check` 的 `ledger` 一步从 2026-10-24 起指向它。
 * 债侧的格式 / 枚举 / 锚点校验由 `node scripts/debt.mjs audit` 负责（那才是唯一写入口的
 * 同一份判据），本脚本只保留**跨文件**的约束：代码注释里的编号必须能在账本侧找到。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const LOG_DIR = join(root, 'daily', '架构日志')
const LEDGER = join(LOG_DIR, '债务.md')
const ARCHIVE = join(LOG_DIR, '债务-归档.md')
const TASKS = join(LOG_DIR, '00-任务-总索引.md')
const SRC = join(root, 'src')

const errors = []

/** 主表 / 归档 / 任务索引里的全部编号 */
function parseIds(file, re) {
  if (!existsSync(file)) return []
  const ids = []
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(re)
    if (m) ids.push(m[1])
  }
  return ids
}

const debtIds = [
  ...parseIds(LEDGER, /^\|\s*(TD-\d+-\d+)\s*\|/),
  ...parseIds(ARCHIVE, /^\|\s*(TD-\d+-\d+)\s*\|/),
]
const taskIds = parseIds(TASKS, /^\|\s*(T-[\w-]+)\s*\|/)

// 1. ID 唯一（跨主表 + 归档）
{
  const seen = new Map()
  for (const id of debtIds) {
    if (seen.has(id)) errors.push(`ID 重复：${id}`)
    else seen.set(id, true)
  }
}
{
  const seen = new Map()
  for (const id of taskIds) {
    if (seen.has(id)) errors.push(`任务 ID 重复：${id}`)
    else seen.set(id, true)
  }
}

// 2. 锚点合法性：必须是区域日志文件名且存在
{
  for (const file of [LEDGER, ARCHIVE]) {
    if (!existsSync(file)) continue
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line) => {
        const m = line.match(/^\|\s*(TD-\d+-\d+)\s*\|/)
        if (!m) return
        const a = line.match(/\]\(\.\/([^)]+)\)/)
        if (!a) return
        const anchor = a[1]
        if (!/^\d{2}-[^/\\|]+\.md$/.test(anchor)) {
          errors.push(`${m[1]}：锚点不是区域日志命名（${anchor}）`)
          return
        }
        if (!existsSync(join(LOG_DIR, anchor))) {
          errors.push(`${m[1]}：锚点文件不存在（${anchor}）`)
        }
      })
  }
}

// 3. 代码里的 TODO(T-xx) / FIXME(D-xx) 必须在任务索引里
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else if (/\.(ts|vue|mjs|js)$/.test(name)) out.push(abs)
  }
  return out
}
{
  const taskSet = new Set(taskIds)
  const refRe = /\b(?:TODO|FIXME)\((T-[\w-]+)\)/g
  for (const abs of walk(SRC)) {
    const content = readFileSync(abs, 'utf8')
    for (const match of content.matchAll(refRe)) {
      if (!taskSet.has(match[1])) {
        errors.push(
          `${relative(root, abs).replace(/\\/g, '/')} 引用了不存在的 ${match[1]}（任务编号见 daily/架构日志/00-任务-总索引.md）`,
        )
      }
    }
  }
}

if (errors.length) {
  console.error('\n[ledger] 错误：')
  for (const e of errors) console.error('  ' + e)
  console.error('')
  process.exit(1)
}

const statusCount = (file) => {
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!/^\|\s*TD-\d+-\d+\s*\|/.test(line)) continue
    const m = line.match(/\[(待还|待用户拍板|待翻新|已解决|已裁定非债|已裁定|已退役|不做)/)
    if (m) out[m[1]] = (out[m[1]] || 0) + 1
  }
  return out
}

const main = statusCount(LEDGER)
const arch = statusCount(ARCHIVE)
const fmt = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k} ${v}`)
    .join(' / ') || '（无）'
console.log(`[ledger] 通过：债务 ${debtIds.length} 条（主表 ${fmt(main)} ｜ 归档 ${fmt(arch)}）`)
console.log(`[ledger] 任务 ${taskIds.length} 条（daily/架构日志/00-任务-总索引.md）`)
