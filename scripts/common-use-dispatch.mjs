#!/usr/bin/env node
// 是什么：从官方 `clickFunction` 的 switch 链抽出「格子名 → 左键行为」快照
// 替代了什么：我 2026-10-23 凭 `isMore` 猜"有子面板的格子左键就展开"（错），
//   官方只有 3 格左键=展开，其余是执行功能或什么都不做（`app.v4.js:37894`）
// 谁在用：`tests/domain/common-use-dispatch.test.ts`（用快照当外部预言机比对我们的表）
// 禁止：手改产物。名字/分支对不上时改的是**代码里的表**或**本脚本的解析规则**，不是改 json。
//
// 用法：node scripts/common-use-dispatch.mjs [--check]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'docs/原版/01-原版源码/panel/js/app.v4.js')
const OUT = resolve(ROOT, 'docs/生成/常用页-左键分派.json')

/** case 号 → 语义（逐个读官方 case 体确认，`app.v4.js:37896-37938`） */
const CASE_KIND = {
  4: { kind: 'command', target: 'embedImage' },
  6: { kind: 'command', target: 'cy_embedMultipleImage' },
  11: { kind: 'command', target: 'importMultipleImage' },
  13: { kind: 'toggle-setting', target: 'cyAutoFillColor' },
  16: { kind: 'command', target: 'coorectBlur' },
  18: { kind: 'command', target: 'swapWireframeFill' },
  20: { kind: 'command', target: 'optimizeDoc' },
  22: { kind: 'expand', target: 'open' },
  24: { kind: 'command', target: 'exportImage' },
  26: { kind: 'command', target: 'layerReplace' },
  28: { kind: 'command', target: 'locationTrade' },
  30: { kind: 'command', target: 'exchangeLayerColor' },
  32: { kind: 'none', target: '' },
}

const lines = readFileSync(SRC, 'utf8').split('\n')

/** 找分派链所在行（`a.t0 === "…" ? N : …`） */
function findChain() {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('a.t0 === "嵌入图片"')) return { line: i + 1, text: lines[i] }
  }
  return null
}

/** 解析 `"名字" ? N` 与 `"名字" || "名字2" ? N` 两种形态 */
function parseChain(text) {
  // 顺序扫：攒名字，遇到 `? N` 就把攒下的名字全部归到 N（`||` 组共用一个 case，`:37894` 的
  // `"自定义变换" || "参考线工具" || "按间距分布" ? 22` 就是这种形态）
  const entries = []
  const token = /"([^"]+)"|\?\s*(\d+)/g
  let pending = []
  let match
  while ((match = token.exec(text)) !== null) {
    if (match[1]) {
      pending.push(match[1])
      continue
    }
    const caseNo = Number(match[2])
    const semantic = CASE_KIND[caseNo]
    for (const name of pending) {
      if (semantic) entries.push({ name, caseNo, ...semantic })
    }
    pending = []
  }
  return entries
}

const chain = findChain()
if (!chain) {
  console.error('[commonUse-dispatch] 找不到分派链（`a.t0 === "嵌入图片"`）——官方源码换版本了？')
  process.exit(2)
}

const entries = parseChain(chain.text)
if (entries.length < 12) {
  console.error(`[commonUse-dispatch] 只解析出 ${entries.length} 条，少于预期 12 条——解析规则失效`)
  process.exit(2)
}

const snapshot = {
  generatedFrom: 'docs/原版/01-原版源码/panel/js/app.v4.js',
  chainLine: chain.line,
  entries,
}

const text = `${JSON.stringify(snapshot, null, 2)}\n`
const check = process.argv.includes('--check')

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== text) {
    console.error('[commonUse-dispatch] 快照已过期：跑 `npm run dispatch:snapshot` 重新生成')
    process.exit(1)
  }
  console.log(`[commonUse-dispatch] 快照最新：${entries.length} 条（分派链 :${chain.line}）`)
  process.exit(0)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, text)
console.log(`[commonUse-dispatch] 已生成 ${entries.length} 条（分派链 :${chain.line}）`)
