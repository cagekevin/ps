#!/usr/bin/env node
// 是什么：主控任务书格式守卫——检查"甲区/乙区/丙区"三段式是否合规
// 替代了什么：口头约定（"甲区写目标+判据、乙区逐条回执"），以前靠人记，漏了就返工
// 谁在用：`npm run spec:check`（已接进 `npm run check`）与 `tests/scripts/task-spec.test.ts`
// 禁止：把这条守卫生成"必须用某个模板"的强制约束——它只查**结构**，不查任务书写得好不好
//
// 用法：
//   node scripts/task-spec.mjs                       发现模式（`npm run spec:check` 用这个）
//   node scripts/task-spec.mjs <文件…>               只查指定文件（测试用）
//   node scripts/task-spec.mjs --root=<dir>          只给测试用（临时目录里造任务书）
//
// 【发现模式：为什么不能只喂模板】
//   旧接线只传 `docs/规范/任务书模板.md` 一个文件，等于"守着自己那份样本自证"：
//   真实任务书写成什么样，守卫一次都没看过（TD-17-12）。
//   现在按**结构**发现任务书，而不是维护一份路径清单：
//   一份 .md 里**出现 `## 甲区…` 这个二级标题** ⇒ 它是任务书（不限位置）。
//   上一版判的是"**第一个**二级标题是 `## 甲区`"，于是先写 `## 摘要` 再写甲区的任务书
//   既不被审、也不进覆盖清单 —— 静默漏审（TD-17-17）。
//   代码块（``` / ~~~）里的 `## 甲区` 不算标题：工序文档里抄一份任务书示例不是任务书本身。
//
// 规则表（报错里直接给编号，方便对方回执）：
//   R1 甲区标题必须出现，且全文只出现一次
//   R2 三区齐全、顺序必须是 甲 → 乙 → 丙，各出现一次
//   R3 三区之外不许有第四区：甲区之前只允许 H1 / 具名二级小节（如 `## 摘要`）及其正文 / 引用块 / 空行；
//      丙区之后不许再出现任何标题
//   R4 甲区必须含「目标」与「判据」两行（允许前置序号或列表符号）
//   R5 乙区每个非空行必须是编号条目（`1.` / `- [ ]` / `- ` / `* `）或小标题（`###`）
//
// ⚠️ R3 的后半句是**实现过的**判据，不是头注释里的承诺：丙区是最后一区，
//    它之后出现 `## 丁区`（或任何 H1-H6）即违规。旧版只扫了甲区之前，后半句从未实现。
//   R1 不再要求"甲区在前 5 行以内"：`## 摘要` 在前的任务书是合法结构（TD-17-17），
//   行数上限只会把合法结构判死；"甲区之前不许倒散装正文"改由 R3 判（正文必须挂在具名小节下）。

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RULES = {
  R1: '甲区标题必须出现且只出现一次',
  R2: '三区必须齐全且顺序为 甲 → 乙 → 丙',
  R3: '三区之外不许有第四区（甲区之前只许 H1/具名二级小节/引用/空行；丙区之后不许再有标题）',
  R4: '甲区必须含「目标」与「判据」',
  R5: '乙区条目必须编号（`1.` / `- [ ]` / `- ` / `* `）',
}

const ZONE = /^##\s+([甲乙丙])区/
/** 第四区及以后（`## 丁区`…）：出现在甲区之前也是违规，不许用"摘要"打掩护塞别的区 */
const FOURTH_ZONE = /^##\s+[丁戊己庚辛壬癸]区/
const ANY_HEADING = /^#{1,6}\s/
const H2 = /^##\s/
const H1 = /^#\s+/
const NUMBERED = /^\s*(?:\d+\.\s|[-*]\s+(?:\[[ xX]\]\s*)?)/
const SUBHEAD = /^###\s+/
const HAS_GOAL = /^\s*(?:\d+\.\s*|[-*]\s*)?\*{0,2}目标\*{0,2}[:：]/
const HAS_CRITERIA = /^\s*(?:\d+\.\s*|[-*]\s*)?\*{0,2}判据\*{0,2}[:：]/

/**
 * 把代码块（``` / ~~~）内容抹成空行，**行号与行数不变**。
 *
 * 为什么必须抹：工序文档（`.codebuddy/commands/*.md`）里会整段抄一份任务书示例，
 * 那几行 `## 甲区` 是**示例文本**，不是标题。不抹 ⇒ 示例被当成真任务书去审，
 * 或者反过来（旧版"第一个二级标题"）真任务书被当成示例漏审。
 */
function maskFences(text) {
  const out = []
  let fence = ''
  for (const line of text.split('\n')) {
    const m = /^\s*(```+|~~~+)/.exec(line)
    if (m && !fence) {
      fence = m[1][0]
      out.push('')
      continue
    }
    if (fence) {
      if (m && m[1][0] === fence) fence = ''
      out.push('')
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

/** 校验一份任务书文本；返回违规列表（空数组 = 合规） */
export function validateText(text) {
  const lines = maskFences(text).split('\n')
  const violations = []
  const push = (line, rule, detail) => violations.push({ line, rule, detail })

  const zones = []
  for (let i = 0; i < lines.length; i += 1) {
    const m = ZONE.exec(lines[i])
    if (m) zones.push({ name: m[1], line: i + 1 })
  }

  const jia = zones.filter((z) => z.name === '甲')
  const yi = zones.filter((z) => z.name === '乙')
  const bing = zones.filter((z) => z.name === '丙')

  // R1：甲区必须出现且只出现一次。
  // 不判"前 5 行以内"：先写 `## 摘要` 再写甲区是合法结构（TD-17-17）；行数上限只会把合法结构判死。
  if (!jia.length) push(1, 'R1', '没有 `## 甲区` 标题')
  else if (jia.length > 1) push(jia[1].line, 'R1', `甲区标题出现了 ${jia.length} 次`)

  // R2
  if (!yi.length) push(1, 'R2', '没有 `## 乙区` 标题')
  if (!bing.length) push(1, 'R2', '没有 `## 丙区` 标题')
  if (jia.length && yi.length && jia[0].line > yi[0].line) {
    push(yi[0].line, 'R2', '乙区出现在甲区之前')
  }
  if (yi.length && bing.length && yi[0].line > bing[0].line) {
    push(bing[0].line, 'R2', '丙区出现在乙区之前')
  }
  if (jia.length > 1 || yi.length > 1 || bing.length > 1) {
    for (const extra of [...jia.slice(1), ...yi.slice(1), ...bing.slice(1)]) {
      push(extra.line, 'R2', `${extra.name}区标题重复（第 ${extra.line} 行）`)
    }
  }

  // R3 前半：甲区之前只允许"头信息" —— H1 标题 / 具名二级小节（`## 摘要` 这类，含其正文）/
  //   引用块 `>` / 空行 / `###` 小标题；第四区（`## 丁区`…）写在甲区之前也算违规。
  // 为什么放行具名二级小节：任务书"先摘要后三区"是常见且合法的结构（TD-17-17）；
  // 而 `# 标题` 之下直接倾倒、没有任何小节归属的正文仍算散装内容 —— 那正是原先要防的。
  const firstZone = zones.length ? zones[0].line : Infinity
  let inSection = false
  for (let i = 0; i < firstZone - 1 && i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    if (H1.test(line) || /^\s*>/.test(line)) continue
    if (H2.test(line)) {
      if (FOURTH_ZONE.test(line)) {
        push(i + 1, 'R3', `甲区之前不许出现第四区（\`${line.trim()}\`）`)
        continue
      }
      inSection = true
      continue
    }
    if (ANY_HEADING.test(line)) continue
    if (inSection) continue
    push(i + 1, 'R3', '甲区之前的正文必须挂在具名二级小节下（如 `## 摘要`），不许直接倾倒')
  }

  // R3 后半：丙区是最后一区 —— 它之后不许再出现任何标题（`## 丁区` / `# 附录` 都算）
  // 为什么判"标题"而不是判"任何内容"：丙区正文一直写到文末，任何非标题的文字本来就是丙区内容
  if (bing.length) {
    for (let i = bing[0].line; i < lines.length; i += 1) {
      if (!ANY_HEADING.test(lines[i])) continue
      push(i + 1, 'R3', `丙区之后不许再出现标题（这里出现了第 4 节：\`${lines[i].trim()}\`）`)
    }
  }

  // R4：甲区内的目标/判据（甲区范围 = 甲区标题到下一区标题）
  if (jia.length === 1) {
    const start = jia[0].line
    const end = zones.filter((z) => z.line > start).map((z) => z.line)[0] ?? lines.length + 1
    const body = lines.slice(start, end - 1)
    if (!body.some((l) => HAS_GOAL.test(l))) push(start, 'R4', '甲区没有「目标：」行')
    if (!body.some((l) => HAS_CRITERIA.test(l))) push(start, 'R4', '甲区没有「判据：」行')
  }

  // R5：乙区条目编号
  if (yi.length === 1) {
    const start = yi[0].line
    const end = zones.filter((z) => z.line > start).map((z) => z.line)[0] ?? lines.length + 1
    for (let i = start; i < end - 1; i += 1) {
      const line = lines[i]
      const lineNo = i + 1
      if (!line.trim()) continue
      if (lineNo === start) continue
      if (SUBHEAD.test(line)) continue
      if (NUMBERED.test(line)) continue
      if (/^\*\*乙区规矩\*\*/.test(line.trim())) continue
      push(lineNo, 'R5', '乙区条目没有编号')
    }
  }

  return violations.sort((a, b) => a.line - b.line)
}

/**
 * 这份 .md 是不是任务书（结构判据，不是路径清单）：
 * **出现 `## 甲区` 这个二级标题**即算，不要求它是第一个二级标题（TD-17-17：
 * 旧判据"第一个二级标题是甲区"会把"先摘要后甲区"的任务书静默漏掉 —— 既不报错也不进覆盖清单）。
 * 代码块里的 `## 甲区` 不算：那是工序文档抄的示例。
 */
export function isTaskBook(text) {
  return maskFences(text)
    .split('\n')
    .some((line) => /^##\s+甲区/.test(line))
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.npm-cache', '.codebuddy/.cache'])

/** 仓库内所有 .md（跳过依赖 / 产物目录）；不维护路径清单，靠 `isTaskBook` 现场判 */
function walkMarkdown(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.codebuddy') continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...walkMarkdown(abs))
    } else if (entry.name.endsWith('.md')) out.push(abs)
  }
  return out
}

function report(file, violations, label = file) {
  if (!violations.length) {
    console.log(`[task-spec] 通过：${label}`)
    return 0
  }
  console.error(`[task-spec] 失败：${label}（${violations.length} 处）`)
  for (const v of violations) {
    console.error(`  ${file}:${v.line}  违反 ${v.rule}（${RULES[v.rule]}）：${v.detail}`)
  }
  return 1
}

function main(argv) {
  const files = argv.filter((a) => !a.startsWith('-'))
  const root =
    argv.find((a) => a.startsWith('--root='))?.slice(7) ??
    fileURLToPath(new URL('..', import.meta.url))

  // 显式文件模式（测试用）：只查点名的文件
  if (files.length) {
    let failed = 0
    for (const file of files) {
      if (!existsSync(file)) {
        console.error(`[task-spec] 文件不存在：${file}`)
        failed += 1
        continue
      }
      failed += report(file, validateText(readFileSync(file, 'utf8'))) ? 1 : 0
    }
    process.exit(failed ? 1 : 0)
  }

  // 发现模式：按结构找出全部任务书（模板自己也在其中，不特殊对待）
  const books = walkMarkdown(root).filter((file) => isTaskBook(readFileSync(file, 'utf8')))

  if (!books.length) {
    console.error('[task-spec] 失败：全仓没有发现任何任务书（连模板都不见了？）')
    console.error('  判据：一份 .md 里出现 `## 甲区…` 这个二级标题（代码块里的不算）⇒ 它是任务书')
    process.exit(1)
  }

  let failed = 0
  for (const file of books) {
    failed += report(relative(root, file) || file, validateText(readFileSync(file, 'utf8')))
  }
  const names = books.map((f) => relative(root, f)).join('、')
  console.log(`[task-spec] 覆盖：${books.length} 份任务书（${names}）`)
  if (failed) {
    console.error(`\n[task-spec] ${failed} / ${books.length} 份不合规`)
    process.exit(1)
  }
}

if (process.argv[1] && process.argv[1].endsWith('task-spec.mjs')) main(process.argv.slice(2))
