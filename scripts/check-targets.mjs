/**
 * check-targets.mjs —— 扫描口径的唯一事实来源（**本仓版**，2026-10-24 自 maomao 仓搬入后按本仓重写）。
 *
 * 【为什么存在】`mv-sync-refs.mjs` 要知道三件事：**哪些文件算源码** · **一个说明符指向哪个文件** ·
 * **哪些目录永远不扫**。这三件事一旦在两个文件里各写一份就会漂（改扩展名忘了改另一处 ⇒ 引用图漏一批）。
 *
 * 【与 maomao 版的差别 —— 只有两处，其余机制照搬】
 *   ① **扩展名集合多了 `.vue`**：本仓 89 个 `.vue` 里有 430 处 import，
 *      外仓那版只认 `.js/.jsx/.ts/.tsx` ⇒ **`.vue` 里的 import 一个都看不见**
 *      ⇒ 引用图系统性少报 fan-in（而 fan-in 正是"这文件能不能删"的判据）。
 *   ② **目录豁免表清空**：外仓那套 `TS_EXEMPT_DIRS/FILES` 是为它自己的仓库结构写的，本仓用不上。
 *
 * 【口径来源】本仓 `tsconfig.json` 的 `"paths": { "@/*": ["src/*"] }` + 扫描根 `src/` + `tests/`。
 */
import { statSync, existsSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'

/** 参与**引用图**的文件扩展名（作为「引用方」被扫描） */
export const SCAN_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue']

/** 算「源码」的扩展名（决定 import 说明符能带什么后缀）—— `.vue` 在列：`.vue` 后缀是路径的一部分，剥掉就解析不到 */
export const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.vue']

/** 永久豁免目录 / 文件（本仓：空 —— 不豁免任何业务目录） */
export const TS_EXEMPT_DIRS = []
export const TS_EXEMPT_FILES = []

/** 永远不扫的目录名（依赖与产物） */
const NEVER_SCAN = new Set(['node_modules', 'dist', '.git', 'coverage', '.probe'])

/** 某文件是否豁免（不参与契约校验）。 */
export function isExempt(abs) {
  const parts = abs.split('/')
  if (parts.some((p) => NEVER_SCAN.has(p))) return true
  const base = parts[parts.length - 1]
  if (TS_EXEMPT_FILES.includes(base)) return true
  return parts.some((p) => TS_EXEMPT_DIRS.includes(p))
}

/** 路径分隔符统一成 `/`（import 说明符必须是 posix 形态）。 */
export function toPosix(p) {
  return p.replace(/\\/g, '/')
}

/**
 * 把一个说明符解析成本仓里**真实存在**的源文件。
 * 顺序：① 原路径就是文件 → 直接用；② 换 SOURCE_EXTS 里的后缀试；③ 当目录试 `index.<ext>`。
 * 例：`@/components/GButton` → `src/components/GButton.vue`。
 */
export function resolveSourceFile(abs) {
  if (!abs) return null
  try {
    if (statSync(abs).isFile()) return abs
  } catch {
    /* 不存在 → 继续按扩展名试探 */
  }
  const ext = extname(abs)
  const stem = SOURCE_EXTS.includes(ext) ? abs.slice(0, abs.length - ext.length) : abs
  for (const e of SOURCE_EXTS) {
    const cand = stem + e
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  for (const e of SOURCE_EXTS) {
    const cand = join(abs, 'index' + e)
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return null
}

/** 内容里有没有 JSX（本仓无 `.tsx`，宽松口径即可）。 */
export function hasJsx(code) {
  return hasJsxHintRaw(code)
}

/** 粗判：有没有 `<Tag` 这样的尖括号形态。 */
export function hasJsxHintRaw(code) {
  return /<\/?[A-Za-z][\w.-]*/.test(String(code)) || /<>/.test(String(code))
}

/** 探测目标后缀：有 JSX → `.tsx`；纯逻辑 → `.ts`。 */
export function detectExt(code) {
  return hasJsx(code) ? '.tsx' : '.ts'
}

/** 读文件（读不到返回空串，调用方自己判）。 */
export function readIfExists(p) {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}
