/**
 * 样式守卫 —— 优先自动修，修不了才报错。
 *
 *   node scripts/style-guard.mjs            检查（默认）
 *   node scripts/style-guard.mjs --fix      自动把已知裸值替换成 token，修不了的列出来
 *   node scripts/style-guard.mjs --update   把当前违规数量写进 docs/生成/样式基线.json
 *
 * 设计依据见 docs/架构/决策记录.md ADR-10：自动修复的成本 ≈ 0，报错阻止要人肉改，贵一个数量级。
 *
 * 【两类判据，别混】
 *   A. **计数型**（色值/字号/圆角/!important）：按文件记上限，`docs/生成/样式基线.json` 只许减。
 *   B. **结构型**（负 margin / 动效裸时长 / 裸类名撞名）：不是"少写几个"，是"写了就是错"，
 *      所以走**具名例外清单**（文件:行 + 为什么现在不改 + 谁负责），不进计数基线。
 *      TD-17-13：负 margin 旧版只认缩写 `margin:`，`margin-left:-9px` 放行。
 *
 *   动效只判 `transition`，不判 `animation`：token 只有 120/180/240ms 三档过渡，
 *   转圈动画（`g-btn-spin 0.7s`）没有对应 token，硬套 token = 逼着改无关代码（A12）。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root =
  process.argv.find((a) => a.startsWith('--root='))?.slice(7) ??
  fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'src')
const TOKENS = join(root, 'src', 'styles', 'tokens.css')
const BASELINE = join(root, 'docs', '生成/样式基线.json')

/** token 文件本身当然可以写裸值 */
const ALLOW_FILES = new Set([
  'src/styles/tokens.css',
  'src/styles/global.css',
  'src/styles/motion.css',
])

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
  if (short)
    out =
      '#' +
      short[1]
        .split('')
        .map((c) => c + c)
        .join('')

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

/** 只取模板部分：脚本里的 `:style` 字符串不算模板内联样式 */
function templateOf(content) {
  const start = content.indexOf('<template>')
  const end = content.lastIndexOf('</template>')
  if (start < 0 || end <= start) return ''
  return content.slice(start + '<template>'.length, end)
}

/**
 * 模板内联样式（D-22）：只放行 `:style="{ '--x': v }"` 这种纯 CSS 变量绑定。
 *
 * 颜色 / 尺寸字面值（`style="width:12px"`、`:style="{ width }"`）既绕过 token，
 * 也绕过只扫 `<style>` 块的老规则，所以这里按「属性值必须是纯 -- 变量对象」判定。
 * 定位类动态值由 composable 直接写元素上的 `--floating-x/y`，模板里不出现 :style。
 */
const INLINE_STYLE_RE = /(?::style|v-bind:style)\s*=\s*"([^"]*)"|(?<![:@\w-])style\s*=\s*"([^"]*)"/g
const STYLE_KEY_RE = /(?:^\{|,)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$-]*))\s*:/g

function isCssVarOnlyStyle(expr) {
  const text = expr.trim()
  if (!text.startsWith('{') || !text.endsWith('}')) return false
  const keys = [...text.matchAll(STYLE_KEY_RE)].map((m) => m[1] ?? m[2] ?? m[3])
  return keys.length > 0 && keys.every((key) => key.startsWith('--'))
}

function countInlineStyles(content) {
  let count = 0
  for (const match of templateOf(content).matchAll(INLINE_STYLE_RE)) {
    // m[1] 是 :style 绑定表达式；字面量 style="..." 落到 m[2]，一律算违规
    if (match[1] === undefined || !isCssVarOnlyStyle(match[1])) count++
  }
  return count
}

/** 模板规则（不只 <style>）：图标尺寸必须用预设名 */
const TEMPLATE_RULES = [
  {
    id: 'icon-size',
    re: /<Icon\b[^>]*?:size="\d+"/g,
    hint: '图标尺寸用预设名：size="2xs|xs|sm|md|lg|xl|2xl"，见 docs/规范/视觉规范.md',
  },
  {
    id: 'inline-style',
    count: countInlineStyles,
    hint: '模板内联样式只允许 CSS 变量：:style="{ \'--x\': v }" + <style> 里 var(--x)；颜色/尺寸字面值进 <style> 用 token。',
  },
]

/** 自动修复用的映射，和 components/icon/size.ts 保持一致 */
const SIZE_TO_NAME = {
  4: '3xs',
  9: '2xs',
  10: 'xs',
  14: 'sm',
  16: 'md',
  18: 'lg',
  20: 'xl',
  24: '2xl',
}

function stripStyle(content) {
  return content.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
}

function countTemplate(content) {
  const tpl = stripStyle(content)
  let count = 0
  for (const rule of TEMPLATE_RULES) {
    if (rule.count) {
      count += rule.count(tpl)
      continue
    }
    const hits = tpl.match(rule.re)
    if (hits) count += hits.length
  }
  return count
}

/**
 * 注释里的色值不算违规（注释里写「原版是 #535353」是正常文档行为）。
 * 修复时也要跳过注释，否则会把注释内容也改写掉。
 *
 * 与 `scripts/source-scan.mjs` 的 `maskComments` **不是同一个东西**，别互换：
 * 那份是 JS 注释（还会遮蔽字符串/模板串），返回同长字符串；这份是 **CSS 注释**（`/* … *\/`），
 * 返回 `{masked, restore}` —— `restore` 是 `--fix` 改写回原文件必须的。
 */
function maskCssComments(css) {
  const store = []
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    store.push(match)
    return `\u0000C${store.length - 1}\u0000`
  })
  return {
    masked,
    // \u0000 是做占位符用的控制字符，只在内部中间产物里出现，不会落到文件
    // eslint-disable-next-line no-control-regex
    restore: (text) => text.replace(/\u0000C(\d+)\u0000/g, (_m, index) => store[Number(index)]),
  }
}

/** 原版有 64 处 !important，是维护噩梦；我们一律禁止 */
const IMPORTANT_RE = /!important/g

/**
 * 样式分层守卫：
 *   ① 禁止 :deep() —— 页面不该从外部改公共组件内部，
 *      需要不同尺寸就让公共组件读 CSS 变量（--input-height 这类）
 *   ② 同一文件内同一个选择器只能出现一次 —— 反复追加会让样式变成补丁堆
 */
function checkLayering() {
  const problems = []
  for (const file of walk(SRC)) {
    if (!file.endsWith('.vue') && !file.endsWith('.css')) continue
    const text = readFileSync(file, 'utf8')
    const rel = relative(root, file).replace(/\\/g, '/')

    // 先剥掉注释，否则注释里写的 :deep() 也会被算成违规
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '')

    const deep = stripped.match(/:deep\(/g)
    if (deep) problems.push(`${rel} 用了 ${deep.length} 处 :deep()，改用 CSS 变量出口`)

    // 只看 <style> 里的规则，避免把模板里的东西算进来
    const styleStart = stripped.indexOf('<style')
    const styles = styleStart >= 0 ? stripped.slice(styleStart) : stripped
    const seen = new Map()
    for (const m of styles.matchAll(/([^{}@/]+)\{[^}]*\}/g)) {
      const sel = m[1].trim().replace(/\s+/g, ' ')
      if (!sel || sel.startsWith('/*')) continue
      seen.set(sel, (seen.get(sel) ?? 0) + 1)
    }
    const dup = [...seen].filter(([, n]) => n > 1)
    if (dup.length) {
      problems.push(`${rel} 有重复选择器：${dup.map(([s, n]) => `${s}×${n}`).join('、')}`)
    }
  }
  return problems
}

/**
 * 负 margin 是布局补丁，一律禁止（查 1）。
 *
 * 判据不是"冒号后面紧跟减号"，而是**值的任一分量是负数**：
 * `margin: 0 -8px` / `margin-left: -9px` / `margin-block-start: -4px` 都算。
 * 旧版只认 `margin:\s*-`，长写（`margin-left`）与两值缩写（`margin: 0 -8px`）全放行。
 */
const MARGIN_NEG_RE = /(?:^|[;{\s])margin(?:-[a-z-]+)?\s*:\s*([^;}]+)/g

function hasNegativeMargin(value) {
  return value
    .trim()
    .split(/\s+/)
    .some((part) => /^-(?:\d|\.\d)/.test(part))
}

/**
 * 结构型判据（不是"少写几个"，是"写了就是错"）。三条，全部按结构判、不用名单：
 *
 * 1. `neg-margin`：`margin` 值的任一分量是负数（缩写与长写一视同仁）
 * 2. `motion-raw`：`transition` / `transition-duration` 里写时间字面量（硬规则 3：动效只用 token）
 *    —— 只判 transition：token 只有 120/180/240ms 三档过渡，转圈动画（`g-btn-spin 0.7s`）
 *       没有对应 token，逼它套 token = 改无关代码（A12）
 * 3. `bare-collision`：**裸类名**（无 `-` / `__` / `--` 的单词类名）在同一仓里被 ≥2 个文件定义。
 *    为什么不判"裸类名一律禁"：盘上有 35 个裸类名（`.tag` `.modal` `.nav`…），
 *    一律禁 = 让几十处无关代码变红，说明判据错了（A12）。硬规则 6 给的理由本身就是
 *    "最容易撞" ⇒ 判**撞**，不判**写法**。
 */
const MOTION_RAW_RE = /(?:^|[;{\s])transition(?:-duration)?\s*:\s*([^;}]+)/g
const TIME_LITERAL_RE = /\d+(?:\.\d+)?m?s\b/

function styleText(file, content) {
  const isVue = file.endsWith('.vue')
  const blocks = []
  if (isVue) {
    content.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (_m, body) => {
      blocks.push(body)
      return ''
    })
    return blocks.length ? blocks.join('\n') : null // 没有 <style> = 不参与
  }
  return content
}

/** 只取选择器里的类名（跳过属性值 / 注释），带类名首次出现的行号 */
function selectorClasses(css) {
  const out = []
  const masked = maskCssComments(css).masked
  for (const rule of masked.matchAll(/([^{}]+)\{[^}]*\}/g)) {
    const line = masked.slice(0, rule.index).split('\n').length
    for (const cls of rule[1].matchAll(/\.([a-zA-Z][\w-]*)/g)) out.push({ name: cls[1], line })
  }
  return out
}

function structuralProblems() {
  const hits = []
  /** 类名 → 定义过它的文件（撞名判据） */
  const owners = new Map()

  for (const abs of walk(SRC)) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (ALLOW_FILES.has(rel)) continue
    const css = styleText(abs, readFileSync(abs, 'utf8'))
    if (!css) continue

    // 注释里的字面值不算违规（注释里写"原版 -9px"是文档行为）
    const { masked } = maskCssComments(css)
    masked.split('\n').forEach((line, index) => {
      for (const m of line.matchAll(new RegExp(MARGIN_NEG_RE.source, 'g'))) {
        if (hasNegativeMargin(m[1])) {
          hits.push({ rule: 'neg-margin', file: rel, line: index + 1, text: line.trim() })
        }
      }
      for (const m of line.matchAll(new RegExp(MOTION_RAW_RE.source, 'g'))) {
        const value = m[1]
        if (!TIME_LITERAL_RE.test(value) || value.includes('var(')) continue
        hits.push({ rule: 'motion-raw', file: rel, line: index + 1, text: line.trim() })
      }
    })

    for (const cls of selectorClasses(css)) {
      if (/[-_]/.test(cls.name)) continue // g- / u- / page__x / is-x 都带分隔符
      if (!owners.has(cls.name)) owners.set(cls.name, [])
      const list = owners.get(cls.name)
      if (!list.some((item) => item.file === rel)) list.push({ file: rel, line: cls.line })
    }
  }

  for (const [name, list] of owners) {
    if (list.length < 2) continue
    for (const item of list) {
      hits.push({
        rule: 'bare-collision',
        file: item.file,
        line: item.line,
        text: `.${name} —— 同一个裸类名被 ${list.map((x) => x.file).join(' / ')} 定义`,
      })
    }
  }

  return hits
}

/**
 * 结构型判据的具名例外（文件 + 规则 + 为什么现在不改 + 谁负责）。
 * 与 `docs/生成/样式基线.json` 的计数基线**分开**：那是"少写几个"，这是"写了就是错"。
 */
const NAMED = [
  {
    rule: 'neg-margin',
    file: 'src/components/PageShell.vue',
    count: 1,
    where: 'src/components/PageShell.vue  `margin-left: -9px`',
    why: '页面骨架对原版做的一处视觉对位，挪掉要动布局（PageShell 是全站骨架，撞已冻结页）',
    owner: '用户 / 阶段 3（视觉对位统一时一并处理）',
  },
  {
    rule: 'motion-raw',
    file: 'src/pages/seBan/components/SwatchDot.vue',
    count: 1,
    where: 'src/pages/seBan/components/SwatchDot.vue  `transition: transform 0.12s`',
    why: '色板面板遗留的裸时长（0.12s ≈ --dur-fast），改成 var(--dur-fast) 属改页面样式，本轮不碰 src/',
    owner: '用户 / seBan 页面收尾',
  },
]

/** 具名例外扣减：允许 N 处，只报第 N+1 处；未具名的、过期的都算失败 */
function checkStructural() {
  const hits = structuralProblems()
  const quota = new Map(NAMED.map((n) => [`${n.rule} ${n.file}`, n.count]))
  const fresh = []
  for (const hit of hits) {
    const key = `${hit.rule} ${hit.file}`
    const left = quota.get(key) ?? 0
    if (left > 0) {
      quota.set(key, left - 1)
      continue
    }
    fresh.push(hit)
  }
  const isRepoRun = !process.argv.some((a) => a.startsWith('--root='))
  const unnamed = isRepoRun
    ? [...quota].filter(
        ([key, left]) => left > 0 && !NAMED.some((n) => `${n.rule} ${n.file}` === key),
      )
    : []
  const expired = isRepoRun
    ? NAMED.filter((n) => {
        const seen = hits.filter((h) => h.rule === n.rule && h.file === n.file).length
        return seen < n.count
      })
    : []
  return { fresh, unnamed, expired, total: hits.length }
}

/**
 * 图标名检查：`<Icon name="iconxxx">` 里的名字必须真实存在于 sprite。
 *
 * 反例：`iconyanjing` / `iconzihao` 是我猜的，sprite 里没有，
 * 渲染出来是一个空白方块，只有控制台一句 warning —— 没人看控制台。
 */
function checkIconNames() {
  const namesFile = join(SRC, 'components', 'icon', 'names.ts')
  if (!existsSync(namesFile)) return []

  const known = new Set(
    [...readFileSync(namesFile, 'utf8').matchAll(/'([a-z0-9]+)'/gi)].map((m) => m[1]),
  )

  const problems = []
  for (const file of walk(SRC)) {
    if (!file.endsWith('.vue') && !file.endsWith('.ts')) continue
    if (file === namesFile) continue

    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/["'](icon[a-z0-9]+)["']/g)) {
      if (!known.has(m[1])) {
        problems.push(`${relative(root, file).replace(/\\/g, '/')} 用了不存在的图标 ${m[1]}`)
      }
    }
  }
  return problems
}

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
  const { masked } = maskCssComments(css)
  let count = 0
  for (const re of [COLOR_RE, FS_RE, RADIUS_RE, IMPORTANT_RE]) {
    const hits = masked.match(re)
    if (hits) count += hits.length
  }
  // 负 margin 归结构型判据（见 structuralProblems）：它的数量在计数基线里保持 0，
  // 由具名例外放行，避免"负 margin 也算可配额"这种荒唐语义。

  return count
}

function collect() {
  const result = {}
  for (const abs of walk(SRC)) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (ALLOW_FILES.has(rel)) continue

    const content = readFileSync(abs, 'utf8')
    const isVue = abs.endsWith('.vue')
    const css = isVue ? extractStyle(content) : content
    // .vue 即使没有 <style> 块也要查模板：内联样式可能单独存在（D-22）
    if (!isVue && !css.trim()) continue

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
      const { masked, restore } = maskCssComments(rawCss)
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

  // 图标名必须真实存在，否则渲染成空白方块
  const badIcons = checkIconNames()
  if (badIcons.length) {
    console.error('\n[style] 图标名不存在（会渲染成空白）：\n')
    for (const p of badIcons) console.error(`  ${p}`)
    console.error('\n  去 src/components/icon/names.ts 里找真实名字，别猜。\n')
    process.exit(1)
  }

  // 样式分层：禁止 :deep() 穿透，禁止同一文件重复选择器
  const layering = checkLayering()
  if (layering.length) {
    console.error('\n[style] 样式分层问题：\n')
    for (const p of layering) console.error(`  ${p}`)
    console.error('\n  :deep() → 改用 CSS 变量出口；重复选择器 → 合并成一条。\n')
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

  // 结构型判据：负 margin / 动效裸值 / 裸类名撞名（具名例外放行）
  const structural = checkStructural()
  if (structural.fresh.length || structural.unnamed.length || structural.expired.length) {
    if (structural.fresh.length) {
      console.error('\n[style] 结构型样式违规（写了就是错，不是"少写几个"）：\n')
      for (const hit of structural.fresh) {
        console.error(`  ${hit.file}:${hit.line}  [${hit.rule}]`)
        console.error(`    ${hit.text.slice(0, 120)}`)
      }
      console.error(
        '\n  负 margin = 布局补丁，改用 padding / gap；transition 写时长 = 绕过 token，',
      )
      console.error(
        '  改 var(--dur-fast|--dur-base|--dur-slow)；裸类名撞名 = 加 g- / u- / 页面前缀。\n',
      )
    }
    if (structural.unnamed.length) {
      console.error('[style] 结构型违规被放行但没进 NAMED（不许出现没人认领的放行）：')
      for (const [key] of structural.unnamed) {
        console.error(`  ${key} —— 在 NAMED 里补「为什么现在不改 + 谁负责」`)
      }
      console.error('')
    }
    if (structural.expired.length) {
      console.error('[style] NAMED 里的例外已经不存在了（过期豁免要删）：')
      for (const n of structural.expired) console.error(`  ${n.rule} ${n.where}`)
      console.error('')
    }
    process.exit(1)
  }

  const tightened = Object.entries(baseline).filter(
    ([file, allowed]) => (current[file] ?? 0) < allowed,
  )
  const named = NAMED.reduce((sum, n) => sum + n.count, 0)
  console.log(
    '[style] 通过：无新增硬编码、无新增负 margin、动效无裸时长、无新增裸类名撞名、无静默失败',
  )
  if (named)
    console.log(
      `[style] 放行结构型存量 ${named} 处，全部在 NAMED 里具名（为什么现在不改 / 谁负责）`,
    )
  if (tightened.length)
    console.log(
      `[style] ${tightened.length} 个文件的违规数已下降，可执行 npm run style:baseline 收紧`,
    )
}
