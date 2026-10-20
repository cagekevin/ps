/**
 * 产物断言 —— 只查"构建成功但跑不起来"的三件事。
 *
 * 为什么只有三条：其余（manifest、sprite、体积）在构建流程里已经被保证，
 * 测了也不会失败。见 docs/log 里关于 ROI 的判断。
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const EXT_ID = 'com.local.psz.panel.v5'
const appData = process.env.APPDATA ?? ''
const outDir = process.env.PSZ_EXT_DIR || join(appData, 'Adobe', 'CEP', 'extensions', EXT_ID)

const problems = []

const indexPath = join(outDir, 'index.html')
if (!existsSync(indexPath)) {
  console.error(`[verify] 找不到产物：${indexPath}`)
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')

// 1. 模块脚本在 file:// 下会被 CORS 拦，直接白屏
if (/type\s*=\s*"module"/.test(html)) {
  problems.push('index.html 里还有 type="module" —— file:// 下会被 CORS 拦，面板白屏')
}

// 2. 脚本在 head 里，没有 defer 会在 <body> 之前执行，mount('#app') 拿不到节点
if (!/<script[^>]*\bdefer\b/.test(html)) {
  problems.push('index.html 的 <script> 没有 defer —— 会在 body 之前执行，Vue 挂载失败')
}

// 3. jsxbin 没进产物的话，页面能打开但所有 PS 操作都会报错
const libPath = join(outDir, 'lib', 'all.decrypted.js')
if (!existsSync(libPath)) {
  problems.push('lib/all.decrypted.js 不存在 —— public/lib 是不是被删了？')
} else if (statSync(libPath).size < 300_000) {
  problems.push(`lib/all.decrypted.js 只有 ${statSync(libPath).size} 字节，明显不对（应该 ~338KB）`)
}

if (problems.length) {
  console.error('\n[verify] 产物有问题：\n')
  for (const p of problems) console.error(`  ✗ ${p}`)
  console.error('')
  process.exit(1)
}

console.log('[verify] 产物通过：无 type="module"、有 defer、jsxbin 就位')
