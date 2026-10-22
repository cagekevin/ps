/**
 * 横切能力注册表的校验与生成。
 *
 *   node scripts/registry.mjs check   校验：src/{cep,composables,stores,utils,styles} 下的每个文件
 *                                     都必须在 docs/生成/注册表.json 里登记，否则退出码 1
 *   node scripts/registry.mjs gen     用 生成/注册表.json 重新生成 docs/生成/横切能力.md 里的表格
 *
 * npm run build 会先跑 check —— 这就是"新能力必须登记"的强制机制。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const REG_PATH = join(root, 'docs', '生成/注册表.json')
const DOC_PATH = join(root, 'docs', '生成/横切能力.md')
const SCAN_DIRS = ['src/cep', 'src/composables', 'src/stores', 'src/utils', 'src/styles']
const EXTS = ['.ts', '.css']

const command = process.argv[2] ?? 'check'
const registry = JSON.parse(readFileSync(REG_PATH, 'utf8'))

/** 递归：`src/cep/data/` 这种子目录里的文件也算横切，不能只看一层 */
function scan() {
  const found = []
  for (const dir of SCAN_DIRS) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    found.push(...walk(abs, dir))
  }
  return found.sort()
}

function walk(absDir, relDir) {
  const out = []
  for (const name of readdirSync(absDir)) {
    const abs = join(absDir, name)
    if (statSync(abs).isDirectory()) {
      out.push(...walk(abs, `${relDir}/${name}`))
      continue
    }
    if (!EXTS.some((ext) => name.endsWith(ext))) continue
    out.push(`${relDir}/${name}`)
  }
  return out
}

function check() {
  const registered = new Set(registry.items.map((item) => item.entry))
  const dirEntries = [...registered].filter((file) => file.endsWith('/'))
  const coveredByDir = (file) => dirEntries.some((dir) => file.startsWith(dir))
  const found = scan()

  // 目录型条目（`src/cep/data/`）盖住的文件不要求逐条登记，否则表格变成文件清单
  const missing = found.filter((file) => !registered.has(file) && !coveredByDir(file))

  // 所有条目都要验存在：文档里指着一个不存在的文件，比没有文档更坏
  const stale = [...registered].filter((file) => !existsSync(join(root, file)))

  let failed = false

  if (missing.length) {
    failed = true
    console.error('\n[registry] 以下横切文件没有登记：')
    for (const file of missing) console.error(`  - ${file}`)
    console.error(
      '  请在 docs/生成/注册表.json 里补一条（name / api / when / status），再执行 npm run registry\n',
    )
  }

  if (stale.length) {
    console.warn('\n[registry] 注册表里有已经不存在的文件：')
    for (const file of stale) console.warn(`  - ${file}`)
    console.warn('  删掉对应条目，或确认文件是否被误删\n')
  }

  if (failed) process.exit(1)
  console.log(`[registry] 通过：${found.length} 个横切文件全部已登记`)
}

/**
 * 自动补骨架：扫到未登记文件就插一条空条目，人只需要填 name/api/when。
 * 把"登记"的成本从 2 分钟压到 20 秒。
 */
function fix() {
  const registered = new Set(registry.items.map((item) => item.entry))
  const missing = scan().filter((file) => !registered.has(file))

  if (!missing.length) {
    console.log('[registry] 没有遗漏，无需补条目')
    return
  }

  for (const file of missing) {
    registry.items.push({
      id: file
        .replace(/^src\//, '')
        .replace(/[\\/.]/g, '-')
        .toLowerCase(),
      name: '（待补：中文名）',
      entry: file,
      api: '（待补：怎么调）',
      when: '（待补：什么时候用）',
      status: 'todo',
      since: new Date().toISOString().slice(0, 10),
    })
  }

  registry.updated = new Date().toISOString().slice(0, 10)
  writeFileSync(REG_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
  console.log(`[registry] 已补 ${missing.length} 条骨架：`)
  for (const file of missing) console.log(`  - ${file}`)
  console.log('  请补全 name / api / when，然后执行 npm run registry')
}

function gen() {
  const header = '| 能力 | 入口 | 用法 | 什么时候用 | 状态 |\n|---|---|---|---|---|'
  const rows = registry.items
    .map(
      (item) =>
        `| ${item.name} | \`${item.entry}\` | ${item.api} | ${item.when} | ${item.status} |`,
    )
    .join('\n')
  const table = `${header}\n${rows}`

  const doc = readFileSync(DOC_PATH, 'utf8')
  const start = '<!-- registry:start -->'
  const end = '<!-- registry:end -->'
  const from = doc.indexOf(start)
  const to = doc.indexOf(end)

  if (from === -1 || to === -1) {
    console.error('[registry] 文档里找不到 registry:start / registry:end 标记')
    process.exit(1)
  }

  const next = doc.slice(0, from + start.length) + '\n\n' + table + '\n\n' + doc.slice(to)
  writeFileSync(DOC_PATH, next, 'utf8')
  console.log(`[registry] 已更新 docs/生成/横切能力.md（${registry.items.length} 条）`)
}

if (command === 'check') check()
else if (command === 'gen') gen()
else if (command === 'fix') fix()
else {
  console.error(`未知命令：${command}（可用：check / gen / fix）`)
  process.exit(1)
}
