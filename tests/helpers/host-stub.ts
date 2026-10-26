/**
 * 是什么：**宿主（CEP）注入到 window 上的两样东西的唯一装法** ——
 *   `window.require`（开了 `--enable-nodejs` 才有）与 `window.__adobe_cep__`（CEP 桥）。
 * 替代了什么：12 个测试文件里各自写的 `window as unknown as { ... }`（每处一个 cast，形状还各不相同）。
 * 谁在用：需要"假 Node"或"假 CEP 桥"的测试。
 * 禁止：不要在测试文件里再写 `window as unknown as { ... }` ——
 *   形状固定就用 `useHostRequire` / `useHostBridge`；每例形状不同就用 `installHostRequire` / `installHostBridge`。
 *
 * ── 两个入口，差别只在"要不要我管生命周期" ──────────────────────────────────
 * | 入口 | 什么时候用 | 生命周期 |
 * |---|---|---|
 * | `useHostRequire(fn)` / `useHostBridge(bridge)` | **形状整个文件固定** | **在文件顶层调一次** ⇒ 我给你装好：每例自动装、每例自动卸、每例后断言"没留下桩" |
 * | `installHostRequire(fn)` / `installHostBridge(bridge)` | **每例形状不同**（如"这一例桥缺方法"） | 你自己管：`beforeEach` 装、`afterEach` 卸（卸用 `Reflect.deleteProperty(window, 'require')` / `delete window.__adobe_cep__`） |
 *
 * 为什么要分这两个：桩的**形状**是测试语义的一部分（"这一例没有桥"就是要造出那个形状），
 * 而**每例装、每例卸**是机械劳动。⇒ 机械的归这里，语义的留给你。
 *
 * **别和 `installFakeFs()` 搞混**（两个不是一回事）：
 * - `installFakeFs()`（`tests/helpers/fake-fs.ts`）＝**内存盘**：落盘不碰真磁盘，能精确注入 EACCES/ENOSPC。
 * - `useHostRequire()` ＝**真 require**：拿真 node 模块（`fs` 走真磁盘、`path`/`os` 照常），
 *   只是把其中一个换掉或包一层。
 *
 * 为什么 require 必须走这里：`@types/node` 给 tests 声明的全局 `require` 是 `NodeRequire`，
 * 跟 `src/env.d.ts:66` 声明的 CEP 裸函数**合并成了交集** ⇒ 直接赋值编译不过（详见下面）。
 * 为什么桥要放宽：真实 CEP 桥有 5 个必填方法，但**老宿主可能只给一部分**
 * （`fake-cep-bridge.ts` 的 `withoutGetSystemPath` 就是在造这种形状）。
 * 所以本文件把形状放宽成 `Partial<CepBridge>`，并且**只在这里**做那一次故意的越过。
 */

/** 假桥：只需要"用得上的那几个方法" */
export type StubBridge = Partial<CepBridge>

/** 挂上 require（CEP 的裸函数：只按 id 返回模块） */
function mountRequire(require: (id: string) => unknown): void {
  // 断言理由：CEP 注入的 `window.require` 是**裸函数**；而 `@types/node` 给 tests 声明的
  // 全局 `require` 是 `NodeRequire`（还带 `require.resolve` / `require.cache` 等成员）——
  // 两者不是同形，`src/env.d.ts:66` 的声明与它**合并成了交集**
  // （`((id: string) => unknown) & Require`）⇒ 直接赋值编译不过。
  // 所以这里越过 NodeRequire 的那些额外成员。**这是全仓测试里唯一一处关于 require 的转型。**
  window.require = require as unknown as typeof window.require
}

/** 卸掉 require（`Reflect.deleteProperty` ⇒ 不用转型，也不受"必填属性不能 delete"的限制） */
export function removeHostRequire(): void {
  Reflect.deleteProperty(window, 'require')
}

/** 挂上桥 */
function mountBridge(bridge: StubBridge): void {
  // 断言理由：CEP 注入的桥**可能缺方法**（老宿主）⇒ 这里把形状放宽成 `Partial<CepBridge>`。
  // 这是全仓测试里**唯一一处**故意越过 `CepBridge` 必填的地方；别处不许再写转型。
  window.__adobe_cep__ = bridge as CepBridge
}

/** 卸掉桥（`__adobe_cep__` 在 `src/env.d.ts:62` 是可选的 ⇒ 直接删） */
export function removeHostBridge(): void {
  delete window.__adobe_cep__
}

/**
 * 只挂上 require，**不管生命周期** —— 测试文件自己管"什么时候装、什么时候卸"。
 * 卸：`removeHostRequire()`。
 */
export function installHostRequire(require: (id: string) => unknown): void {
  mountRequire(require)
}

/**
 * 只挂上桥，**不管生命周期** —— 测试文件自己管"什么时候装、什么时候卸"。
 * 卸：`removeHostBridge()`。
 */
export function installHostBridge(bridge: StubBridge): StubBridge {
  mountBridge(bridge)
  return bridge
}
