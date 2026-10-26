// 是什么｜替代了什么｜谁在用
// 是什么：CEP 注入的 Node 内置模块 —— **形状声明 + 唯一的 require 出口**（`hasNode` / `nodeRequire` / `toPosix`）
// 替代了什么：`cep/fs.ts:13-65` 的 Node 模块声明已迁出，现由本文件负责（与环境判断/读原语/编码/统计解耦）。
// 谁在用：`cep/paths.ts`（算路径）、`cep/fs-read.ts`（读）、`cep/dir-usage.ts`（统计）、`cep/disk-write.ts`（写）
// 怎么用：要 Node 模块就 `nodeRequire('fs')`；**表里没有的成员拿不到** —— 用到新成员就在 `NodeModules` 加一行
// 别这么写：`window.require(...)` / `window.cep_node.require(...)` 直接调 —— 那是绕开 `hasNode` 的第二个入口
// 读宿主全局只许在 `cep/host.ts`（`getRequire` / `getBridge`）；本文件只留"模块形状 + 出口"

import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { getRequire } from './host'

/**
 * CEP 注入的 Node 内置模块形状：**只声明本仓真正用到的成员**。
 *
 * 为什么不用 `@types/node`：`src/` 跑在 CEP 里，`tsconfig.json` 的 `types` 只有 `vite/client`。
 * 一旦让 `Buffer` / `process` 在全仓可见，误用就没人拦（`tsconfig.tests.json` 首段同此判据）。
 * 所以形状写在这里：**声明多少就查多少**，用到新成员就加一行 —— 表里没有的成员根本拿不到。
 */
export interface NodeModules {
  fs: {
    readFileSync(path: string, encoding: 'utf8'): string
    readFileSync(path: string): { toString(encoding: 'base64'): string }
    writeFileSync(path: string, data: string | Uint8Array, encoding?: 'utf8'): void
    mkdirSync(path: string, opts: { recursive: boolean }): void
    unlinkSync(path: string): void
    renameSync(from: string, to: string): void
    readdirSync(path: string, opts: { withFileTypes: true }): DirentLike[]
    statSync(path: string): { size: number }
  }
  path: { join(...parts: string[]): string; dirname(p: string): string }
  os: { homedir(): string }
  buffer: { Buffer: { from(data: string, encoding: 'base64'): Uint8Array } }
}

/** `readdirSync(..., { withFileTypes: true })` 的元素：只声明本仓判的三件事 */
interface DirentLike {
  name: string
  isDirectory(): boolean
  isFile(): boolean
}

/** CEP 是否开了 --enable-nodejs */
export function hasNode(): boolean {
  return getRequire() !== null
}

/**
 * 取 Node 内置模块。
 *
 * **全仓唯一越过类型系统的地方**：CEP 的 `require` 返回 any、没有模块形状包。
 * 形状由上面的 `NodeModules` 逐成员声明，`req(id)` 的结果在**这一行**被断言成那个形状。
 * 断言理由：第三方边界（CEP 注入的 require），形状已在表里声明；表外成员拿不到 ⇒ 不是无证据转型。
 */
export function nodeRequire<K extends keyof NodeModules>(id: K): NodeModules[K] {
  const req = getRequire()
  if (!req) throw new CepError('NO_NODE', msg.ps.text.nodeUnavailable)
  return req(id) as NodeModules[K]
}

/** 统一成正斜杠：CEP 在 Windows 上给反斜杠，拼进 jsx 脚本 / 比较路径都要先过这里 */
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}
