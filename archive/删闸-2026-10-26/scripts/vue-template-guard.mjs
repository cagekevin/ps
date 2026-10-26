#!/usr/bin/env node
// 是什么：Vue 模板守卫——抓「编译得过去、真机崩」的两类问题：BOM 头、模板里的非法属性名
// 替代了什么：口头约定"别手抖"。2026-10-23 真机整页崩溃就是一行游离的 `` `n `` 混进了
//   `<UseGridItem>` 的标签里：@vue/compiler-sfc 编译 0 错误、jsdom 挂载也不抛，
//   真机 Chromium 执行 setAttribute('`n','') 抛 InvalidCharacterError → 整页挂载失败。
// 谁在用：`npm run template:guard`（已接进 `npm run check`）与 `tests/scripts/vue-template-guard.test.ts`
// 禁止：把它扩成"模板风格检查"（缩进/属性顺序）；它只认"会让运行时炸"的字符与编码问题。

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from '@vue/compiler-sfc'

const ROOT = process.cwd()
const RULES = {
  R2: '模板里的属性/指令名只允许 [A-Za-z0-9_:.@#\\-\\[\\]()$]（反引号等字符会让运行时 setAttribute 抛错）',
  R3: 'SFC 必须能被 @vue/compiler-sfc 解析',
}

/** 合法属性名字符集：Vue 自己的指令前缀（`@` `:` `#` `v-`）与事件修饰都落在这里 */
const NAME_OK = /^[A-Za-z0-9_:.@#\-[\]()$]+$/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/** 遍历模板 AST，收集所有属性名 */
function collectPropNames(node, out) {
  if (!node) return
  if (Array.isArray(node)) {
    for (const child of node) collectPropNames(child, out)
    return
  }
  if (node.type === 1) {
    for (const prop of node.props ?? []) {
      if (prop.type === 6 && prop.name) out.push(prop.name) // 普通 attribute
      if (prop.type === 7 && prop.rawName) out.push(prop.rawName) // 指令（v-if / @click / :prop）
    }
  }
  collectPropNames(node.children, out)
}

export function validateText(text) {
  const violations = []

  // BOM 只统计、不判红：仓里 14 个文件带 BOM（含冻结页），真机跑得动——它不是崩溃原因，
  // 别为了它去改冻结页。要清理时用 `node scripts/vue-template-guard.mjs --bom-list`。

  const { descriptor, errors } = parse(text, { filename: 'x.vue' })
  if (errors.length) {
    for (const error of errors) {
      const line = error.loc?.start?.line ?? 1
      violations.push({ line, rule: 'R3', detail: String(error.message).slice(0, 120) })
    }
    return violations
  }

  const names = []
  collectPropNames(descriptor.template?.ast ?? null, names)
  const source = descriptor.template?.content ?? ''
  for (const name of names) {
    if (NAME_OK.test(name)) continue
    // 报错行号：在模板正文里找第一次出现的位置（够用；非法名字本身就罕见）
    const index = source.indexOf(name)
    const line =
      index < 0
        ? (descriptor.template?.loc.start.line ?? 1)
        : (descriptor.template?.loc.start.line ?? 1) + source.slice(0, index).split('\n').length - 1
    violations.push({ line, rule: 'R2', detail: `属性名含非法字符：${JSON.stringify(name)}` })
  }

  return violations.sort((a, b) => a.line - b.line)
}

function main(argv) {
  const targets = argv.filter((a) => !a.startsWith('-'))
  const files = targets.length ? targets : walk(join(ROOT, 'src'))
  let failed = 0
  let checked = 0

  for (const file of files) {
    checked += 1
    const violations = validateText(readFileSync(file, 'utf8'))
    if (!violations.length) continue
    failed += 1
    const label = relative(ROOT, file)
    console.error(`[template] 失败：${label}（${violations.length} 处）`)
    for (const v of violations) {
      console.error(`  ${label}:${v.line}  违反 ${v.rule}（${RULES[v.rule]}）：${v.detail}`)
    }
  }

  if (failed) process.exit(1)
  console.log(`[template] 通过：${checked} 个 .vue 没有非法属性名 / 解析错误`)
}

if (process.argv[1] && process.argv[1].endsWith('vue-template-guard.mjs'))
  main(process.argv.slice(2))
