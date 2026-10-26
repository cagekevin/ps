/**
 * 任务索引校验 —— **只管任务侧**（债侧已交给 `scripts/debt.mjs check`）。
 *
 *   node scripts/ledger.mjs
 *
 * 查两件事：
 *   1. `daily/架构日志/00-任务-总索引.md` 里的任务 ID 唯一；
 *   2. 代码里 `TODO(T-xx)` / `FIXME(T-xx)` 引用的 ID 在任务索引里真实存在（T-xx 是任务编号）。
 *
 * 【为什么债侧不在这儿】债的**编号唯一 / 锚点存在 / 状态白名单 / 两表分区**由
 *   `node scripts/debt.mjs check` 查（债侧只留一份判据）。
 *   ⚠️ `debt.mjs check` 是**独立命令，不进 `npm run check`** —— 账本是手写数据，手写文档不作为门禁；
 *   要跑就手动跑一次（`node scripts/debt.mjs check`）。
 *   两处各查一半 = 两份真相 ⇒ 债侧只留一份，本文件只留任务侧。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const TASKS = join(root, 'daily', '架构日志', '00-任务-总索引.md')
const SRC = join(root, 'src')

const errors = []

/** 任务索引里的全部编号 */
function parseTaskIds(file) {
  if (!existsSync(file)) return []
  const ids = []
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\|\s*(T-[\w-]+)\s*\|/)
    if (m) ids.push(m[1])
  }
  return ids
}

const taskIds = parseTaskIds(TASKS)

// 1. 任务 ID 唯一
{
  const seen = new Set()
  for (const id of taskIds) {
    if (seen.has(id)) errors.push(`任务 ID 重复：${id}`)
    else seen.add(id)
  }
}

// 2. 代码里的 TODO(T-xx) / FIXME(T-xx) 必须在任务索引里
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

console.log(`[ledger] 通过：任务 ${taskIds.length} 条（daily/架构日志/00-任务-总索引.md）`)
console.log('[ledger] 债侧不在本脚本 —— 走 `node scripts/debt.mjs check`')
