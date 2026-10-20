/**
 * 样式守卫 —— 优先自动修，修不了才报错。
 *
 *   node scripts/style-guard.mjs            检查（默认）
 *   node scripts/style-guard.mjs --fix      自动把已知裸值替换成 token，修不了的列出来
 *   node scripts/style-guard.mjs --update   把当前违规数量写进 docs/style-baseline.json
 *
 * 设计依据见 docs/架构决策.md ADR-10：自动修复的成本 ≈ 0，报错阻止要人肉改，贵一个数量级。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'src')
const TOKENS = join(root, 'src', 'styles', 'tokens.css')
const BASELINE = join(root, 'docs', 'style-baseline.json')

/** token 文件本身当然可以写裸值 */
const ALLOW_FILES = new Set(['src/styles/tokens.css', 'src/styles/global.css', 'src/styles/motion.css'])

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g
const FS_RE = /font-size:\s*(\d+)px/g
const RADIUS_RE = /border-radius:\s*(\d+)px/g

/** 归一化，让 rgba(64,64,64,.96) 和 rgba(64, 64, 64, 0.96) 能对上 */
function norm(value) {
  let out = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(^|[^\d])\.(\d)/g, (_m, a, b) => `${a}0.${b}`)

  // #fff 和 #ffffff 要能对上
  const short = out.match(/^#([0-9a-f]{3,4})$/)
  if (short) out = '#' + short[1].split('').map((c) => c + c).join('')

  return out
}

/** 从 tokens.css 反推「字面值 → 变量名」的映射 */
function buildMaps() {
  const css = readFileSync(TOKENS, 'utf8')
  const colorMap = new Map()
  const fsMap = new Map()
  const radiusMap = new Map()

  for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    const name = m[1]
    const value = m[2].trim()
    if (value.includes('var(')) continue // 别名不参与反查

    // --fs-* 和 --preview-*（排除 --preview-*-lh 那种行高）
    if (name.startsWith('fs-') || (name.startsWith('preview-') && !name.endsWith('-lh'))) {
      const px = value.match(/^(\d+)px$/)
      if (px) fsMap.set(px[1], `var(--${name})`)
      continue
    }
    if (name.startsWith('r-')) {
      const px = value.match(/^(\d+)px$/)
      if (px) radiusMap.set(px[1], `var(--${name})`)
      continue
    }
    if (name.startsWith('c-')) colorMap.set(norm(value), `var(--${name})`)
  }

  return { colorMap, fsMap, radiusMap }
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else if (name.endsWith('.vue') || name.endsWith('.css')) out.push(abs)
  }
  return out
}

/** 只处理 <style> 块，模板和脚本一律不动 */
function mapStyleBlocks(content, fn) {
  return content.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open, body, close) => {
    return open + fn(body) + close
  })
}

/**
 * 只取出 <style> 块的内容用于计数。
 * 注意不能直接用 mapStyleBlocks(content, b => b) —— 那是"原样替换"，
 * 返回的仍是整个文件（含模板），会把模板里的 SVG fill 属性误判成硬编码。
 */
function extractStyle(content) {
  const blocks = []
  content.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, _open, body) => {
    blocks.push(body)
    return ''
  })
  return blocks.join('\n')
}

/** 模板规则（不只 <style>）：图标尺寸必须用预设名 */
const TEMPLATE_RULES = [
  {
    id: 'icon-size',
    re: /<Icon\b[^>]*?:size="\d+"/g,
    hint: '图标尺寸用预设名：size="2xs|xs|sm|md|lg|xl|2xl"，见 docs/视觉规范.md',
  },
]

/** 自动修复用的映射，和 components/icon/size.ts 保持一致 */
const SIZE_TO_NAME = { 9: '2xs', 10: 'xs', 14: 'sm', 16: 'md', 18: 'lg', 20: 'xl', 24: '2xl' }

function stripStyle(content) {
  return content.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
}

function countTemplate(content) {
  const tpl = stripStyle(content)
  let count = 0
  for (const rule of TEMPLATE_RULES) {
    const hits = tpl.match(rule.re)
    if (hits) count += hits.length
  }
  return count
}

/**
 * 注释里的色值不算违规（注释里写「原版是 #535353」是正常文档行为）。
 * 修复时也要跳过注释，否则会把注释内容也改写掉。
 */
function maskComments(css) {
  const store = []
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    store.push(match)
    return `\u0000C${store.length - 1}\u0000`
  })
  return {
    masked,
    restore: (text) => text.replace(/\u0000C(\d+)\u0000/g, (_m, index) => store[Number(index)]),
  }
}

/** 原版有 64 处 !important，是维护噩梦；我们一律禁止 */
const IMPORTANT_RE = /!important/g

/** 负 margin 是布局补丁，一律禁止（查 1） */
const MARGIN_NEG_RE = /margin:\s*-/g

/**
 * 静默失败检查（查 7）：store 里声明的 xxxError 必须在某个组件里被渲染。
 * 反例：tagsError 赋值 5 次、模板 0 次引用 —— 读失败时用户只看到"空的"。
 */
function checkSilentErrors() {
  const storeDir = join(SRC, 'stores')
  if (!existsSync(storeDir)) return []

  const vueText = walk(SRC)
    .filter((f) => f.endsWith('.vue'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')

  const problems = []
  for (const file of walk(storeDir)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/const (\w*Error) = ref\(/g)) {
      if (!vueText.includes(m[1])) {
        problems.push(`${relative(root, file).replace(/\\/g, '/')} 的 ${m[1]} 没有被任何组件渲染`)
      }
    }
  }
  return problems
}

function countViolations(css) {
  const { masked } = maskComments(css)
  let count = 0
  for (const re of [COLOR_RE, FS_RE, RADIUS_RE, IMPORTANT_RE, MARGIN_NEG_RE]) {
    const hits = masked.match(re)
    if (hits) count += hits.length
  }
  return count
}

function collect() {
  const result = {}
  for (const abs of walk(SRC)) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (ALLOW_FILES.has(rel)) continue

    const content = readFileSync(abs, 'utf8')
    const css = abs.endsWith('.vue') ? extractStyle(content) : content
    if (!css.trim()) continue

    let count = countViolations(css)
    if (abs.endsWith('.vue')) count += countTemplate(content)

    // 原版残留 40 处 console.log，我们统一走 utils/logger.ts
    if (!rel.endsWith('utils/logger.ts')) {
      const logs = content.match(/\bconsole\.log\(/g)
      if (logs) count += logs.length
    }

    if (count > 0) result[rel] = count
  }
  return result
}

function fix() {
  const maps = buildMaps()
  let totalFixed = 0
  let touched = 0
  const leftovers = []

  for (const abs of walk(SRC)) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (ALLOW_FILES.has(rel)) continue

    const content = readFileSync(abs, 'utf8')
    let fixed = 0

    const applyFix = (rawCss) => {
      const { masked, restore } = maskComments(rawCss)
      let out = masked.replace(COLOR_RE, (match) => {
        const hit = maps.colorMap.get(norm(match))
        if (!hit) return match
        fixed++
        return hit
      })
      out = out.replace(FS_RE, (match, px) => {
        const hit = maps.fsMap.get(px)
        if (!hit) return match
        fixed++
        return `font-size: ${hit}`
      })
      out = out.replace(RADIUS_RE, (match, px) => {
        const hit = maps.radiusMap.get(px)
        if (!hit) return match
        fixed++
        return `border-radius: ${hit}`
      })
      return restore(out)
    }

    let next = abs.endsWith('.vue') ? mapStyleBlocks(content, applyFix) : applyFix(content)

    // 模板里的裸图标尺寸也能自动修
    if (abs.endsWith('.vue')) {
      next = next.replace(/<Icon\b[^>]*?:size="(\d+)"/g, (match, px) => {
        const name = SIZE_TO_NAME[px]
        if (!name) return match
        fixed++
        return match.replace(`:size="${px}"`, `size="${name}"`)
      })
    }

    if (fixed > 0) {
      writeFileSync(abs, next, 'utf8')
      totalFixed += fixed
      touched++
      console.log(`  ${rel}  修复 ${fixed} 处`)
    }

    // 修完还剩多少（这些是 token 里没有对应值的，需要人工决定）
    const remainingCss = abs.endsWith('.vue') ? extractStyle(next) : next
    let left = countViolations(remainingCss)
    if (abs.endsWith('.vue')) left += countTemplate(next)
    if (left > 0) leftovers.push({ file: rel, count: left })
  }

  console.log(`\n[style] 自动修复 ${totalFixed} 处，涉及 ${touched} 个文件`)

  if (leftovers.length) {
    console.log('[style] 剩余无法自动映射的（需要人工决定是加 token 还是保留）：')
    for (const item of leftovers) console.log(`  ${item.file}  ${item.count} 处`)
  }

  console.log('\n[style] 建议接着执行：npm run style:baseline   （收紧允许上限）')
}

const command = process.argv.includes('--fix')
  ? 'fix'
  : process.argv.includes('--update')
    ? 'update'
    : 'check'

if (command === 'fix') {
  fix()
} else if (command === 'update') {
  const current = collect()
  writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  const total = Object.values(current).reduce((a, b) => a + b, 0)
  console.log(`[style] 已写入 baseline：${Object.keys(current).length} 个文件，${total} 处待清理`)
} else {
  const current = collect()
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}
  const problems = []

  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0
    if (count > allowed) problems.push({ file, count, allowed })
  }

  if (problems.length) {
    console.error('\n[style] 有硬编码样式，超出允许数量：\n')
    for (const p of problems) console.error(`  ${p.file}  ${p.count} 处（上限 ${p.allowed}）`)
    console.error('\n  先试 npm run style:fix 自动修，修不了再手动加 token。\n')
    process.exit(1)
  }

  // 查 7：store 里的 xxxError 必须被渲染，否则就是静默失败
  const silent = checkSilentErrors()
  if (silent.length) {
    console.error('\n[style] 静默失败（读不到 ≠ 没有）：\n')
    for (const p of silent) console.error(`  ${p}`)
    console.error('\n  这些错误状态被赋值了但没有任何组件渲染，用户只会看到"空的"。\n')
    process.exit(1)
  }

  const tightened = Object.entries(baseline).filter(([file, allowed]) => (current[file] ?? 0) < allowed)
  console.log('[style] 通过：无新增硬编码、无负 margin、无静默失败')
  if (tightened.length) console.log(`[style] ${tightened.length} 个文件的违规数已下降，可执行 npm run style:baseline 收紧`)
}
