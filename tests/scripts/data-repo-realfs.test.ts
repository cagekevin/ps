import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

/**
 * TD-09-38：`src/cep/data` 里**每一个写盘的数据模块**，都必须被至少一条「真机装法」的用例覆盖 ——
 * 差集就是缺口，**漏一个就红**。
 *
 * 病（今晚最狠的一条）：`src/cep/data` 的写路径测试长期是**假绿**。jsdom 下 `hasCep()` 为 `false`
 * → `dataRepo()` 选 `memoryRepo`（它有自己的 `enqueue`，不是全局写链）⇒ 连被测实现都不是 `fileRepo`。
 * 于是 `runQueued` 自锁（TD-09-30）、原子写被删（TD-09-27）全都不红。`style-library-real-fs.test.ts`
 * 与 `fs-atomic.test.ts` 各自修好了一处，但那是**个案，不是判据**：下一个 repo 照样可以只写内存版用例。
 *
 * 为什么是静态判据而不是运行期判据：判"这条用例有没有真的走 fileRepo"需要跨进程覆盖统计，
 * 而 vitest 侧没有对 `src` 的覆盖率门禁；而且本仓的真机边界（A13）本来就只允许 Node 里跑。
 * 静态扫描能给出**可复算、可解释**的名单，且注入违规会红 —— 合法性按 §7.2 的边界条
 * （跨文件不变量扫描型测试不属自证式，按"注入违规会红"判）成立，见本轮探针结论块。
 *
 * ## 判据（全部从磁盘推导，**没有一行手写名单** —— A4）
 *
 * **A. 哪些模块"写盘"**（`src/cep/data/**` 内，自身体内出现下列任一调用）：
 *   1. `dataRepo(`  —— 造一个由 `fileRepo` 落盘的 Repo；
 *   2. `fileRepo(`  —— 直接造文件实现（`data-repo.ts`）；
 *   3. `@/cep/fs` 的**写原语** —— 名单从 `src/cep/fs.ts` 的 AST **推导**：函数体（含文件内调用链）
 *      触达 node fs 的写类 API（`writeFileSync` / `renameSync` / `unlinkSync` / `mkdirSync` …）即算。
 *
 * 只看**自己动手**的写：经另一个仓库间接写盘的模块不算（它的写必然经过那个仓库，
 * 由那条仓库的真机用例覆盖 —— 所以这不是缝，是边界）。**只读**（`readTextOutcome`）、
 * **纯逻辑**（`write-queue.ts`）因此都不在名单里，不会被要求真机用例。
 *
 * ⚠️ **历史结构说明**：内存实现原先单独成文件 `src/cep/data/memory-repo.ts`，现已内联进
 * `data-repo.ts` 且**不再导出**（唯一入口）。下面夹具里出现的 `memory-repo.ts` 是**虚拟根**
 * （`makeRoot()` 造的临时目录），用来测扫描器的边界判据，**不代表真仓还有这个文件**。
 *
 * **B. 哪些用例是"真机装法"**（`tests/**\/*.test.ts` 的 AST）：
 *   必须**同时**装两样，少一样都不算 ——
 *   · `X.__adobe_cep__ = { evalScript: … }` ⇒ `hasCep()` 为真 ⇒ `dataRepo()` 选 `fileRepo`（不然被测对象就被换掉了）；
 *   · `X.require = …`（`window.require`）⇒ `hasNode()` 为真 ⇒ 写真的落盘（否则写路径只走 NO_NODE 抛错）。
 *
 * **C. 覆盖**：真机用例**直接** import 的 `src/cep/data/**` 模块 + 它们在 `src/cep/data/**` 内的
 *   传递 import 闭包（`style-library-repo` → `data-repo` / `file-repo` / `write-queue` 是结构上的委托，
 *   不是"碰巧被页面图加载"）。**页面 / store / 命令图**加载进来的 data 模块**不算覆盖** ——
 *   那种"只要有人 import 过就算测过"的算法会让判据恒绿，正是要防的假绿。
 *
 * **D. 缺口 = A − C**，与 `tests/scripts/data-repo-realfs-baseline.json` **双向**比对：
 *   · 缺口里有基线没有的 ⇒ **红**（新增写盘模块忘了写真机用例）；
 *   · 基线里有缺口里没有的 ⇒ **红**（已经补上了用例却没收紧基线 —— 基线不许变成永久豁免）。
 *
 * 基线是**扫描器自己写出来的**（`TD0938_UPDATE=1 npx vitest run tests/scripts/data-repo-realfs.test.ts`），
 * 不是手写名单：它记的是"当前还没覆盖的旧账"（债号 TD-09-38），只会往下走。
 */

const REPO_ROOT = resolve(__dirname, '../..')
const BASELINE = join(REPO_ROOT, 'tests/scripts/data-repo-realfs-baseline.json')

// `scripts/source-scan.mjs` 是几个守卫共用的源码收集器（这里只用它的递归收集，不重写一份）
const { walkSources } = createRequire(import.meta.url)('../../scripts/source-scan.mjs') as {
  walkSources: (dir: string, exts?: string[]) => string[]
}

/** node fs 的写类 API：这是"写盘"的定义，不是本仓的名单 */
const NODE_WRITE_APIS = new Set([
  'appendFileSync',
  'copyFile',
  'copyFileSync',
  'mkdirSync',
  'rename',
  'renameSync',
  'rmSync',
  'rmdirSync',
  'unlink',
  'unlinkSync',
  'writeFile',
  'writeFileSync',
])

export interface Scan {
  /** 写盘的数据模块（相对仓库根） */
  writing: string[]
  /** 被真机用例覆盖的数据模块（相对仓库根） */
  covered: string[]
  /** writing − covered */
  gap: string[]
  /** 判为"真机装法"的用例文件（相对仓库根） */
  realTests: string[]
  /** 从 `src/cep/fs.ts` 推导出的写原语 */
  writePrimitives: string[]
}

function readText(file: string): string {
  const text = readFileSync(file, 'utf8')
  if (!file.endsWith('.vue')) return text
  const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  return m ? m[1] : ''
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readText(file), ts.ScriptTarget.ESNext, true)
}

/** 文件里出现的模块说明符（`import` / `export … from` / 动态 `import()`） */
function specsOf(sf: ts.SourceFile): string[] {
  const out: string[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push(node.moduleSpecifier.text)
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      out.push(node.moduleSpecifier.text)
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword
      const arg = node.arguments[0]
      if (isDynamicImport && ts.isStringLiteral(arg)) out.push(arg.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function resolveSpec(root: string, fromFile: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(root, 'src', spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else return null
  for (const cand of [base, `${base}.ts`, `${base}.vue`, join(base, 'index.ts')]) {
    try {
      if (ts.sys.fileExists(cand)) return cand
    } catch {
      // 路径不存在就是没解析到，继续试下一个候选
    }
  }
  return null
}

/** 本文件里可被无前缀调用的函数名 ⇒ 函数体（`function f` / `const f = () => …`） */
function localFns(sf: ts.SourceFile): Map<string, ts.Node> {
  const out = new Map<string, ts.Node>()
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      if (!out.has(node.name.text)) out.set(node.name.text, node.body)
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer
      if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && !out.has(node.name.text)) {
        out.set(node.name.text, init)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function calledIdentifiers(body: ts.Node): Set<string> {
  const out = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) out.add(node.expression.text)
    ts.forEachChild(node, visit)
  }
  visit(body)
  return out
}

/**
 * `src/cep/fs.ts` 的写原语：函数体**直接或经文件内调用链**触达 node fs 的写类 API。
 * 不手写名字 —— `writeTextFileAtomic` 自己是靠 `atomicReplace → atomicReplaceBytes → writeBytesFile`
 * 才写盘的，手写名单会把这条链漏掉。
 */
function deriveWritePrimitives(root: string): string[] {
  const file = join(root, 'src/cep/fs.ts')
  if (!ts.sys.fileExists(file)) return []
  const sf = parse(file)
  const fns = localFns(sf)
  const calls = new Map<string, Set<string>>()
  const writing = new Set<string>()

  for (const [name, body] of fns) {
    calls.set(name, calledIdentifiers(body))
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        NODE_WRITE_APIS.has(node.expression.name.text)
      ) {
        writing.add(name)
      }
      ts.forEachChild(node, visit)
    }
    visit(body)
  }

  // 文件内传递：`writeTextFileAtomic` 这类包装器本身不直接写盘
  let changed = true
  while (changed) {
    changed = false
    for (const [name, callees] of calls) {
      if (writing.has(name)) continue
      for (const callee of callees) {
        if (writing.has(callee)) {
          writing.add(name)
          changed = true
          break
        }
      }
    }
  }
  return [...writing].sort()
}

/** A：`src/cep/data/**` 里自己动手写盘的模块 */
function writingModules(root: string): string[] {
  const prims = new Set(deriveWritePrimitives(root))
  const out: string[] = []
  for (const file of walkSources(join(root, 'src/cep/data'), ['.ts'])) {
    if (file.endsWith('.d.ts')) continue
    const calls = calledIdentifiers(parse(file))
    // `writeDisk` / `writeDiskSync` 是**唯一落盘入口**（`src/cep/disk-write.ts`）：
    // 调它们 = 这个模块自己动手写盘（`data/` 里的模块已不再直调 `@/cep/fs` 写原语）
    const writes =
      calls.has('dataRepo') ||
      calls.has('fileRepo') ||
      calls.has('writeDisk') ||
      calls.has('writeDiskSync') ||
      [...calls].some((name) => prims.has(name))
    if (writes) out.push(relative(root, file).replace(/\\/g, '/'))
  }
  return out.sort()
}

/** B：装了 `__adobe_cep__`（`evalScript`）+ `window.require` 两样的用例 */
function realInstallTests(root: string): string[] {
  const out: string[] = []
  for (const file of walkSources(join(root, 'tests'), ['.ts'])) {
    if (!file.endsWith('.test.ts')) continue
    const sf = parse(file)
    let bridge = false
    let node = false
    const visit = (node_: ts.Node): void => {
      if (
        ts.isBinaryExpression(node_) &&
        node_.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node_.left)
      ) {
        const field = node_.left.name.text
        const rhs = node_.right
        if (field === '__adobe_cep__' && ts.isObjectLiteralExpression(rhs)) {
          // 必须带 `evalScript`，否则 `hasCep()` 仍为假 —— 装了也不选 fileRepo
          bridge = rhs.properties.some(
            (p) =>
              p.name !== undefined &&
              ts.isIdentifier(p.name) &&
              p.name.text === 'evalScript' &&
              ts.isPropertyAssignment(p) &&
              (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer)),
          )
        }
        if (field === 'require') node = true
      }
      ts.forEachChild(node_, visit)
    }
    visit(sf)
    // 内部一律绝对路径：`relative()` 交回去会被 `resolveSpec` 按 cwd 解析，
    // 在真实仓库里"碰巧对"（root == cwd），在临时根里直接读不到文件 —— 假绿的一种
    if (bridge && node) out.push(file)
  }
  return out.sort()
}

/** C：一条真机用例覆盖了哪些 data 模块（直接 import + data 目录内的传递闭包） */
function coveredBy(root: string, testFile: string): string[] {
  const dataDir = join(root, 'src/cep/data')
  const seen = new Set<string>()
  const out = new Set<string>()

  const walkData = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    out.add(relative(root, file).replace(/\\/g, '/'))
    for (const spec of specsOf(parse(file))) {
      const target = resolveSpec(root, file, spec)
      if (target && target.startsWith(dataDir)) walkData(target)
    }
  }

  for (const spec of specsOf(parse(testFile))) {
    const target = resolveSpec(root, testFile, spec)
    if (target && target.startsWith(dataDir)) walkData(target)
  }
  return [...out].sort()
}

export function scan(root: string): Scan {
  const writing = writingModules(root)
  const realTests = realInstallTests(root)
  const coveredSet = new Set<string>()
  for (const test of realTests) {
    for (const mod of coveredBy(root, test)) coveredSet.add(mod)
  }
  const covered = [...coveredSet].sort()
  const gap = writing.filter((mod) => !coveredSet.has(mod))
  return {
    writing,
    covered,
    gap,
    realTests: realTests.map((f) => relative(root, f).replace(/\\/g, '/')),
    writePrimitives: deriveWritePrimitives(root),
  }
}

/** 缺口与基线的双向差：`fresh` = 新漏的（红），`stale` = 已修好却没收紧的（也红） */
export function diffAgainstBaseline(
  gap: string[],
  baseline: string[],
): { fresh: string[]; stale: string[] } {
  const gapSet = new Set(gap)
  const baseSet = new Set(baseline)
  return {
    fresh: gap.filter((m) => !baseSet.has(m)),
    stale: baseline.filter((m) => !gapSet.has(m)),
  }
}

function readBaseline(): string[] {
  const parsed: unknown = JSON.parse(readFileSync(BASELINE, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${BASELINE} 形状不对：应为字符串数组`)
  return parsed.filter((x): x is string => typeof x === 'string')
}

/** 基线只能由扫描器写（`TD0938_UPDATE=1`），不许手改 —— 手改就会退化成白名单（A4） */
if (process.env.TD0938_UPDATE === '1') {
  const { gap } = scan(REPO_ROOT)
  writeFileSync(BASELINE, `${JSON.stringify(gap, null, 2)}\n`, 'utf8')
}

/** 临时仓库根：只铺本判据需要的那几个文件（反例用，与 `write-queue-nesting.test.ts` 同款） */
function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'data-repo-realfs-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  return root
}

/** 最小可用的 `src/cep/fs.ts`：一个写原语 + 一个读原语 */
const MINI_FS = `const fs = { writeFileSync: (_p: string, _t: string) => {} }
export function writeTextFileAtomic(p: string, t: string): void {
  fs.writeFileSync(p, t)
}
export function readTextOutcome(p: string): string {
  return p
}
`

const MINI_DATA_REPO = `import { fileRepo } from './file-repo'
import { memoryRepo } from './memory-repo'
export function dataRepo<T>(path: () => string, seed: () => T, decode: (raw: unknown) => { value: T } | null) {
  return () => fileRepo(path, seed, decode) ?? memoryRepo(seed)
}
`

/** 真机装法的最小形状：两样都装 */
const REAL_TEST = (mod: string): string => `import { it } from 'vitest'
const w = window as unknown as { require?: unknown; __adobe_cep__?: unknown }
w.require = () => ({})
w.__adobe_cep__ = { evalScript: () => undefined }
it('x', async () => {
  await import('${mod}')
})
`

describe('写盘的数据模块必须有真机用例（TD-09-38）', () => {
  it('判据自身没瞎：写原语从 fs.ts 推导得出，且含 file-repo 用的那个', () => {
    // 这条是"扫描器失效"的报警器：`fs.ts` 若被重构/改名，下面几条会静默变成
    // "没有任何模块写盘"、全绿但什么都没查。红的时候先看 fs.ts，**不是去改基线**。
    const { writePrimitives, writing, realTests } = scan(REPO_ROOT)
    expect(writePrimitives).toEqual(expect.arrayContaining(['writeTextFileAtomic']))
    expect(writing).toEqual(
      expect.arrayContaining(['src/cep/data/file-repo.ts', 'src/cep/data/data-repo.ts']),
    )
    expect(realTests.length).toBeGreaterThan(0)
  })

  it('界线：纯内存 / 纯逻辑 / 只读模块不被要求真机用例', () => {
    const { writing } = scan(REPO_ROOT)
    // `memory-repo.ts` 就是那条"被测对象被换掉"的内存实现，它不写盘；
    // `write-queue.ts` 是纯内存 promise 链，`types.ts` 只有类型 —— 要求它们真机用例是误伤。
    // `memory-repo.ts` 已收进 `data-repo.ts` 且不再导出（唯一入口）⇒ 原来这条"不在名单"的断言随之作废
    expect(writing).not.toContain('src/cep/data/write-queue.ts')
    expect(writing).not.toContain('src/cep/data/types.ts')
    expect(writing).not.toContain('src/cep/data/classification-repo.ts')
  })

  it('真实仓：缺口与基线一致（新增写盘模块漏用例 = 红）', () => {
    const { gap } = scan(REPO_ROOT)
    const baseline = readBaseline()
    expect(diffAgainstBaseline(gap, baseline)).toEqual({ fresh: [], stale: [] })
  })

  it('反例：新写盘仓库没有真机用例 → 缺口里必须有它（红）', () => {
    const root = makeRoot({
      'src/cep/fs.ts': MINI_FS,
      'src/cep/data/data-repo.ts': MINI_DATA_REPO,
      'src/cep/data/file-repo.ts': 'export const fileRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/memory-repo.ts': 'export const memoryRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/new-repo.ts': `import { dataRepo } from './data-repo'
export const newRepo = dataRepo(() => 'x', () => [], () => null)
`,
      'tests/cep/other.test.ts': REAL_TEST('@/cep/data/data-repo'),
    })
    const { gap, writing } = scan(root)
    expect(writing).toContain('src/cep/data/new-repo.ts')
    expect(gap).toContain('src/cep/data/new-repo.ts')
  })

  it('反例：纯内存 / 纯逻辑模块不进名单（不误伤）', () => {
    // 只有纯模块的根：一个写盘的都没有 ⇒ 什么也不要求
    const pure = makeRoot({
      'src/cep/fs.ts': MINI_FS,
      'src/cep/data/memory-repo.ts': 'export const memoryRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/logic.ts': `export const add = (a: number, b: number) => a + b
`,
      'src/cep/data/queue.ts': `export const runQueued = <T>(task: () => Promise<T>) => task()
`,
      'tests/cep/logic.test.ts': `import { it } from 'vitest'
import { add } from '@/cep/data/logic'
it('x', () => { add(1, 2) })
`,
    })
    expect(scan(pure).writing).toEqual([])
    expect(scan(pure).gap).toEqual([])

    // 同一个根再加一个写盘仓库：只有它（和造写者的 `dataRepo`）进名单，
    // `memory-repo` / `logic` / `queue` 一个都不许被要求真机用例
    const mixed = makeRoot({
      'src/cep/fs.ts': MINI_FS,
      'src/cep/data/data-repo.ts': MINI_DATA_REPO,
      'src/cep/data/file-repo.ts': 'export const fileRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/memory-repo.ts': 'export const memoryRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/logic.ts': `export const add = (a: number, b: number) => a + b
`,
      'src/cep/data/queue.ts': `export const runQueued = <T>(task: () => Promise<T>) => task()
`,
      'src/cep/data/writer-repo.ts': `import { dataRepo } from './data-repo'
export const writerRepo = dataRepo(() => 'x', () => [], () => null)
`,
      'tests/cep/logic.test.ts': `import { it } from 'vitest'
import { add } from '@/cep/data/logic'
it('x', () => { add(1, 2) })
`,
    })
    const { writing } = scan(mixed)
    expect(writing).toEqual(['src/cep/data/data-repo.ts', 'src/cep/data/writer-repo.ts'])
  })

  it('反例：只装 __adobe_cep__ 没装 window.require 不算真机装法 → 红', () => {
    const root = makeRoot({
      'src/cep/fs.ts': MINI_FS,
      'src/cep/data/data-repo.ts': MINI_DATA_REPO,
      'src/cep/data/file-repo.ts': 'export const fileRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/memory-repo.ts': 'export const memoryRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/half-repo.ts': `import { dataRepo } from './data-repo'
export const halfRepo = dataRepo(() => 'x', () => [], () => null)
`,
      // 只装了桥：hasCep 为真但写会走 NO_NODE 抛错，测不出"真落盘"
      'tests/cep/half.test.ts': `import { it } from 'vitest'
const w = window as unknown as { __adobe_cep__?: unknown }
w.__adobe_cep__ = { evalScript: () => undefined }
it('x', async () => { await import('@/cep/data/half-repo') })
`,
    })
    const { realTests, gap } = scan(root)
    expect(realTests).toEqual([])
    expect(gap).toContain('src/cep/data/half-repo.ts')
  })

  it('反例：真机用例直接 import（含传递闭包）即算覆盖 → 缺口清空', () => {
    const root = makeRoot({
      'src/cep/fs.ts': MINI_FS,
      'src/cep/data/data-repo.ts': MINI_DATA_REPO,
      'src/cep/data/file-repo.ts': 'export const fileRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/memory-repo.ts': 'export const memoryRepo = (..._a: unknown[]) => null\n',
      'src/cep/data/covered-repo.ts': `import { dataRepo } from './data-repo'
import { writeTextFileAtomic } from '@/cep/fs'
export const coveredRepo = () => {
  writeTextFileAtomic('x', 'y')
  return dataRepo(() => 'x', () => [], () => null)
}
`,
      'tests/cep/covered.test.ts': REAL_TEST('@/cep/data/covered-repo'),
    })
    const { gap, covered } = scan(root)
    // `file-repo` 只是被 `dataRepo` import，没被用例直接 import —— 结构上是委托，算覆盖
    expect(covered).toEqual(
      expect.arrayContaining(['src/cep/data/covered-repo.ts', 'src/cep/data/data-repo.ts']),
    )
    expect(gap).toEqual([])
  })

  it('反例：基线两头收紧（新漏的 / 已修好没收紧的都要报）', () => {
    expect(diffAgainstBaseline(['a.ts', 'b.ts'], ['b.ts'])).toEqual({ fresh: ['a.ts'], stale: [] })
    expect(diffAgainstBaseline(['b.ts'], ['a.ts', 'b.ts'])).toEqual({ fresh: [], stale: ['a.ts'] })
    expect(diffAgainstBaseline(['a.ts'], ['a.ts'])).toEqual({ fresh: [], stale: [] })
  })
})
