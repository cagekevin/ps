import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

/**
 * TD-09-35：`runQueued` 的任务体里**不许再排一次队** —— 跨文件不变量扫描。
 *
 * 病：一条全局链不可重入（`write-queue.ts`）。任务体里再调一次排队入口，
 * 内层任务被排在自己后面 ⇒ 死锁。`a957199`（TD-09-30）修掉了当时的**具体嵌套点**，
 * 但「以后不许嵌套」只剩 `write-queue.ts:6` 的一句注释，`*InLock` 变体全仓 41 处全靠人记。
 * 下一处嵌套照样静默自锁，而且 jsdom 走 `memoryRepo`（自己的 `enqueue`，不并全局链）测不出来，
 * 只有真机才炸。
 *
 * 为什么是静态判据而不是运行期判据（`runQueued` 里数"当前是否在任务体内"）：
 * 任务体是 async 的，判"在不在任务体内"需要异步上下文传播（`AsyncLocalStorage`），
 * 而 `src/` 跑在 CEP 的 Chromium 里、`tsconfig.json` 没有 `@types/node`（AGENTS.md §5 已写明
 * `src/` 看不见 `process` / `node:*`）。退而用 `let inTask = true/finally` 的全局标志，
 * 会把**并发但合法的外部调用**一起判成嵌套 —— 那是会误伤的守卫，比没有更坏。
 *
 * 判据合法性：§7.2「禁自证式断言」的边界明写 —— 跨文件不变量扫描**不属自证式**
 * （断的不是被测实现自己的文本，且注入违规会红）。合法性按「负例探针证它会红」判，
 * 见本次 commit 的探针结论块。
 *
 * 规则不是"字面嵌套"（`runQueued(() => runQueued(...))`，全仓没人这么写，抓不到真病），
 * 而是**任务体内不许触达任何排队入口**，分三条：
 * - **R1 排队入口**：`Repo` 里带 `*InLock` 兄弟的方法（`read` / `write` / `update`）——
 *   名单**从 `types.ts` 推导**，不手写（A4：手写名单本身就是母体；加一对 `list`/`listInLock`
 *   自动进判据）。
 * - **R2 传递**：任务体调用的本地函数 / 同目录跨文件函数，若其（可递归）体内触达 R1，同样算违规。
 *   这一条是必须的：TD-09-30 的真病是深度 2-4 的 —— `deleteWarehouse` 的任务体 →
 *   `usableIndex()` → `readIndexState()` → `styleIndexWriter.read()`。
 * - **R0 作用域闭环**：`runQueued(` 的调用点只许出现在 `src/cep/data/**`，
 *   否则本扫描的目录边界不成立（别处再开一条链同样是 `write-queue.ts` 禁的）。
 */

const REPO_ROOT = resolve(__dirname, '../..')

// `scripts/source-scan.mjs` 是四个守卫共用的源码扫描器（这里只用它的递归收集，不重写一份）
const { walkSources } = createRequire(import.meta.url)('../../scripts/source-scan.mjs') as {
  walkSources: (dir: string, exts?: string[]) => string[]
}

interface Violation {
  file: string
  line: number
  /** 违规链：任务体 → … → 排队入口 */
  chain: string
}

interface FileIndex {
  sf: ts.SourceFile
  /** 本文件里可被无前缀调用的函数（`function f` / `const f = () => …`） */
  fns: Map<string, ts.Node>
  /** `import { a as b }` → b ⇒ (源文件, a) */
  bindings: Map<string, { file: string; name: string }>
  /** `import * as ns` → ns ⇒ 源文件 */
  namespaces: Map<string, string>
}

function isFnLike(node: ts.Node): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node)
}

function indexFile(file: string, text: string): FileIndex {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true)
  const fns = new Map<string, ts.Node>()
  const bindings = new Map<string, { file: string; name: string }>()
  const namespaces = new Map<string, string>()

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      if (!fns.has(node.name.text)) fns.set(node.name.text, node)
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (isFnLike(node.initializer) && !fns.has(node.name.text)) {
        fns.set(node.name.text, node.initializer)
      }
    } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text
      const target = spec.startsWith('.') ? resolve(dirname(file), `${spec}.ts`) : null
      const clause = node.importClause
      if (target && clause) {
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          namespaces.set(clause.namedBindings.name.text, target)
        }
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const el of clause.namedBindings.elements) {
            bindings.set(el.name.text, { file: target, name: (el.propertyName ?? el.name).text })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { sf, fns, bindings, namespaces }
}

/**
 * 排队入口名单：`types.ts` 的 `Repo` 里，凡有 `<名>InLock` 兄弟的成员就是"排队版"。
 * 契约本身就这么写的（`read()` 排队 / `readInLock()` 不排队），所以名单是**推导**出来的。
 */
function queuedRepoMethods(root: string): string[] {
  const file = join(root, 'src/cep/data/types.ts')
  const sf = ts.createSourceFile(file, ts.sys.readFile(file) ?? '', ts.ScriptTarget.ESNext, true)
  let members: string[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'Repo') {
      members = node.members
        .map((m) => (m.name && ts.isIdentifier(m.name) ? m.name.text : ''))
        .filter(Boolean)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return members.filter((name) => name.endsWith('InLock')).map((name) => name.slice(0, -6))
}

/** 扫一个仓库根：返回 `src/cep/data/**` 里所有"任务体内触达排队入口"的调用点 */
function scanNesting(root: string): Violation[] {
  const dataDir = join(root, 'src/cep/data')
  const queued = new Set(queuedRepoMethods(root))
  const indexes = new Map<string, FileIndex>()
  for (const file of walkSources(dataDir, ['.ts'])) {
    indexes.set(file, indexFile(file, ts.sys.readFile(file) ?? ''))
  }

  const chains = new Map<string, string[] | null>() // `${file}#${name}` → 违规链
  const visiting = new Set<string>()

  const resolveIdent = (file: string, name: string): { file: string; name: string } | null => {
    const index = indexes.get(file)
    if (!index) return null
    if (index.fns.has(name)) return { file, name }
    return index.bindings.get(name) ?? null
  }

  /** 在 `node` 里找第一个触达排队入口的调用，返回链（`[]` 表示没触达，null 见下） */
  const sinkIn = (file: string, node: ts.Node): string[] | null => {
    let found: string[] | null = null
    const visit = (n: ts.Node): void => {
      if (found) return
      if (ts.isCallExpression(n)) {
        const callee = n.expression
        const text = callee.getText(indexes.get(file)?.sf)
        if (ts.isIdentifier(callee)) {
          // 字面嵌套：任务体里又出现一次 runQueued(
          if (callee.text === 'runQueued') {
            found = [`${text}(`]
            return
          }
          const target = resolveIdent(file, callee.text)
          // 仓库**构造器**（名字以 `Repo` 结尾：`fileRepo` / `dataRepo` / `memoryRepo` / `swatchRepo`）
          // 不是 sink：构造**不排队**，排队发生在它的方法上，而方法名已由 `queued` 集合 +
          // 下面的属性访问分支覆盖（`repo.read()` / `repo.overwrite()` 会被抓）。
          // 递归进构造器只会在它**返回对象的方法体**里找到 `runQueued(` ⇒ 假违规
          // （真实链：`writeSwatchItems() → swatchRepo() → fileRepo() → runQueued(`，
          // 实际调的是 `overwriteInLock` —— 不排队、不会自锁）。
          if (target && !/Repo$/.test(target.name)) {
            const sub = sinkOfFn(target.file, target.name)
            if (sub) {
              found = [`${callee.text}()`, ...sub]
              return
            }
          }
        } else if (ts.isPropertyAccessExpression(callee)) {
          if (queued.has(callee.name.text)) {
            found = [`${text}()`]
            return
          }
          if (ts.isIdentifier(callee.expression)) {
            const ns = indexes.get(file)?.namespaces.get(callee.expression.text)
            if (ns && indexes.has(ns)) {
              const sub = sinkOfFn(ns, callee.name.text)
              if (sub) {
                found = [`${callee.expression.text}.${callee.name.text}()`, ...sub]
                return
              }
            }
          }
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(node)
    return found
  }

  /** 某个函数（可跨文件）体内是否触达排队入口；带记忆化与环检测 */
  const sinkOfFn = (file: string, name: string): string[] | null => {
    const key = `${file}#${name}`
    const cached = chains.get(key)
    if (cached !== undefined) return cached
    if (visiting.has(key)) return null // 递归调用不构成嵌套
    const index = indexes.get(file)
    const node = index?.fns.get(name)
    if (!node) return null
    visiting.add(key)
    const result = sinkIn(file, node)
    visiting.delete(key)
    chains.set(key, result)
    return result
  }

  const out: Violation[] = []
  for (const [file, index] of indexes) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'runQueued' &&
        node.arguments.length > 0
      ) {
        const task = node.arguments[0]
        // 任务体可能内联（箭头），也可能是具名函数 —— 两种都要能追
        let chain = sinkIn(file, task)
        if (!chain && ts.isIdentifier(task)) {
          const target = resolveIdent(file, task.text)
          if (target) {
            const sub = sinkOfFn(target.file, target.name)
            if (sub) chain = [`${task.text}()`, ...sub]
          }
        }
        if (chain) {
          out.push({
            file: relative(root, file),
            line: index.sf.getLineAndCharacterOfPosition(node.getStart(index.sf)).line + 1,
            chain: chain.join(' → '),
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(index.sf)
  }
  return out
}

/** R0：`runQueued(` 的调用点只许出现在 `src/cep/data/**`（目录边界闭环） */
function scanForeignRunQueued(root: string): string[] {
  const out: string[] = []
  for (const file of walkSources(join(root, 'src'), ['.ts', '.vue'])) {
    if (file.startsWith(join(root, 'src/cep/data'))) continue
    const sf = ts.createSourceFile(file, ts.sys.readFile(file) ?? '', ts.ScriptTarget.ESNext, true)
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'runQueued'
      ) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        out.push(`${relative(root, file)}:${line}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return out
}

/** 临时仓库根：只铺本判据需要的那几个文件 */
function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'write-queue-nesting-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  return root
}

const REPO_TYPES = `export interface Repo<T> {
  read(): Promise<T>
  write(value: T): Promise<void>
  writeInLock(value: T): Promise<void>
  readInLock(): Promise<T>
  update(mutator: (value: T) => T | void): Promise<T>
  updateInLock(mutator: (value: T) => T | void): Promise<T>
}
`

describe('任务体内不许再排 runQueued（TD-09-35）', () => {
  it('排队入口名单从 types.ts 推导，不是手写：read / update / write / overwrite', () => {
    // 这条是"判据本身失效"的报警器：`Repo` 若被改名/重构，下面三条规则会静默变成
    // "什么都不是排队入口"，全绿但什么都没查。红的时候先看这里，不是去改白名单。
    expect(queuedRepoMethods(REPO_ROOT).sort()).toEqual(['overwrite', 'read', 'update', 'write'])
  })

  it('真实仓 src/cep/data/** 零违规', () => {
    expect(scanNesting(REPO_ROOT)).toEqual([])
  })

  it('真实仓 runQueued 的调用点只在 src/cep/data/** 内（R0 闭环）', () => {
    expect(scanForeignRunQueued(REPO_ROOT)).toEqual([])
  })

  it('R1 反例：任务体里直接调排队入口 → 红', () => {
    const root = makeRoot({
      'src/cep/data/types.ts': REPO_TYPES,
      'src/cep/data/write-queue.ts':
        'export const runQueued = <T,>(task: () => Promise<T>) => task()\n',
      'src/cep/data/bad.ts': `import { runQueued } from './write-queue'
import type { Repo } from './types'
declare const repo: Repo<number[]>
export const bad = () => runQueued(async () => {
  const current = await repo.read()
  return current
})
`,
    })
    const found = scanNesting(root)
    expect(found).toHaveLength(1)
    expect(found[0].file).toBe('src/cep/data/bad.ts')
    expect(found[0].chain).toContain('repo.read()')
  })

  it('R1 反例：锁内变体（readInLock / updateInLock / writeInLock）不误伤', () => {
    const root = makeRoot({
      'src/cep/data/types.ts': REPO_TYPES,
      'src/cep/data/write-queue.ts':
        'export const runQueued = <T,>(task: () => Promise<T>) => task()\n',
      'src/cep/data/ok.ts': `import { runQueued } from './write-queue'
import type { Repo } from './types'
declare const repo: Repo<number[]>
export const ok = () => runQueued(async () => {
  const current = await repo.readInLock()
  await repo.updateInLock(() => current)
  await repo.writeInLock(current)
})
`,
    })
    expect(scanNesting(root)).toEqual([])
  })

  it('R2 反例：深度 3、跨文件的间接嵌套（TD-09-30 的真形状）→ 红', () => {
    // 真病长这样：deleteWarehouse 的任务体 → usableIndex() → readIndexState() → repo.read()
    // 三层都在不同函数里，字面 `runQueued(` 只出现一次 —— 只查字面嵌套抓不到。
    const root = makeRoot({
      'src/cep/data/types.ts': REPO_TYPES,
      'src/cep/data/write-queue.ts':
        'export const runQueued = <T,>(task: () => Promise<T>) => task()\n',
      'src/cep/data/index-repo.ts': `import type { Repo } from './types'
declare const repo: Repo<{ list: number[] }>
export const readIndexState = () => repo.read()
`,
      'src/cep/data/bad.ts': `import { runQueued } from './write-queue'
import { readIndexState } from './index-repo'
const usableIndex = async () => (await readIndexState()).list
export const bad = () => runQueued(async () => {
  const list = await usableIndex()
  return list.length
})
`,
    })
    const found = scanNesting(root)
    expect(found).toHaveLength(1)
    expect(found[0].chain).toBe('usableIndex() → readIndexState() → repo.read()')
  })

  it('R1 反例：字面嵌套 runQueued(() => runQueued(...)) → 红', () => {
    const root = makeRoot({
      'src/cep/data/types.ts': REPO_TYPES,
      'src/cep/data/write-queue.ts':
        'export const runQueued = <T,>(task: () => Promise<T>) => task()\n',
      'src/cep/data/bad.ts': `import { runQueued } from './write-queue'
export const bad = () => runQueued(() => runQueued(async () => 1))
`,
    })
    const found = scanNesting(root)
    expect(found).toHaveLength(1)
    expect(found[0].chain).toContain('runQueued(')
  })

  it('R0 反例：src/cep/data 之外调 runQueued → 红', () => {
    const root = makeRoot({
      'src/cep/data/types.ts': REPO_TYPES,
      'src/cep/data/write-queue.ts':
        'export const runQueued = <T,>(task: () => Promise<T>) => task()\n',
      'src/commands/bad.ts': `import { runQueued } from '@/cep/data/write-queue'
export const bad = () => runQueued(async () => 1)
`,
    })
    expect(scanForeignRunQueued(root)).toEqual(['src/commands/bad.ts:2'])
  })
})
