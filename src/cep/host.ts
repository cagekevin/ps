/**
 * 是什么：**宿主边界（CEP 运行时注入的东西）的唯一入口** —— 读和写都在这里。
 *
 * ── 收的判据（满足才收）───────────────────────────────────────────────────────
 * 「**CEP 注入**、**jsdom 不提供**」两条件同时成立 ⇒ 归本文件管：
 *
 * | 宿主注入 | 读入口 | 使用方（改这里要一起看） |
 * |---|---|---|
 * | `window.require` / `window.cep_node.require`（`--enable-nodejs`） | `getRequire()` | `cep/node.ts` |
 * | `window.__adobe_cep__`（CEP 桥） | `getBridge()` | `cep/paths.ts` · `cep/transport.ts` · `cep/events.ts` · `utils/build-info.ts` |
 * | `window.cep.fs`（文件对话框） | `getCep()?.fs` | `cep/dialog.ts` |
 * | `window.cep.util`（外链） | `getCep()?.util` | `cep/open-url.ts` |
 * | `globalThis.process.env` / `.pid`（`--enable-nodejs`） | `getEnv()` / `getPid()` | `cep/paths.ts` · `cep/disk-write.ts` |
 * | `window.__pszDump`（往宿主挂调试口） | 写：`exposeDebugDump()` | `utils/logger.ts` |
 * | `window.__PSZ_BUILD__`（往宿主挂构建信息） | 写：`exposeBuildInfo()` | `utils/build-info.ts` |
 *
 * **不收的**（判据的另一半，写清楚免得后人以为漏了）：标准 BOM / DOM ——
 *   `window.addEventListener` · `setTimeout/setInterval` · `window.open` · `window.innerWidth`
 *   · `window.location` · `localStorage`。这些由 jsdom 提供，测试不需要伪造，也不属于"CEP 注入"。
 *
 * 唯一入口：读 = `getRequire` / `getBridge` / `getCep` / `getEnv` / `getPid`；
 *   写 = `exposeDebugDump` / `exposeBuildInfo`。**本文件以外不许再碰上表里那 7 个键。**
 *
 * 谁在用：`cep/node.ts` · `cep/paths.ts` · `cep/transport.ts` · `cep/events.ts` · `cep/dialog.ts`
 *   · `cep/open-url.ts` · `cep/disk-write.ts` · `utils/logger.ts` · `utils/build-info.ts`。
 *   测试侧只有一条路：`tests/helpers/host-stub.ts` → 本文件 `setHostDeps()`。
 *
 * 为什么要有注入点（这是本文件存在的理由，不只是"好看"）：
 *   测试要造"宿主缺方法 / 没有 Node / 桥坏掉"这些**真实世界的怪形状**，而 `window` 是
 *   进程全局 ⇒ 只能改写它 ⇒ 模块图不可跨文件复用 ⇒ 每个测试文件都得重建一次环境。
 *   经本文件注入之后，测试**不碰 `window`**，一个文件要不要 DOM 就只由"被测代码自己用不用 DOM"决定。
 *
 * 不注入时读的就是 `window` / `globalThis.process` **本身**（同一引用，不是拷贝也不是包装）⇒
 *   生产路径没有中间层，`getX()` 与直接写 `window.X` 在运行期是同一件事。
 */
import { msg } from '@/domain/messages'
import { CepError } from '@/utils/errors'

/** CEP 的裸 require：只按 id 返回模块（不开 `--enable-nodejs` 时为 `null`） */
export type RequireFn = (id: string) => unknown

/** CEP 桥的真实形状（`src/env.d.ts` 里 `__adobe_cep__` 去掉可选） */
export type HostBridge = NonNullable<Window['__adobe_cep__']>

/** CEP 的 Node 侧 API（`window.cep`：`fs` 对话框、`util` 外链） */
export type HostCep = NonNullable<Window['cep']>

/** `window.cep.fs`（文件对话框） */
export type HostCepFs = NonNullable<HostCep['fs']>

/** `window.cep.util`（外链） */
export type HostCepUtil = NonNullable<HostCep['util']>

/**
 * 测试注入的替身。
 *
 * `undefined` = **没注入** ⇒ 读 `window`（生产路径）；
 * `null` = **明确"宿主没有这个"**（`null` 与"没注入"必须是两种状态，否则造不出"无 Node"的用例）。
 */
export interface HostDeps {
  require?: RequireFn | null
  bridge?: HostBridge | null
  cep?: HostCep | null
  env?: Record<string, string | undefined> | null
}

declare global {
  /**
   * 注入表的存放处。
   *
   * **为什么不是模块级 `let`**：测试里 `vi.resetModules()` 会重建模块实例 ⇒ 模块级变量
   * 被重置、注入丢失，而 `window` 不会丢 ⇒ 注入表必须活在模块实例之外
   * （`tests/cep/log-file.test.ts` 在 `vi.resetModules()` 之后仍要拿到注入）。
   *
   * ⚠️ 这**不是**"又回到改全局"：生产代码从不读这个键（生产路径读 `window`），
   * 只有本文件读它 ⇒ "宿主从哪来"仍然只有一个判据。
   */
  var __pszHostDeps: HostDeps | undefined
}

function store(): HostDeps {
  return globalThis.__pszHostDeps ?? {}
}

/**
 * 装宿主替身（**只给测试**；唯一调用方 `tests/helpers/host-stub.ts`）。
 *
 * **合并语义**：只覆盖传进来的字段 ⇒ 先装 require 再装 bridge 不会把 require 冲掉。
 * 卸单个用 `{ require: undefined }`（删键 = 回到读 window）；造"宿主没有"用 `null`。
 */
export function setHostDeps(deps: HostDeps): void {
  const next = { ...store() }
  // 键**存在**才动这个字段；`undefined` = 删掉注入（回到读 window）。
  // 所以"卸掉"用 `{ require: undefined }`，"明确没有"用 `{ require: null }` —— 两者不能合并。
  if ('require' in deps) {
    if (deps.require === undefined) delete next.require
    else next.require = deps.require
  }
  if ('bridge' in deps) {
    if (deps.bridge === undefined) delete next.bridge
    else next.bridge = deps.bridge
  }
  if ('cep' in deps) {
    if (deps.cep === undefined) delete next.cep
    else next.cep = deps.cep
  }
  if ('env' in deps) {
    if (deps.env === undefined) delete next.env
    else next.env = deps.env
  }
  globalThis.__pszHostDeps = next
}

/** 卸宿主替身（**只给测试**）。卸完所有读取回到读 `window` / `globalThis.process` */
export function resetHostDeps(): void {
  globalThis.__pszHostDeps = {}
}

/** 读 `window` 上的 require（**唯一的 window.require 读取点**） */
function readWindowRequire(): RequireFn | null {
  // `typeof window` 守卫：没有 DOM 的运行环境（`@vitest-environment node`）里 `window` 不存在。
  // 生产（CEP）永远有 window，这一行不改变生产行为。
  if (typeof window === 'undefined') return null
  const w = window
  if (typeof w.require === 'function') return w.require
  if (typeof w.cep_node?.require === 'function') return w.cep_node.require
  return null
}

/** Node 侧的 require；宿主没开 `--enable-nodejs` 时给 `null`（不抛，由调用方决定失败形状） */
export function getRequire(): RequireFn | null {
  const injected = store()
  if (injected.require !== undefined) return injected.require
  return readWindowRequire()
}

/** CEP 桥；不在 CEP 里（浏览器 / 测试）时给 `undefined` */
export function getBridge(): HostBridge | undefined {
  const injected = store()
  if (injected.bridge !== undefined) return injected.bridge ?? undefined
  // 同 `readWindowRequire()`：无 DOM 环境里没有 `window`
  if (typeof window === 'undefined') return undefined
  return window.__adobe_cep__
}

/** CEP 的 Node 侧 API（`fs` / `util`）；不在 CEP 里给 `undefined`，由调用方决定失败形状 */
export function getCep(): HostCep | undefined {
  const injected = store()
  if (injected.cep !== undefined) return injected.cep ?? undefined
  if (typeof window === 'undefined') return undefined
  return window.cep
}

/** `--enable-nodejs` 注入的环境变量；没有 Node 时给空对象（调用方自己决定"缺这个变量算什么"） */
export function getEnv(): Record<string, string | undefined> {
  const injected = store()
  if (injected.env !== undefined) return injected.env ?? {}
  return globalThis.process?.env ?? {}
}

/**
 * 进程 pid（`uniqueTmpPath` 用来让两个进程的临时名互不覆盖）。
 *
 * **没有 Node 就抛 `NO_NODE`**，不兜底成 0：兜成 0 会让跨进程临时名撞车，
 * 而"跨进程不撞名"正是这个 pid 存在的唯一理由。也不能直接取 `globalThis.process.pid` ——
 * 没有 Node 时那是 `TypeError`，会把"没有 Node"报成一个说不清的错误。
 */
export function getPid(): number {
  const pid = globalThis.process?.pid
  if (pid === undefined) throw new CepError('NO_NODE', msg.ps.text.nodeUnavailable)
  return pid
}

/**
 * 把调试口挂到宿主全局（`window.__pszDump`），供 CEP 的 devtools / 宿主脚本直接敲。
 * 没有 DOM 的环境（`@vitest-environment node`）不挂即可 —— 日志本身照常工作。
 */
export function exposeDebugDump(dump: () => string): void {
  if (typeof window === 'undefined') return
  window.__pszDump = dump
}

/** 把构建信息挂到宿主全局（`window.__PSZ_BUILD__`），供控制台/支持排查 */
export function exposeBuildInfo(info: { version: string; time: string }): void {
  if (typeof window === 'undefined') return
  window.__PSZ_BUILD__ = info
}
