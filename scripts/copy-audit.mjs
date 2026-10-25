// 是什么：提示语总账统计器——数出 455/78/255/35/27条/79处次/82行 这批基线数字，供 P1 落点表与后续收口判据复算
// 替代了什么：之前散在对话里、只写进 `src/domain/messages.ts` 注释里的手填数字（没有脚本可复算）
// 谁在用：人跑 `node scripts/copy-audit.mjs` 复算基线；P2/P3 搬完后跑同样命令对照「改前 → 改后」
// 禁止：不许在此手填任何数；所有数字必须由本脚本当场算出。不许改 src/ 任何文件（只读）。
// 口径：先用 `maskComments()`（source-scan.mjs）把注释遮蔽成等长空格再扫，注释里的示例代码不算命中；
//      C 项（.vue 模板文本节点）的语义判读不在本脚本，由 `copy-audit.expected.json` 的 promptRows 清单定，脚本只比对。

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { maskComments } from './source-scan.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')

function walk(dir, exts = ['.ts', '.vue'], out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p))
  }
  return out
}

/** 抽取 `new <Name>( ... )` 调用体（含跨行），返回 { start, end, body }，start/end 是 0-based 行号 */
function callBody(lines, i, name) {
  const open = `new ${name}(`
  if (!lines[i].includes(open)) return null
  let buf = lines[i]
  let j = i
  let k = lines[i].indexOf(open) + open.length
  let depth = 1
  while (depth > 0 && j < lines.length) {
    while (k < buf.length) {
      const c = buf[k]
      if (c === '(') depth++
      else if (c === ')') depth--
      if (depth === 0) break
      k++
    }
    if (depth === 0) break
    j++
    if (j < lines.length) buf += '\n' + lines[j]
    k++
  }
  return { start: i, end: j, body: buf.slice(buf.indexOf(open) + open.length, k) }
}

/** 按顶层逗号切参数 */
function splitArgs(s) {
  const parts = ['']
  let depth = 0
  for (const c of s) {
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
    if (c === ',' && depth === 0) parts.push('')
    else parts[parts.length - 1] += c
  }
  return parts.map((x) => x.trim())
}

function isLiteral(s) {
  return /^['"`]/.test(s)
}

function unquote(s) {
  return s.replace(/^['"`]/, '').replace(/['"`]$/, '')
}

/** 分类：谁出的事（按目录归属，落点表口径） */
function classify(f) {
  if (f.startsWith('src/cep/data/')) return 'data'
  if (f.startsWith('src/cep/cloud/')) return 'cloud'
  if (f.startsWith('src/cloud/')) return 'cloud'
  if (f.startsWith('src/cep/')) return 'ps'
  if (f.startsWith('src/selection/')) return 'selection'
  if (f.startsWith('src/domain/')) return 'validate'
  return 'command'
}

const files = walk(SRC)

// ---------- A/B：CepError / CloudError 第 2 参字面量（处次口径，已遮蔽注释） ----------
const errPlaces = []
for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf8')
  const masked = maskComments(raw)
  const lines = masked.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const name of ['CepError', 'CloudError']) {
      const b = callBody(lines, i, name)
      if (!b) continue
      const msg = splitArgs(b.body)[1] || ''
      if (isLiteral(msg))
        errPlaces.push({ file: f, line: b.start + 1, kind: name, text: unquote(msg) })
      i = b.end
    }
  }
}

// ---------- Interp：含 ${} 的中文模板串（行数口径，已遮蔽注释；再剔 log/console） ----------
const interpRows = []
for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf8')
  const masked = maskComments(raw)
  const lines = masked.split('\n')
  const re = /`(?:\\.|[^`\\])*`/g
  let m
  while ((m = re.exec(masked))) {
    const t = m[0]
    if (!/[\u4e00-\u9fa5]/.test(t) || !t.includes('${')) continue
    const line = masked.slice(0, m.index).split('\n').length
    const L = (lines[line - 1] || '').trim()
    if (/\b(log\.(warn|info|error|debug)|console\.)\s*\(/.test(L)) continue
    interpRows.push({ file: f, line, text: t })
  }
}

// ---------- C：.vue 模板中文文本节点（行数口径，已遮蔽注释） ----------
const vueRows = []
for (const f of files.filter((x) => x.endsWith('.vue'))) {
  const masked = maskComments(readFileSync(join(ROOT, f), 'utf8'))
  const lines = masked.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/>[^<>{}]*[\u4e00-\u9fa5]/.test(lines[i]))
      vueRows.push({ file: f, line: i + 1, text: lines[i].trim() })
  }
}

// ---------- D/E：feedback.* 字面量 / useCommand.run 第二参字面量（已遮蔽注释） ----------
const feedbackRows = []
const successRows = []
for (const f of files) {
  const masked = maskComments(readFileSync(join(ROOT, f), 'utf8'))
  const lines = masked.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/feedback\.(ok|error|warn|info)\(\s*(['"`])/.test(lines[i]))
      feedbackRows.push({ file: f, line: i + 1 })
    if (/\.run\(\s*[^,)]*,\s*(['"`])/.test(lines[i])) successRows.push({ file: f, line: i + 1 })
  }
}

// ---------- C 项候选（脚本只给候选，语义判读归 expected.json） ----------
const C_PROMPT_HINT =
  /(失败|不能|不可|无法|没有|未|已|请|吗|呢|哦|？|\?|错误|超时|重试|取消|删除|恢复|确认|警告|注意|不支持|为空|超出|至少|最多|正在|稍后|暂时|加载|读取|写入|保存成功|完成|中止|拒绝|出错|是否)/
const vuePromptCandidates = vueRows.filter((r) => C_PROMPT_HINT.test(r.text))

// ---------- expected.json：C 项人工核定的「算提示语」行（唯一清单，不在别处再列） ----------
// 锚定用 file + context（含语境的整行片段），不写死行号；这里拿 context 去文件里匹配，行号现算。
const expected = JSON.parse(readFileSync(join(ROOT, 'scripts/copy-audit.expected.json'), 'utf8'))
function resolvePromptRows(entries) {
  const resolved = []
  for (const e of entries) {
    const raw = readFileSync(join(ROOT, e.file), 'utf8')
    const lines = raw.split('\n')
    // context 是该行去掉首尾空白后的原文片段；按 trim 后相等来定位
    const idx = lines.findIndex((L) => L.trim() === e.context.trim())
    if (idx < 0) {
      console.error(
        `[expected.json 锚失效] ${e.file} 里找不到 context 片段（P3 改了这一行？）：${e.context.slice(0, 50)}`,
      )
      continue
    }
    resolved.push({ file: e.file, line: idx + 1, text: e.context.trim() })
  }
  return resolved
}
const promptRows = resolvePromptRows(expected.promptRows || [])
const eventPromptRows = resolvePromptRows(expected.eventPromptRows || [])

// ---------- 去重（文件:行）：四类 + C 项已核定行，全部并进同一个 Set ----------
function keyOf(r) {
  return `${r.file}:${r.line}`
}
const union = new Set()
for (const r of errPlaces) union.add(keyOf(r))
for (const r of interpRows) union.add(keyOf(r))
for (const r of feedbackRows) union.add(keyOf(r))
for (const r of successRows) union.add(keyOf(r))
for (const r of promptRows) union.add(keyOf(r)) // C 项已核定行并入，Set 自动去重

const pageRe = /^src\/(pages|components)\//
const pageRows = [...union].filter((k) => pageRe.test(k.split(':')[0]))
const eventRows = [...union].filter((k) => !pageRe.test(k.split(':')[0]))

// 重复文案（错误文案口径）
const textCount = {}
for (const p of errPlaces) textCount[p.text] = (textCount[p.text] || 0) + 1
const dups = Object.entries(textCount).filter(([, v]) => v > 1)
const dupTotal = dups.reduce((s, [, v]) => s + v, 0)

// 事件源侧分类（落点表）
const byCat = {}
for (const p of errPlaces) {
  const c = classify(p.file)
  byCat[c] = byCat[c] || { n: 0, files: new Set() }
  byCat[c].n++
  byCat[c].files.add(p.file)
}

// ---------- 输出 ----------
const out = (s) => console.log(s)
out('=== 提示语总账（全部由本脚本当场算出，无手填；注释已用 maskComments 遮蔽）===')
out('')
out('【处次口径】仅 CepError/CloudError 第 2 参字面量')
out(`  处次总数: ${errPlaces.length}`)
out(`  文件数:   ${new Set(errPlaces.map((p) => p.file)).size}`)
out('  按事件源分类（落点表）:')
for (const [c, v] of Object.entries(byCat).sort())
  out(`    ${c}: ${v.n} 处次 / ${v.files.size} 文件`)
out('')
out('【重复文案】错误文案里同一句出现 >1 次')
out(`  重复条数: ${dups.length}`)
out(`  重复涉及处次: ${dupTotal}`)
for (const [t, v] of dups.sort((a, b) => b[1] - a[1])) out(`    ${v} 处次  「${t.slice(0, 60)}」`)
out('')
out(
  '【行数口径】文件:行 去重后（错误文案 + Interp + feedback.* + useCommand.run 第二参 + C 项已核定行）',
)
out(`  总行数: ${union.size}`)
out(`  文件数: ${new Set([...union].map((k) => k.split(':')[0])).size}`)
out(
  `  页面/组件层: ${pageRows.length} 行 / ${new Set(pageRows.map((k) => k.split(':')[0])).size} 文件`,
)
out(
  `  事件源侧:   ${eventRows.length} 行 / ${new Set(eventRows.map((k) => k.split(':')[0])).size} 文件`,
)
out('')
out('【C 项 .vue 模板中文文本节点】')
out(`  命中行数: ${vueRows.length}（口径：行，非句；已遮蔽注释）`)
out(`  疑似提示语候选（关键词粗筛）: ${vuePromptCandidates.length}`)
out(`  人工核定「算提示语」（expected.json，按 context 现算行号）: ${promptRows.length}`)
out(`  已并入上方 union 去重（页面层行数含这 ${promptRows.length} 行，不另计）`)
for (const r of promptRows) out(`    ${r.file}:${r.line}  ${r.text.slice(0, 50)}`)
out('')
out('【事件源侧真散落三份处置】（expected.json eventPromptRows 唯一清单）')
out(`  桶A 真用户提示语（归 P2 搬 msg.*）: ${eventPromptRows.length} 行`)
for (const r of eventPromptRows) out(`    ${r.file}:${r.line}  ${r.text.slice(0, 50)}`)
out('  桶B 日志/开发者串: 不进 msg.*（非提示语）')
out('  桶C 存疑: 标 UNVERIFIED 挂账，不硬塞')
out('')
out('【口径说明】')
out(
  '  处次 = 每个 throw 调用一条；行数 = 文件:行 去重。两者不可直接对账（跨行 throw 与 Interp/成功文案不重合）。',
)
out('  处次口径 ⊂ 行数口径，只能验证包含关系，不能加减推回。')
