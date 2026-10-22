/**
 * 规模数字生成与校验（命令数 / 用例数 / 组件数 / 图标数 / 页面数 / 组件表行数 …）。
 *
 *   node scripts/stats.mjs gen     重新生成 docs/生成/规模.json、docs/生成/规模.md，
 *                                  并改写 docs/状态/进度.md 里的注入块
 *   node scripts/stats.mjs --check  校验上面三处与源码真值一致（不一致退出 1）
 *   node scripts/stats.mjs --json   只把真值打到 stdout
 *
 * 为什么做这个：规模数字原来手抄在 docs/状态/进度.md 里（命令数、测试数、组件数、图标数），
 * 每次加代码就漂一次（实测：文档写 99 条命令 / 56 个测试文件 344 处用例，
 * 源码实际是 104 条 / 74 个文件 651 处）。改成"真值在代码里，文档只做注入块"——
 * 改代码不改文档 = check 直接红。
 *
 * ── 统计口径（口径跟着生成物一起走；改这里等于改数字定义）────────────────────────
 *   命令数：src/commands/<域>.ts 里 `id: '<域>.<名>'` 的 id 字面量条数，按 id 前缀分域。
 *           含 legacy（legacy.* 计入 legacy 域）；不含 registry / payloads / types /
 *           index / runtime 这些非域文件。
 *   用例数：tests 目录下的 .test.ts 文件里 `it(` / `test(` 的**调用点**数（静态计数）。
 *           `it.each` / `test.each` 按 1 处计，展开后的条数不算。
 *           这是"用例数（静态计数）"，**不是"通过数"**——通过数只有真跑 vitest 才有。
 *   组件数：src/components/*.vue 顶层文件数（不含子目录）。
 *   图标数：src/assets/icons-sprite.svg 里 <symbol> 的个数。
 *   页面数：src/pages 下的页面目录（各含 index.vue）个数，排除 _ 前缀的内部目录
 *           （_atoms / _placeholder / _probe）。
 *   宿主事件数：src/cep/events.ts 的 EVENT_IDS 记录条目数。
 *   组件表行数：docs/页面/<页>.md「一、组件展开」小节里表格的**数据行**数
 *           （以 `| ` 开头的行，减去表头行与分隔行）。
 *   待办格数：docs/页面/<页>.md 里 `☐` 的出现次数（组件表里"还没做"的行）。
 *   未确认数：docs/页面/<页>.md「结构对照（逐项）」小节里 `未确认` 的出现次数。
 *   页面用例数：tests 下指定页面的 .test.ts 文件里 it()/test() 调用点数（同用例数口径）。
 *
 * 为什么不写生成时间：产物必须逐字节可复现，否则 --check 永远红。
 * 注入块语法：<!-- stats:begin <名字> -->…<!-- stats:end <名字> -->
 *   同一名字可以在文档里出现多次（每次都要被改写）；名字必须在本脚本已注册，
 *   否则报错退出——不静默跳过。
 * ──────────────────────────────────────────────────────────────────────────────
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const COMMANDS_DIR = join(root, 'src/commands')
const TESTS_DIR = join(root, 'tests')
const COMPONENTS_DIR = join(root, 'src/components')
const SPRITE = join(root, 'src/assets/icons-sprite.svg')
const PAGES_DIR = join(root, 'src/pages')
const EVENTS_FILE = join(root, 'src/cep/events.ts')
const PAGE_DOCS_DIR = join(root, 'docs/页面')

const OUT_JSON = join(root, 'docs/生成/规模.json')
const OUT_MD = join(root, 'docs/生成/规模.md')
const PROGRESS = join(root, 'docs/状态/进度.md')

/** 非域文件：里面没有命令定义，不参与命令数统计 */
const NON_DOMAIN_FILES = new Set([
  'registry.ts',
  'payloads.ts',
  'types.ts',
  'index.ts',
  'runtime.ts',
])

/** 页面 → 它的验收清单文件（组件表行数从这里数） */
const PAGE_DOCS = {
  fontManage: '01-字体管理.md',
  fontSet: '02-字体面板.md',
  action: '03-动作.md',
  custom: '04-自定义.md',
  commonUse: '05-常用.md',
  style: '06-样式.md',
  rename: '07-重命名.md',
  set: '08-设置.md',
}

/* ------------------------------------------------------------------ 真值计算 */

/** 递归收集文件 */
function walk(absDir) {
  const out = []
  if (!existsSync(absDir)) return out
  for (const name of readdirSync(absDir)) {
    const abs = join(absDir, name)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else out.push(abs)
  }
  return out
}

function countCommands() {
  const byDomain = {}
  for (const file of readdirSync(COMMANDS_DIR)) {
    if (!file.endsWith('.ts') || NON_DOMAIN_FILES.has(file)) continue
    const text = readFileSync(join(COMMANDS_DIR, file), 'utf8')
    // 只认字面量 id（'域.名'）；模板串 / 变量拼出来的 id 不算——那类命令不适合计数
    for (const m of text.matchAll(/\bid:\s*'([a-z][A-Za-z0-9]*)\.([A-Za-z0-9_.]+)'/g)) {
      byDomain[m[1]] = (byDomain[m[1]] ?? 0) + 1
    }
  }
  const total = Object.values(byDomain).reduce((a, b) => a + b, 0)
  return { total, byDomain }
}

function countTests() {
  const files = walk(TESTS_DIR).filter((f) => f.endsWith('.test.ts'))
  let cases = 0
  let eachSites = 0
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    // \b(it|test)\s*\( 不会匹配 it.each( —— each 展开后是几条，本口径按 1 处计
    cases += (text.match(/\b(?:it|test)\s*\(/g) ?? []).length
    eachSites += (text.match(/\b(?:it|test)\.each/g) ?? []).length
  }
  return { files: files.length, cases, eachSites }
}

function countComponents() {
  if (!existsSync(COMPONENTS_DIR)) return 0
  return readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.vue')).length
}

function countIcons() {
  if (!existsSync(SPRITE)) return 0
  return (readFileSync(SPRITE, 'utf8').match(/<symbol/g) ?? []).length
}

function countPages() {
  if (!existsSync(PAGES_DIR)) return 0
  return readdirSync(PAGES_DIR).filter(
    (name) => !name.startsWith('_') && existsSync(join(PAGES_DIR, name, 'index.vue')),
  ).length
}

/** 宿主事件数：EVENT_IDS 记录里 `name: 'id',` 的条数 */
function countHostEvents() {
  if (!existsSync(EVENTS_FILE)) return 0
  const text = readFileSync(EVENTS_FILE, 'utf8')
  const m = text.match(/const EVENT_IDS[\s\S]*?\n\}/)
  if (!m) return 0
  return (m[0].match(/^\s{2}[a-zA-Z]+:\s*'/gm) ?? []).length
}

/**
 * 组件表行数：docs/页面/<页>.md「一、组件展开」小节里表格的**数据行**数。
 * 表格行分三种：数据行（`| ` 开头）、表头行（第一列不是 `---`）、分隔行（`|---` 开头）。
 * 数据行 = 表格总行数 - 分隔行数 - 表头行数；一张表一个表头。
 */
function countComponentTableRows(page) {
  const doc = PAGE_DOCS[page]
  if (!doc) return null
  const file = join(PAGE_DOCS_DIR, doc)
  if (!existsSync(file)) return null
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const start = lines.findIndex((l) => l.startsWith('## 一、组件展开'))
  if (start === -1) return null

  let pipe = 0 // 所有以 | 开头的行
  let sep = 0 // 分隔行
  let headers = 0 // 表头行
  let inTable = false
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('## ')) break
    if (!line.startsWith('|')) {
      inTable = false
      continue
    }
    pipe++
    if (/^\|[\s:-]*-{3,}/.test(line)) {
      sep++
      inTable = true
      continue
    }
    if (!inTable) {
      headers++
      inTable = true
    }
  }
  return Math.max(0, pipe - sep - headers)
}

/** 字体面板页接到自由面板的顶部图标数：src/pages/fontSet/index.vue 里 openFreePanel( 的调用数 */
function countFontSetFreePanelIcons() {
  const file = join(PAGES_DIR, 'fontSet', 'index.vue')
  if (!existsSync(file)) return 0
  return (readFileSync(file, 'utf8').match(/^\s+openFreePanel\(/gm) ?? []).length
}

/** 指定测试文件的用例数（it(/test( 调用点） */
function casesInFiles(files) {
  let n = 0
  for (const file of files) {
    if (!existsSync(file)) continue
    n += (readFileSync(file, 'utf8').match(/\b(?:it|test)\s*\(/g) ?? []).length
  }
  return n
}

function compute() {
  const commands = countCommands()
  const tests = countTests()
  const componentTableRows = {}
  const pendingCells = {}
  const unconfirmed = {}
  for (const page of Object.keys(PAGE_DOCS)) {
    const n = countComponentTableRows(page)
    if (n !== null) componentTableRows[page] = n
    const file = join(PAGE_DOCS_DIR, PAGE_DOCS[page])
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    pendingCells[page] = (text.match(/☐/g) ?? []).length
    unconfirmed[page] = countUnconfirmed(text)
  }
  return {
    commands: {
      total: commands.total,
      // 按字母序存，保证 JSON 逐字节稳定
      byDomain: Object.fromEntries(
        Object.entries(commands.byDomain).sort(([a], [b]) => (a < b ? -1 : 1)),
      ),
    },
    tests,
    components: countComponents(),
    icons: countIcons(),
    pages: countPages(),
    hostEvents: countHostEvents(),
    componentTableRows,
    pendingCells,
    unconfirmed,
    fontSetFreePanelIcons: countFontSetFreePanelIcons(),
    stylePageCases: casesInFiles([join(TESTS_DIR, 'pages/style.test.ts')]),
  }
}

/** 「结构对照（逐项）」小节里 `未确认` 的出现次数 */
function countUnconfirmed(text) {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((l) => l.startsWith('## 五、结构对照'))
  if (start === -1) return 0
  let n = 0
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break
    n += (lines[i].match(/未确认/g) ?? []).length
  }
  return n
}

/* -------------------------------------------------------------- 注入块渲染器 */

const BLOCK_RE =
  /<!--\s*stats:begin\s+([a-zA-Z][a-zA-Z0-9.]*)\s*-->[\s\S]*?<!--\s*stats:end\s+\1\s*-->/g

/**
 * 每个渲染器返回**单行**内容：注入块位于 Markdown 表格单元格里，换行会撑破表格。
 * 名字 → 文案，名字即注入块名。
 */
function renderers(m) {
  const domainText = Object.entries(m.commands.byDomain)
    .sort(([, a], [, b]) => b - a || 0)
    .map(([name, n]) => `${name} ${n}`)
    .join(' / ')

  const r = {
    commands: `**${m.commands.total} 条命令**（${domainText}）`,
    tests: `**${m.tests.files} 个文件、${m.tests.cases} 处用例**（静态计数 \`it()\`/\`test()\`；非通过数）`,
    icons: `${m.icons} 个`,
    components: `${m.components} 个`,
    hostEvents: `${m.hostEvents} 个`,
  }

  // 各域命令数：`cmds.<域>`
  for (const [domain, n] of Object.entries(m.commands.byDomain)) {
    r[`cmds.${domain}`] = `${n} 条`
  }

  // 各页组件表行数：`rows.<页>`
  for (const [page, n] of Object.entries(m.componentTableRows)) {
    r[`rows.${page}`] = `${n} 行`
  }

  // 各页待办格数：`pending.<页>`
  for (const [page, n] of Object.entries(m.pendingCells)) {
    r[`pending.${page}`] = `${n} 处`
  }

  // 各页未确认数：`unconfirmed.<页>`
  for (const [page, n] of Object.entries(m.unconfirmed)) {
    r[`unconfirmed.${page}`] = `${n} 行`
  }

  // 字体面板页接到自由面板的顶部图标数
  r['fontSetFreePanelIcons'] = `${m.fontSetFreePanelIcons} 个`

  // 样式页用例数（静态计数，非通过数）
  r['stylePageCases'] = `${m.stylePageCases} 处`

  return r
}

/* ------------------------------------------------------------------ 产物生成 */

/**
 * 保留 BOM：原文带 BOM 就带回去。
 * 否则一次 gen 就把文件编码改了，git diff 会多出无关的一行。
 */
function withBom(original, next) {
  const BOM = '﻿'
  return original.startsWith(BOM) && !next.startsWith(BOM) ? BOM + next : next
}

/**
 * 必填块：docs/状态/进度.md 里**必须存在**的注入块。
 * 少一个 → gen 与 --check 都报错退出（标记被删掉不能静默放过）。
 * 不在这个名单里的块是「可选」：文档里出现就改写，不出现也不报错。
 */
const REQUIRED_BLOCKS = [
  'commands',
  'tests',
  'icons',
  'components',
  'hostEvents',
  'fontSetFreePanelIcons',
  'stylePageCases',
  'cmds.action',
  'cmds.fontSet',
  'cmds.style',
  'rows.fontManage',
  'rows.fontSet',
  'rows.custom',
  'rows.commonUse',
  'pending.rename',
]

function buildJson(m) {
  return {
    说明: '规模真值，由 scripts/stats.mjs 生成；口径见 docs/生成/规模.md 抬头',
    口径: {
      命令数: 'src/commands/<域>.ts 里 id 字面量条数，按 id 前缀分域，含 legacy',
      用例数:
        'tests 下的 .test.ts 里 it()/test() 的调用点数（静态计数，it.each 按 1 处计；非通过数）',
      组件数: 'src/components/*.vue 顶层文件数',
      图标数: 'src/assets/icons-sprite.svg 的 <symbol> 个数',
      页面数: 'src/pages 下页面目录（各含 index.vue）数，排除 _ 前缀内部目录',
      宿主事件数: 'src/cep/events.ts 的 EVENT_IDS 条目数',
      组件表行数: 'docs/页面/<页>.md「一、组件展开」小节表格的数据行数',
    },
    ...m,
  }
}

function buildMd(m) {
  const domainRows = Object.entries(m.commands.byDomain)
    .sort(([, a], [, b]) => b - a || 0)
    .map(([name, n]) => `| \`${name}\` | ${n} |`)
    .join('\n')

  const rowRows = Object.entries(m.componentTableRows)
    .map(([page, n]) => `| ${page} | \`${PAGE_DOCS[page]}\` | ${n} |`)
    .join('\n')

  return `# 规模（自动生成）

> **别手改。** 由 \`npm run stats\`（\`node scripts/stats.mjs gen\`）生成；
> \`npm run check\` 会校验本文件与 \`docs/状态/进度.md\` 的注入块是否仍与源码真值一致。
> 改完代码先跑 \`npm run stats\`；直接手改这里，下次 check 会红。

## 统计口径

| 指标 | 口径 |
|---|---|
| 命令数 | \`src/commands/<域>.ts\` 里 \`id: '<域>.<名>'\` 的 id 字面量条数，按 id 前缀分域。**含 legacy**（\`legacy.*\` 计入 legacy 域）；不含 \`registry\` / \`payloads\` / \`types\` / \`index\` / \`runtime\` 这些非域文件。 |
| 用例数 | \`tests\` 下的 \`.test.ts\` 文件里 \`it(\` / \`test(\` 的**调用点**数（静态计数）。\`it.each\` / \`test.each\` 按 1 处计，展开后的条数不算。这是"用例数（静态计数）"，**不是"通过数"**——通过数只有真跑 vitest 才有。 |
| 组件数 | \`src/components/*.vue\` 顶层文件数（不含子目录）。 |
| 图标数 | \`src/assets/icons-sprite.svg\` 里 \`<symbol>\` 的个数。 |
| 页面数 | \`src/pages\` 下含 \`index.vue\` 的页面目录数，排除 \`_\` 前缀的内部目录（\`_atoms\` / \`_placeholder\` / \`_probe\`）。 |
| 宿主事件数 | \`src/cep/events.ts\` 的 \`EVENT_IDS\` 记录条目数。 |
| 组件表行数 | \`docs/页面/<页>.md\`「一、组件展开」小节里表格的**数据行**数（表头行与分隔行不计）。 |

本文件不写生成时间：产物必须逐字节可复现，否则校验永远失败。

## 总览

| 指标 | 值 |
|---|---|
| 命令数 | ${m.commands.total} |
| 用例数（静态计数） | ${m.tests.cases} |
| 测试文件数 | ${m.tests.files} |
| 原子组件数 | ${m.components} |
| 图标数 | ${m.icons} |
| 页面数 | ${m.pages} |
| 宿主事件数 | ${m.hostEvents} |

## 命令分域

| 域 | 命令数 |
|---|---|
${domainRows}
| **合计** | **${m.commands.total}** |

## 各页组件表行数

| 页 | 清单文件 | 组件表行数 |
|---|---|---|
${rowRows}
`
}

/* ------------------------------------------------------------------ 写与校验 */

/** 找出文中所有注入块：返回 [{ name, full, inner }] */
function blocksIn(text) {
  const out = []
  for (const m of text.matchAll(BLOCK_RE)) {
    const full = m[0]
    const begin = full.slice(0, full.indexOf('-->') + 3)
    const end = full.slice(full.lastIndexOf('<!--'))
    out.push({ name: m[1], full, inner: full.slice(begin.length, full.length - end.length) })
  }
  return out
}

/**
 * 改写注入块内容。返回 { text, problems }。
 * 同一个名字可以出现多次，全部改写；名字未注册 → 报错，不静默跳过。
 */
function rewriteBlocks(text, rendered) {
  const problems = []
  const seen = new Set()
  let next = text

  for (const block of blocksIn(text)) {
    if (!(block.name in rendered)) {
      problems.push(`未注册的注入块：stats:begin ${block.name}`)
      continue
    }
    const content = rendered[block.name]
    if (content.includes('\n')) {
      problems.push(`注入块 ${block.name} 的内容含换行，会撑破 Markdown 表格`)
      continue
    }
    seen.add(block.name)
    const begin = block.full.slice(0, block.full.indexOf('-->') + 3)
    const end = block.full.slice(block.full.lastIndexOf('<!--'))
    const replacement = begin + content + end
    next = next.replace(block.full, replacement)
  }

  // 必填块缺失 → 报错（标记被删掉不能静默放过）
  for (const name of REQUIRED_BLOCKS) {
    if (!seen.has(name)) {
      problems.push(
        `缺少必填注入块：stats:${name}（期望 \`<!-- stats:begin ${name} -->\` / \`<!-- stats:end ${name} -->\`）`,
      )
    }
  }

  return { text: next, problems }
}

function gen() {
  const m = compute()
  const rendered = renderers(m)

  writeFileSync(OUT_JSON, `${JSON.stringify(buildJson(m), null, 2)}\n`, 'utf8')
  console.log('[stats] 已写入 docs/生成/规模.json')
  writeFileSync(OUT_MD, buildMd(m), 'utf8')
  console.log('[stats] 已写入 docs/生成/规模.md')

  if (!existsSync(PROGRESS)) {
    console.error('[stats] 找不到 docs/状态/进度.md')
    process.exit(1)
  }
  const text = readFileSync(PROGRESS, 'utf8')
  const { text: next, problems } = rewriteBlocks(text, rendered)
  if (problems.length) {
    console.error('[stats] 注入块有错，未改写 docs/状态/进度.md：')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  writeFileSync(PROGRESS, withBom(text, next), 'utf8')
  console.log('[stats] 已改写 docs/状态/进度.md 的注入块')
  console.log(
    `[stats] 完成：命令 ${m.commands.total} / 用例 ${m.tests.cases}（静态计数）/ 组件 ${m.components} / 图标 ${m.icons} / 页面 ${m.pages} / 宿主事件 ${m.hostEvents}`,
  )
}

function check() {
  const m = compute()
  const rendered = renderers(m)
  const errors = []

  // 1. 规模.json
  const expectedJson = `${JSON.stringify(buildJson(m), null, 2)}\n`
  if (!existsSync(OUT_JSON)) {
    errors.push('docs/生成/规模.json 不存在（跑 `npm run stats`）')
  } else if (readFileSync(OUT_JSON, 'utf8') !== expectedJson) {
    errors.push('docs/生成/规模.json 与源码真值不一致（跑 `npm run stats`）')
  }

  // 2. 规模.md
  const expectedMd = buildMd(m)
  if (!existsSync(OUT_MD)) {
    errors.push('docs/生成/规模.md 不存在（跑 `npm run stats`）')
  } else if (readFileSync(OUT_MD, 'utf8') !== expectedMd) {
    errors.push('docs/生成/规模.md 与源码真值不一致（跑 `npm run stats`）')
  }

  // 3. 进度.md 的注入块
  if (!existsSync(PROGRESS)) {
    errors.push('docs/状态/进度.md 不存在')
  } else {
    const text = readFileSync(PROGRESS, 'utf8')
    const blocks = blocksIn(text)
    const byName = new Map()
    for (const b of blocks) {
      if (!byName.has(b.name)) byName.set(b.name, [])
      byName.get(b.name).push(b)
    }
    for (const [name, list] of byName) {
      if (!(name in rendered)) {
        errors.push(`docs/状态/进度.md 里有未注册的注入块：stats:begin ${name}`)
        continue
      }
      for (const b of list) {
        if (b.inner !== rendered[name]) {
          errors.push(
            `docs/状态/进度.md 注入块 ${name} 与真值不一致：\n    期望：${rendered[name]}\n    实际：${b.inner.trim()}`,
          )
        }
      }
    }
    for (const name of REQUIRED_BLOCKS) {
      if (!byName.has(name)) {
        errors.push(
          `docs/状态/进度.md 缺少必填注入块：stats:${name}（期望 \`<!-- stats:begin ${name} -->\` / \`<!-- stats:end ${name} -->\`）`,
        )
      }
    }
  }

  if (errors.length) {
    console.error('[stats] 规模数字与源码不一致：')
    for (const e of errors) console.error(`  - ${e}`)
    console.error('  跑 `npm run stats` 重新生成（不要手改生成物）\n')
    process.exit(1)
  }
  console.log(
    `[stats] 通过：命令 ${m.commands.total} / 用例 ${m.tests.cases}（静态计数）/ 组件 ${m.components} / 图标 ${m.icons} / 页面 ${m.pages} / 宿主事件 ${m.hostEvents}`,
  )
}

const command = process.argv[2] ?? ''
if (command === 'gen') gen()
else if (command === '--check') check()
else if (command === '--json') console.log(JSON.stringify(compute(), null, 2))
else {
  console.error('未知命令（可用：gen / --check / --json）')
  process.exit(1)
}
