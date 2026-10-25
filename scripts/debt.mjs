#!/usr/bin/env node
/**
 * 债务账本读写入口 —— 主表 `债务.md`（**只留待办**）+ 归档 `债务-归档.md`（**只留已结**）。
 * 两个文件是**分区**，不是两份真相：一行只在一个文件里出现一次，靠 `check` 的 ⑤⑥ 两条钉住。
 *
 * 【为什么只有 6 个命令】2026-10-25：本脚本 2173 行 ≈ 被管代码的 58%（一人用的记账工具）。
 *   `edit` / `move` / `fix` / `reanchor` / `area` / `stats` / `reverify` 全是维护表格的杂活 ⇒ 删，**允许人直接改表**；
 *   「禁手写表格行」那条规矩一并作废 —— 它是补丁不是判据，正确做法是**改坏了能发现**（`check`），不是禁止人改。
 *   `reverify` 删：它只为「永久可复算」这个承诺存在，而凭证只在结账时跑一次（见下）。
 *
 * 【凭证只有一种格式】状态格 = `[已解决 <日期> · <note> · 验：<cmd> → <claim> · 验法：<how>]`。
 *   `resolve` 的闸 = 真跑 `cmd` + `claim` 必须命中，缺一拒写；`--how` 追加一段 `· 验法：<人话>`。
 *   **⚠️ 永远不要加 `reverify` / 「永久可复算」这类东西**：`验：` 只在结账那一刻跑一次，**不承诺永久有效**
 *   （命令会随仓库漂移）。2026-10-25 的 `TD-09-38` 从 9 漂到 11，就是"永久同步"这个承诺造出来的自造债。
 *   旧格式（`evidence:v1{…}`）已于 2026-10-25 退役：在途账已结完（两个账本文件里旧格式行 = 0），
 *   兼容层（`--evidence` 入口 + 旧格式解析）**已整段删掉**，别再复活 —— 账本只留一种格式。
 *
 * 用法：
 *   add     --area NN --summary "…" [--rate 高|中|低] [--class 增债|还债|持平] [--anchor <区域文件>]
 *   list    [--all] [--area NN] [--rate 高|中|低]        # 默认按利息率 高→中→低，顶行给全量计数
 *   show    TD-xx-yy
 *   resolve TD-xx-yy --cmd "…" --claim "…" [--note "…"] [--how "怎么验的"]   # 闸：真跑 cmd，claim 必须命中；结账后该行搬进归档
 *   reopen  TD-xx-yy --why "…"                            # 已解决 → 待还（单向）；该行搬回主表
 *   check                                                 # 只读校验 6 条（独立命令 `npm run debt:check`；**不进** `npm run check` —— 账本是手写数据，手写文档不作为门禁）
 *
 * 测试夹具：`--root=<dir>`（把账本指到已知答案的夹具，见 `tests/scripts/debt-gate.test.ts`）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const ROOT_ARG = process.argv.find((a) => a.startsWith('--root='))?.slice(7) ?? ''
const ROOT = ROOT_ARG ? resolve(ROOT_ARG) : fileURLToPath(new URL('..', import.meta.url))
const LOG_DIR = join(ROOT, 'daily', '架构日志')
const MAIN = join(LOG_DIR, '债务.md')
const ARCHIVE = join(LOG_DIR, '债务-归档.md')

const CLASSES = ['还债', '持平', '增债']
const RATES = ['高', '中', '低']
const RATE_ORDER = { 高: 0, 中: 1, 低: 2 }
const TODO_WORDS = ['待还', '待用户拍板']
const DONE_WORDS = ['已解决', '已裁定', '不做']
const STATUS_WORDS = [...TODO_WORDS, ...DONE_WORDS]
const C = { id: 0, area: 1, summary: 2, class: 3, rate: 4, status: 5, anchor: 6 }
const COLS = 7 // 表格列数；`split('|')` 后应为 COLS+2 段
const ROW_RE = /^\|\s*TD-\d+-\d+/
const ANCHOR_RE = /^\d{2}-[^/\\|]+\.md$/ // 区域日志命名 `<NN>-<区域>-<日期>.md`
/** 凭证格式：`验：<cmd> → <claim>`（可选尾巴 `· 验法：<how>`） */
const EV_RE = /验：([\s\S]*?) → ([\s\S]*?)(?: · 验法：([^\]]*))?\]/
/** 凭证命令要被反复跑 ⇒ 不许带写副作用 */
const READONLY_DENY = [
  [/(?<!\d)>(?!&1)/, '重定向 `>`'],
  [/\brm\s+-/, '`rm -`'],
  [/\bmv\s+/, '`mv`'],
  [/\bsed\s+-i/, '`sed -i`'],
  [/\bgit\s+(?:checkout|reset|clean|stash|switch)\b/, 'git 写操作'],
]

const today = () => new Date().toISOString().slice(0, 10)
const strip = (s) =>
  String(s ?? '')
    .trim()
    .replace(/^\*+|\*+$/g, '')
    .trim()
const fail = (msg) => {
  console.error('❌ ' + msg)
  process.exit(1)
}
const argVal = (argv, flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''
}
const statusWord = (s) =>
  (String(s ?? '').match(/^\*{0,2}\[(待还|待用户拍板|已解决|已裁定|不做)/) ?? [])[1] ?? ''
const statusBody = (s) => (String(s ?? '').match(/^\*{0,2}\[([^\]]*)\]/) ?? [])[1] ?? ''
/** 从状态格正文里剥掉「状态词 + 日期」 */
const noteFromBody = (body) =>
  body
    .replace(/^(待还|待用户拍板|已解决|已裁定|不做)\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*/, '')
    .replace(/^[·：:]\s*/, '')
    .trim()
const parseEvidence = (status) => {
  const m = String(status ?? '').match(EV_RE)
  return m ? { cmd: m[1].trim(), claim: m[2].trim(), how: (m[3] ?? '').trim() } : null
}
/** 状态格里的「人话注记」= 去掉凭证尾巴 */
function noteOf(status) {
  const body = statusBody(status)
  const cut = body.search(/验：/)
  return noteFromBody(cut >= 0 ? body.slice(0, cut) : body).replace(/[·\s]+$/, '')
}

// ── 读 ──────────────────────────────────────────────────────────────────────
/** 读一个账本文件 → 行数组。`bad` 非空 = 列数不对（列错位 / 裸 `|`），字段不解析。 */
function readRows(file, src) {
  if (!existsSync(file)) return []
  const out = []
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, li) => {
      if (!ROW_RE.test(line)) return
      const parts = line.split('|')
      if (parts.length !== COLS + 2) {
        out.push({
          li,
          line,
          src,
          bad: `列数 ${Math.max(parts.length - 2, 0)} ≠ ${COLS}（裸 \`|\` 或漏列）`,
        })
        return
      }
      const c = parts.slice(1, -1).map((x) => x.trim())
      out.push({
        li,
        line,
        src,
        fields: {
          id: strip(c[C.id]),
          area: c[C.area],
          summary: c[C.summary],
          class: c[C.class],
          rate: c[C.rate],
          status: c[C.status],
          anchor: c[C.anchor],
        },
      })
    })
  return out
}
const both = () => [...readRows(MAIN, 'main'), ...readRows(ARCHIVE, 'archive')]
const readLines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/) : [])
/** 追加一行（**不整体重写语义**：只在尾部补，保留文件原有内容与表头） */
function appendRow(file, row) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(/\s*$/, '') + '\n' + row + '\n')
}
function dropLine(file, li) {
  const lines = readLines(file)
  lines.splice(li, 1)
  writeFileSync(file, lines.join('\n'))
}
/** 就地改状态格（按列切，避免动到摘要里的字符） */
function setStatus(file, li, cell) {
  const lines = readLines(file)
  const parts = lines[li].split('|')
  parts[1 + C.status] = ` ${cell} `
  lines[li] = parts.join('|')
  writeFileSync(file, lines.join('\n'))
}
const anchorProblem = (a) => {
  const s = String(a ?? '').trim()
  if (/[/\\]/.test(s)) return `锚点含路径分隔符（只准写 \`daily/架构日志/\` 下的文件名）：${s}`
  if (!ANCHOR_RE.test(s)) return `锚点不是区域日志命名（\`<NN>-<区域>-<日期>.md\`）：${s}`
  if (!existsSync(join(LOG_DIR, s))) return `锚点文件不存在：daily/架构日志/${s}`
  return ''
}

// ── 结账闸（`resolve` 唯一值钱的东西）────────────────────────────────────────
/** 找一行（主表 ∪ 归档）；重复 ID 直接拒（先修重复再结账） */
function findRow(id) {
  const hit = both().filter((r) => r.fields && r.fields.id === id)
  if (!hit.length) fail(`主表 ∪ 归档 中均无 ${id}`)
  if (hit.length > 1) fail(`${id} 出现 ${hit.length} 次（重复 ID）→ 先处理重复`)
  return hit[0]
}
/** 已结的行搬进归档（主表只留待办）；`check` ⑥ 靠这个分区 */
function moveToArchive(r) {
  if (r.src !== 'main') return
  appendRow(ARCHIVE, readLines(MAIN)[r.li])
  dropLine(MAIN, r.li)
}

function runCmd(cmd) {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    })
    return { ok: true, exit: 0, output: String(out) }
  } catch (e) {
    return {
      ok: false,
      exit: typeof e.status === 'number' ? e.status : -1,
      output: `${e.stdout ?? ''}${e.stderr ?? ''}`,
      reason: e.signal ? `被 ${e.signal} 结束` : e.code === 'ETIMEDOUT' ? '超时' : '',
    }
  }
}
/** 数字按**独立数字**比对（`3` 不被 `143` 蒙混），其余按原文子串 */
const claimMatches = (output, claim) => {
  const c = String(claim ?? '').trim()
  if (!c) return false
  if (/^\d+(?:\.\d+)?$/.test(c))
    return new RegExp(`(?<![\\d.])${c.replace('.', '\\.')}(?![\\d.])`).test(String(output))
  return String(output).includes(c)
}
const numbersIn = (out, max = 6) => {
  const s = new Set()
  for (const m of String(out ?? '').matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)) {
    s.add(m[0])
    if (s.size >= max) break
  }
  return [...s]
}
const tail = (s, n = 4) =>
  String(s ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-n)

/** 拒写时的**可复制填空模板**（没有它，下一个人只会想办法绕过闸） */
function gateHelp() {
  return [
    '',
    '   写法：--cmd "<一条只读命令，别人拿去能跑出同一个结果>" --claim "<该命令输出里必须出现的串>"',
    '',
    '   首选断**用例名**：cmd=`npx vitest run <file> --reporter=verbose` · claim=<用例名子串>',
    '   别断整包 `npm test` 的 `N passed`（会随别人加用例漂）；别写恒真命令（`grep -c xxx` 配 `claim=0`）。',
    '   删除类：cmd 要"旧实现一回来就变红"，claim 写**非零**数字或用例名。',
    '',
  ].join('\n')
}

/**
 * 闸：① 给了 cmd + claim → ② 命令只读 → ③ 真跑一遍 → ④ claim 必须命中。
 * 任一条不过 = **拒写**（exit 1，账本零改动）。没有 `--force` / 环境变量旁路。
 */
function gate(cmd, claim) {
  const problems = []
  if (!cmd) problems.push('缺 `--cmd`（结账必须有可复算凭证）')
  if (!claim) problems.push('缺 `--claim`（命令输出里必须出现的数字或结论）')
  for (const [k, v] of [
    ['cmd', cmd],
    ['claim', claim],
  ])
    if (/[|｜\]]/.test(v || ''))
      problems.push(`\`${k}\` 含 \`|\` / \`]\`（\`|\` 撑破表格列，\`]\` 截断状态格）`)
  if (cmd)
    for (const [re, why] of READONLY_DENY)
      if (re.test(cmd)) problems.push(`凭证命令必须只读：命中 ${why}`)
  if (problems.length) {
    console.error('❌ 结账被拒：**凭证不合格**（写入口闸，不是警告；账本未写入）')
    for (const p of problems) console.error('   · ' + p)
    console.error(gateHelp())
    process.exit(1)
  }
  const res = runCmd(cmd)
  if (!res.ok) {
    console.error('❌ 结账被拒：**凭证命令跑不动**（账本未写入）')
    console.error(`   命令 : ${cmd}`)
    console.error(`   实跑 : exit=${res.exit}${res.reason ? `（${res.reason}）` : ''}`)
    for (const l of tail(res.output)) console.error(`   | ${l.slice(0, 160)}`)
    console.error(gateHelp())
    process.exit(1)
  }
  if (!claimMatches(res.output, claim)) {
    const nums = numbersIn(res.output)
    console.error('❌ 结账被拒：**claim 对不上**（账本未写入）')
    console.error(`   命令 : ${cmd}`)
    console.error(`   claim: ${claim}`)
    console.error(
      `   实跑 : exit=0，输出里没有「${claim}」${nums.length ? `；输出里的数字：${nums.join(' / ')}` : ''}`,
    )
    for (const l of tail(res.output)) console.error(`   | ${l.slice(0, 160)}`)
    console.error(gateHelp())
    process.exit(1)
  }
  console.log(`✅ 凭证已跑：\`${cmd}\` → 命中「${claim}」`)
}

// ── 命令 ────────────────────────────────────────────────────────────────────
function cmdAdd(argv) {
  const area = argVal(argv, '--area')
  const summary = argVal(argv, '--summary')
  const cls = argVal(argv, '--class') || '增债'
  const rate = argVal(argv, '--rate') || '中'
  const anchor = argVal(argv, '--anchor') || ''
  if (!area || !summary)
    fail(
      '用法：add --area NN --summary "…" [--rate 高|中|低] [--class 增债|还债|持平] [--anchor <区域文件>]',
    )
  if (!CLASSES.includes(cls)) fail(`归类 \`${cls}\` 不在白名单 [${CLASSES.join(' / ')}]`)
  if (!RATES.includes(rate)) fail(`利息率 \`${rate}\` 不在白名单 [${RATES.join(' / ')}]`)
  if (/[|｜]/.test(summary)) fail('摘要含竖线 → 用「／」代替（裸 `|` 会撑破表格列）')
  if (summary.length > 120) fail(`摘要 ${summary.length} 字 > 120（一行一债，长叙述写区域文件）`)
  if (anchor) {
    const p = anchorProblem(anchor)
    if (p) fail(`锚点：${p}`)
  }
  const all = both()
  const same = all.filter((r) => r.fields.id.startsWith(`TD-${area}-`))
  const maxN = same.reduce((m, r) => Math.max(m, Number(r.fields.id.split('-')[2] ?? 0)), 0)
  const id = `TD-${area}-${maxN + 1}`
  if (all.some((r) => r.fields.id === id)) fail(`取号自检失败：${id} 已存在 → 拒写`)
  const areaText = (same.find((r) => r.src === 'main') ?? same[0])?.fields.area || area
  const row = `| ${id} | ${areaText} | ${summary} | ${cls} | ${rate} | [待还] | ${
    anchor ? `[${anchor}](./${anchor})` : '—'
  } |`
  appendRow(MAIN, row)
  console.log(`✅ 已登记 ${id}（${cls} · ${rate} · 待还）`)
  console.log('   ' + row)
}

function cmdList(argv) {
  const area = argVal(argv, '--area')
  const rate = argVal(argv, '--rate')
  const all = argv.includes('--all')
  const main = readRows(MAIN, 'main')
  const arch = readRows(ARCHIVE, 'archive')
  let rows = all ? [...main, ...arch] : main
  if (area) rows = rows.filter((r) => r.fields.id.startsWith(`TD-${area}-`))
  if (rate) rows = rows.filter((r) => r.fields.rate === rate)
  rows.sort(
    (a, b) =>
      (RATE_ORDER[a.fields.rate] ?? 9) - (RATE_ORDER[b.fields.rate] ?? 9) ||
      a.fields.id.localeCompare(b.fields.id),
  )
  console.log(
    `🔎 debt list ｜ ${all ? '主表 + 归档' : '主表（待办）'} ｜ 命中 ${rows.length} 条（全量 ${main.length + arch.length}：主表 ${main.length} · 归档 ${arch.length}）｜ 按 利息率 高→中→低`,
  )
  if (!rows.length) console.log('   （无匹配记录）')
  for (const r of rows) {
    const f = r.fields
    const sum = f.summary.length > 84 ? f.summary.slice(0, 84) + '…' : f.summary
    const note = noteOf(f.status) // 凭证尾巴已剥离 ⇒ 只显示人话注记
    const ev = parseEvidence(f.status)
    console.log(
      `${f.id} ｜ ${f.rate} ｜ [${statusWord(f.status) || '?'}]${r.src === 'archive' ? '（归档）' : ''}${note ? ` · ${note.slice(0, 60)}` : ''}`,
    )
    console.log(`        ${f.class} ｜ ${f.area} ｜ ${sum}`)
    if (ev) console.log(`        验：${ev.cmd} → ${ev.claim}`)
  }
}

function cmdShow(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+/.test(a))
  if (!id) fail('用法：show TD-xx-yy')
  const hit = both().filter((r) => r.fields.id === id)
  if (!hit.length) fail(`主表 ∪ 归档 中均无 ${id}`)
  for (const r of hit) {
    const f = r.fields
    console.log(`── ${f.id}${r.src === 'archive' ? '（归档）' : ''}${r.bad ? ` ⚠️ ${r.bad}` : ''}`)
    console.log(`  状态   : [${statusWord(f.status) || '?'}] ${noteOf(f.status)}`)
    console.log(`  归类   : ${f.class}   利息率 : ${f.rate}   区域 : ${f.area}`)
    console.log(`  现象   : ${f.summary}`)
    const ev = parseEvidence(f.status)
    if (ev) {
      console.log(`  验     : ${ev.cmd} → ${ev.claim}`)
      if (ev.how) console.log(`  验法   : ${ev.how}`)
      console.log('           ↳ 结账时跑过一次；不承诺永久可复算（命令会漂）')
    }
    const file = (f.anchor.match(/^\**\[([^\]]+)\]/) ?? [])[1] ?? f.anchor
    console.log(`  锚点   : ${file}${file.endsWith('.md') ? `（daily/架构日志/${file}）` : ''}`)
  }
}

function cmdResolve(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+/.test(a))
  const cmd = argVal(argv, '--cmd')
  const claim = argVal(argv, '--claim')
  const note = argVal(argv, '--note')
  const how = argVal(argv, '--how')
  if (!id)
    fail(
      '用法：resolve TD-xx-yy --cmd "<只读命令>" --claim "<输出里必须出现的串>" [--note "…"] [--how "怎么验的"]',
    )
  if (/[|｜\]]/.test(note)) fail('note 含 `|` / `]`（撑破表格列 / 截断状态格）→ 改用「」')
  if (/[|｜\]]/.test(how)) fail('`--how` 含 `|` / `]`（撑破表格列 / 截断状态格）→ 改用「」')
  gate(cmd, claim) // ← 闸不过就 exit 1，账本零改动
  const r = findRow(id)
  const cell = `[已解决 ${today()}${note ? ` · ${note}` : ''} · 验：${cmd} → ${claim}${
    how ? ` · 验法：${how}` : ''
  }]`
  setStatus(r.src === 'main' ? MAIN : ARCHIVE, r.li, cell)
  moveToArchive(r) // 分区：已结的行只留在归档（主表只留待办）
  console.log(`✅ ${id} → ${cell}`)
  console.log(
    `   ↳ ${r.src === 'main' ? '已搬进 daily/架构日志/债务-归档.md（主表只留待办）' : '（该行已在归档）'}`,
  )
}

function cmdReopen(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+/.test(a))
  const why = argVal(argv, '--why')
  if (!id || !why) fail('用法：reopen TD-xx-yy --why "…"（**已解决** → 待还，单向；裁定类不许降）')
  if (/[|｜\]]/.test(why)) fail('`--why` 含 `|` / `]` → 改用「」')
  const hit = both().filter((r) => r.fields && r.fields.id === id)
  if (!hit.length) fail(`主表 ∪ 归档 中均无 ${id}`)
  const r = hit[0]
  const word = statusWord(r.fields.status)
  if (word !== '已解决')
    fail(
      `${id} 当前 [${word || '?'}] → reopen 只做 **已解决 → 待还**（\`已裁定\` / \`不做\` 是人的裁定，要翻请直接改表）`,
    )
  const cell = `[待还 ${today()} · ${why}]`
  setStatus(r.src === 'main' ? MAIN : ARCHIVE, r.li, cell)
  if (r.src === 'archive') {
    const moved = readLines(ARCHIVE)[r.li]
    appendRow(MAIN, moved)
    dropLine(ARCHIVE, r.li)
  }
  console.log(`✅ ${id} → ${cell}`)
  console.log(`   ↳ ${r.src === 'archive' ? '已搬回主表（待办只在主表）' : '（该行已在主表）'}`)
}

/**
 * check —— 只读校验 6 条（接进 `npm run check`）。
 * ⑤⑥ 是"一个文件靠格式"做不到的：**分区靠校验**（两个文件 ≠ 两份真相）。
 */
function cmdCheck() {
  const main = readRows(MAIN, 'main')
  const arch = readRows(ARCHIVE, 'archive')
  const bad = (rows) => rows.filter((r) => r.bad)
  const errs = []

  // ① ID 唯一（文件内 + 跨文件）
  const seen = new Map()
  for (const r of [...main, ...arch]) {
    if (!r.fields) continue
    if (seen.has(r.fields.id))
      errs.push(
        `① ID 重复：${r.fields.id}（${seen.get(r.fields.id)} 与 ${r.src === 'main' ? '主表' : '归档'}）`,
      )
    else seen.set(r.fields.id, r.src === 'main' ? '主表' : '归档')
  }
  // ② 状态词在白名单
  for (const r of [...main, ...arch]) {
    if (!r.fields) continue
    const w = statusWord(r.fields.status)
    if (!w)
      errs.push(
        `② 状态词不在白名单 [${STATUS_WORDS.join(' / ')}]：${r.fields.id} → \`${r.fields.status.slice(0, 40)}\``,
      )
  }
  // ③ 列数对（= 没有裸 `|` / 没漏列）
  for (const r of [...bad(main), ...bad(arch)])
    errs.push(`③ 列错位：${r.src === 'main' ? '主表' : '归档'}第 ${r.li + 1} 行 —— ${r.bad}`)
  // ④ 锚点文件存在
  for (const r of [...main, ...arch]) {
    if (!r.fields) continue
    const a = r.fields.anchor
    if (a === '—' || !a) continue
    const file = (a.match(/^\**\[([^\]]+)\]/) ?? [])[1]
    if (!file) errs.push(`④ 锚点形状非法：${r.fields.id} → \`${a.slice(0, 40)}\``)
    else {
      const p = anchorProblem(file)
      if (p) errs.push(`④ ${r.fields.id}：${p}`)
    }
  }
  // ⑤ 同一 ID 不许同时出现在主表与归档
  const archIds = new Set(arch.filter((r) => r.fields).map((r) => r.fields.id))
  for (const r of main)
    if (r.fields && archIds.has(r.fields.id)) errs.push(`⑤ 同一 ID 两边都有：${r.fields.id}`)
  // ⑥ 分区完整：待办只在主表、已结只在归档（漏在错的一侧 = 有人看不见它）
  for (const r of main)
    if (r.fields && DONE_WORDS.includes(statusWord(r.fields.status)))
      errs.push(`⑥ 已结行留在主表：${r.fields.id}（[${statusWord(r.fields.status)}] → 该进归档）`)
  for (const r of arch)
    if (r.fields && TODO_WORDS.includes(statusWord(r.fields.status)))
      errs.push(`⑥ 待办行掉进归档：${r.fields.id}（[${statusWord(r.fields.status)}] → 该回主表）`)

  const total = main.length + arch.length
  console.log(
    `[debt] check ｜ 主表 ${main.length} 条（待办）· 归档 ${arch.length} 条（已结）· 合计 ${total} 条`,
  )
  if (errs.length) {
    for (const e of errs) console.error('  ' + e)
    console.error(`\n[debt] 错误 ${errs.length} 项`)
    process.exit(1)
  }
  console.log('[debt] 通过：ID 唯一 · 状态白名单 · 列数对 · 锚点存在 · 分区不重不漏')
}

const [, , cmd, ...rest] = process.argv
switch (cmd) {
  case 'add':
    cmdAdd(rest)
    break
  case 'list':
    cmdList(rest)
    break
  case 'show':
    cmdShow(rest)
    break
  case 'resolve':
    cmdResolve(rest)
    break
  case 'reopen':
    cmdReopen(rest)
    break
  case 'check':
    cmdCheck()
    break
  default:
    console.log('债务账本读写入口（主表 = 待办，归档 = 已结）')
    console.log(
      '  add     --area NN --summary "…" [--rate 高|中|低] [--class 增债|还债|持平] [--anchor <区域文件>]',
    )
    console.log('  list    [--all] [--area NN] [--rate 高|中|低]        # 按利息率 高→中→低')
    console.log('  show    TD-xx-yy')
    console.log(
      '  resolve TD-xx-yy --cmd "<只读命令>" --claim "<输出里必须出现的串>" [--note "…"] [--how "怎么验的"]',
    )
    console.log('  reopen  TD-xx-yy --why "…"                            # 已解决 → 待还（单向）')
    console.log('  check                                                 # 只读校验 6 条')
    process.exit(cmd ? 1 : 0)
}
