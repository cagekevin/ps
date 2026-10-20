/**
 * 台账校验。
 *
 *   node scripts/ledger.mjs
 *
 * 校验四件事：
 *   1. ID 唯一
 *   2. 依赖的 ID 必须存在
 *   3. 状态是 doing/done 时，依赖必须都 done（防止"假装完成"）
 *   4. 代码里 TODO(T-xx) / FIXME(D-xx) 引用的 ID 必须存在
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const LEDGER = join(root, 'docs', '台账.md')
const SRC = join(root, 'src')

const DONE = 'done'

function parseRows() {
  const text = readFileSync(LEDGER, 'utf8')
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!/^\|\s*(T|D)-\d+/.test(trimmed)) continue
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 6) continue
    rows.push({
      id: cells[0],
      type: cells[1],
      title: cells[2],
      status: cells[3],
      deps: cells[4] === '-' ? [] : cells[4].split(/[,，]/).map((d) => d.trim()).filter(Boolean),
      note: cells[5],
    })
  }
  return rows
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else if (/\.(ts|vue|mjs|js)$/.test(name)) out.push(abs)
  }
  return out
}

const rows = parseRows()
const byId = new Map()
const errors = []
const warnings = []

if (!rows.length) {
  console.error('[ledger] 一条都没解析到，检查表格格式')
  process.exit(1)
}

for (const row of rows) {
  if (byId.has(row.id)) errors.push(`ID 重复：${row.id}`)
  byId.set(row.id, row)
}

for (const row of rows) {
  for (const dep of row.deps) {
    const target = byId.get(dep)
    if (!target) {
      errors.push(`${row.id} 依赖的 ${dep} 不存在`)
      continue
    }
    if ((row.status === 'doing' || row.status === DONE) && target.status !== DONE) {
      errors.push(`${row.id} 状态是 ${row.status}，但依赖 ${dep} 还是 ${target.status}`)
    }
  }
  if (row.status === 'doing' && row.deps.length && row.deps.every((d) => byId.get(d)?.status !== DONE)) {
    warnings.push(`${row.id} 标了 doing 但依赖都没完成，建议改成 blocked`)
  }
}

// 代码里的引用
const refRe = /\b(?:TODO|FIXME)\(((?:T|D)-\d+)\)/g
for (const abs of walk(SRC)) {
  const content = readFileSync(abs, 'utf8')
  for (const match of content.matchAll(refRe)) {
    if (!byId.has(match[1])) {
      errors.push(`${relative(root, abs).replace(/\\/g, '/')} 引用了不存在的 ${match[1]}`)
    }
  }
}

const counts = rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1
  return acc
}, {})

if (warnings.length) {
  console.warn('\n[ledger] 提醒：')
  for (const w of warnings) console.warn(`  ${w}`)
}

if (errors.length) {
  console.error('\n[ledger] 错误：')
  for (const e of errors) console.error(`  ${e}`)
  console.error('')
  process.exit(1)
}

console.log(
  `[ledger] 通过：${rows.length} 条（${Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(' / ')}）`,
)
