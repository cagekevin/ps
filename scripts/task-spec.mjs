#!/usr/bin/env node
// 是什么：主控任务书格式守卫——检查"甲区/乙区/丙区"三段式是否合规
// 替代了什么：口头约定（"甲区写目标+判据、乙区逐条回执"），以前靠人记，漏了就返工
// 谁在用：`npm run spec:check`（已接进 `npm run check`）与 `tests/scripts/task-spec.test.ts`
// 禁止：把这条守卫生成"必须用某个模板"的强制约束——它只查**结构**，不查任务书写得好不好
//
// 用法：
//   node scripts/task-spec.mjs <文件…>   # 全部合规退出 0，否则 1 并逐条报行号
//
// 规则表（报错里直接给编号，方便对方回执）：
//   R1 甲区标题必须出现，且在前 5 行以内，全文只有一次
//   R2 三区齐全、顺序必须是 甲 → 乙 → 丙，各出现一次
//   R3 三区之外只允许 H1 标题与空行；丙区之后不允许有任何内容
//   R4 甲区必须含「目标」与「判据」两行（允许前置序号或列表符号）
//   R5 乙区每个非空行必须是编号条目（`1.` / `- [ ]` / `- ` / `* `）或小标题（`###`）

import { readFileSync, existsSync } from 'node:fs'

const RULES = {
  R1: '甲区标题必须在前 5 行以内且只出现一次',
  R2: '三区必须齐全且顺序为 甲 → 乙 → 丙',
  R3: '甲区之前只允许 H1 标题 / 引用块 / 空行（不许散着写别的）',
  R4: '甲区必须含「目标」与「判据」',
  R5: '乙区条目必须编号（`1.` / `- [ ]` / `- ` / `* `）',
}

const ZONE = /^##\s+([甲乙丙])区/
const H1 = /^#\s+/
const NUMBERED = /^\s*(?:\d+\.\s|[-*]\s+(?:\[[ xX]\]\s*)?)/
const SUBHEAD = /^###\s+/
const HAS_GOAL = /^\s*(?:\d+\.\s*|[-*]\s*)?\*{0,2}目标\*{0,2}[:：]/
const HAS_CRITERIA = /^\s*(?:\d+\.\s*|[-*]\s*)?\*{0,2}判据\*{0,2}[:：]/

/** 校验一份任务书文本；返回违规列表（空数组 = 合规） */
export function validateText(text) {
  const lines = text.split('\n')
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

  // R1
  if (!jia.length) push(1, 'R1', '没有 `## 甲区` 标题')
  else if (jia.length > 1) push(jia[1].line, 'R1', `甲区标题出现了 ${jia.length} 次`)
  else if (jia[0].line > 5) push(jia[0].line, 'R1', `甲区在第 ${jia[0].line} 行，要求 ≤5`)

  // R2
  if (!yi.length) push(1, 'R2', '没有 `## 乙区` 标题')
  if (!bing.length) push(1, 'R2', '没有 `## 丙区` 标题')
  if (jia.length && yi.length && jia[0].line > yi[0].line) {
    push(yi[0].line, 'R2', '乙区出现在甲区之前')
  }
  if (yi.length && bing.length && yi[0].line > bing[0].line) {
    push(bing[0].line, 'R2', '丙区出现在乙区之前')
  }

  // R3：甲区之前只允许"头信息"（H1 标题 / 引用块 `>` / 空行）；三区之后没有第四区概念（丙区到文末）
  const firstZone = zones.length ? zones[0].line : Infinity
  for (let i = 0; i < firstZone - 1 && i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    if (H1.test(line) || /^\s*>/.test(line)) continue
    push(i + 1, 'R3', '甲区之前只允许 H1 标题、引用块或空行')
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

function main(argv) {
  const files = argv.filter((a) => !a.startsWith('-'))
  if (!files.length) {
    console.error('用法：node scripts/task-spec.mjs <任务书.md> [更多文件…]')
    process.exit(2)
  }
  let failed = 0
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`[task-spec] 文件不存在：${file}`)
      failed += 1
      continue
    }
    const violations = validateText(readFileSync(file, 'utf8'))
    if (!violations.length) {
      console.log(`[task-spec] 通过：${file}`)
      continue
    }
    failed += 1
    console.error(`[task-spec] 失败：${file}（${violations.length} 处）`)
    for (const v of violations) {
      console.error(`  ${file}:${v.line}  违反 ${v.rule}（${RULES[v.rule]}）：${v.detail}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] && process.argv[1].endsWith('task-spec.mjs')) main(process.argv.slice(2))
