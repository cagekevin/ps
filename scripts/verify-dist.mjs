/**
 * 产物断言 —— 只查"构建成功但跑不起来"的三件事。
 *
 * 为什么只有三条：其余（manifest、sprite、体积）在构建流程里已经被保证，
 * 测了也不会失败。见 docs/日志 里关于 ROI 的判断。
 *
 * 【判据形态：判「属性」，不判「子串」】
 *   旧版用 `/<script[^>]*\bdefer\b/` 与 `/type\s*=\s*"module"/` 在整份 HTML 上找子串，
 *   于是 `<script data-note="defer">` 会被报成"有 defer"、`data-type="module"` 会被报成
 *   "有 type=module"（两个方向都错：既放过假产物，也误杀真产物）。TD-17-14。
 *   现在把 `<script …>` 的**属性名**解析出来再判：属性名是结构，子串只是文本。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const EXT_ID = 'com.local.psz.panel.v5'
const appData = process.env.APPDATA ?? ''
const outDir = process.env.PSZ_EXT_DIR || join(appData, 'Adobe', 'CEP', 'extensions', EXT_ID)

/**
 * 解析出所有 `<script …>` 开标签，返回每个标签的属性（名字小写 → 原始值）。
 * 不引 HTML 解析器：只需要开标签里的属性，而属性语法本身很小（名 [= 值]）。
 */
export function scriptAttrs(html) {
  const tags = []
  for (const start of html.matchAll(/<script\b/gi)) {
    // 找开标签结束：引号内的 `>` 不算结束
    let i = start.index + '<script'.length
    let quote = ''
    for (; i < html.length; i += 1) {
      const ch = html[i]
      if (quote) {
        if (ch === quote) quote = ''
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        continue
      }
      if (ch === '>') break
    }
    const inner = html.slice(start.index + '<script'.length, i)
    const attrs = new Map()
    for (const m of inner.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g)) {
      attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '')
    }
    tags.push(attrs)
  }
  return tags
}

const problems = []

const indexPath = join(outDir, 'index.html')
if (!existsSync(indexPath)) {
  console.error(`[verify] 找不到产物：${indexPath}`)
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')
const tags = scriptAttrs(html)

// 1. 模块脚本在 file:// 下会被 CORS 拦，直接白屏
const moduleTags = tags.filter(
  (attrs) => (attrs.get('type') ?? '').trim().toLowerCase() === 'module',
)
if (moduleTags.length) {
  problems.push(
    `index.html 有 ${moduleTags.length} 个 <script type="module"> —— file:// 下会被 CORS 拦，面板白屏`,
  )
}

// 2. 脚本在 head 里，没有 defer 会在 <body> 之前执行，mount('#app') 拿不到节点
const deferred = tags.filter((attrs) => attrs.has('defer'))
if (!deferred.length) {
  problems.push(
    'index.html 没有任何带 defer 属性的 <script> —— 会在 body 之前执行，Vue 挂载失败（判据：标签上真有 defer 属性，不是文本里出现 defer）',
  )
}
if (deferred.length && !deferred.some((attrs) => attrs.has('src'))) {
  problems.push('带 defer 的 <script> 没有 src —— 没有外部脚本可延后执行')
}

// 3. jsxbin 没进产物的话，页面能打开但所有 PS 操作都会报错
const libPath = join(outDir, 'lib', 'all.decrypted.js')
if (!existsSync(libPath)) {
  problems.push('lib/all.decrypted.js 不存在 —— public/lib 是不是被删了？')
} else if (statSync(libPath).size < 300_000) {
  problems.push(`lib/all.decrypted.js 只有 ${statSync(libPath).size} 字节，明显不对（应该 ~338KB）`)
}

/** 构建体积：只统计产物文件，排除 node_modules；超过 2MB 告警，不阻断 */
const SIZE_LIMIT = 2 * 1024 * 1024

function walk(dir) {
  const result = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const file = join(dir, name)
    const stat = statSync(file)
    if (stat.isDirectory()) result.push(...walk(file))
    else result.push({ file, size: stat.size })
  }
  return result
}

const files = walk(outDir)
const jsFiles = files.filter((item) => item.file.endsWith('.js'))
const totalSize = files.reduce((sum, item) => sum + item.size, 0)
const topJs = [...jsFiles].sort((a, b) => b.size - a.size).slice(0, 5)

if (problems.length) {
  console.error('\n[verify] 产物有问题：\n')
  for (const p of problems) console.error(`  ✗ ${p}`)
  console.error('')
  process.exit(1)
}

console.log(
  `[verify] 产物体积：${(totalSize / 1024).toFixed(1)} KB；JS ${(jsFiles.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB`,
)
for (const item of topJs) {
  console.log(`  ${(item.size / 1024).toFixed(1)} KB  ${relative(outDir, item.file)}`)
}

const bundleSize = jsFiles.reduce((sum, item) => sum + item.size, 0)
if (bundleSize > SIZE_LIMIT) {
  console.warn(`[verify] 警告：JS 产物超过 ${(SIZE_LIMIT / 1024 / 1024).toFixed(0)} MB，建议分包`)
}

console.log(
  `[verify] 产物通过：${tags.length} 个 script 标签里无 type="module"、有 defer+src、jsxbin 就位`,
)
