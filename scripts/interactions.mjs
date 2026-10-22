/**
 * 从原版 render 函数里提取交互点，生成「原版交互清单」。
 *
 *   node scripts/interactions.mjs
 *
 * 为什么要它：字体页漏了 8 个细节（右键打标签、hover 操作区、字重小预览…），
 * 根因是"按组件树推功能，没穷举交互点"。有了清单就能逐条打勾，而不是靠回忆。
 *
 * 数据源：webpack 渲染函数里的 `staticClass: "xxx"` + `on: { click: ... }`。
 * 解析是启发式的，不保证 100% 完整，只适合当"某元素有没有事件"的排查表。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC_DIR = join(root, '..', 'archive', '源码还原', 'webcrack输出', 'app')
const OUT = join(root, 'docs', '生成/交互清单.md')

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (n.endsWith('.js')) out.push(p)
  }
  return out
}

/** 事件名 → 中文 */
const EVENT_LABEL = {
  click: '点击',
  dblclick: '双击',
  contextmenu: '右键',
  mouseenter: '移入',
  mouseleave: '移出',
  input: '输入',
  keydown: '按键',
  scroll: '滚动',
  change: '变更',
}

const entries = []

for (const file of walk(SRC_DIR)) {
  const text = readFileSync(file, 'utf8')
  const onRe = /\bon:\s*\{/g
  let m
  while ((m = onRe.exec(text)) !== null) {
    const start = m.index
    // 往前找最近的 staticClass 作为元素标识
    const before = text.slice(Math.max(0, start - 700), start)
    const classes = [...before.matchAll(/staticClass:\s*"([^"]+)"/g)]
    const element = classes.length ? classes[classes.length - 1][1] : ''
    if (!element) continue

    // 截取 on 对象（简单配对括号）
    let depth = 0
    let end = start + m[0].length - 1
    for (let i = start + m[0].length - 1; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    const body = text.slice(start, end)
    const events = [
      ...body.matchAll(
        /\b(click|dblclick|contextmenu|mouseenter|mouseleave|input|keydown|scroll|change):/g,
      ),
    ].map((x) => x[1])
    if (!events.length) continue

    entries.push({
      element,
      events: [...new Set(events)],
      file: relative(SRC_DIR, file).replace(/\\/g, '/'),
    })
  }
}

// 按 BEM 前缀（前两段）分组
const groups = new Map()
for (const e of entries) {
  const parts = e.element.split('__')
  const group =
    parts.length > 1 ? `${parts[0]}__${parts[1].split(' ')[0]}` : e.element.split(' ')[0]
  if (!groups.has(group)) groups.set(group, [])
  groups.get(group).push(e)
}

const lines = [
  '# 原版交互清单',
  '',
  '> 由 `npm run interactions` 从原版 render 函数自动提取，**别手改**。',
  '> 用途：做页面前对照这份清单，做完逐条打勾。',
  '> 字体页就是没对照清单，漏了右键打标签、hover 操作区、字重小预览等 8 处。',
  '',
  `提取到 ${entries.length} 个交互点，分布在 ${groups.size} 个组件里。`,
  '',
]

for (const [group, list] of [...groups.entries()].sort()) {
  lines.push(`## ${group}`)
  lines.push('')
  lines.push('| 元素 | 事件 | 状态 |')
  lines.push('|---|---|---|')
  const seen = new Set()
  for (const item of list) {
    const key = `${item.element}|${item.events.join(',')}`
    if (seen.has(key)) continue
    seen.add(key)
    const ev = item.events.map((x) => EVENT_LABEL[x] ?? x).join(' / ')
    lines.push(`| \`${item.element}\` | ${ev} | ☐ |`)
  }
  lines.push('')
}

writeFileSync(OUT, lines.join('\n'), 'utf8')
console.log(
  `[interactions] 已生成 docs/生成/交互清单.md：${entries.length} 个交互点，${groups.size} 个组件`,
)
