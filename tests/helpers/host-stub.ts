/**
 * 是什么：**测试装作"待在 CEP 里"的唯一入口** —— 往 `src/cep/host.ts` 注入宿主替身。
 *   **注入，不写 `window`**：测试代码里没有任何宿主全局的赋值点。
 * 替代了什么：测试里所有"装宿主"的动作（`require` / `__adobe_cep__` / `cep`）都由本文件负责，
 *   调用方只写"装什么形状"，不写"怎么装"。
 * 谁在用：需要"假 Node"（`window.require`）或"假 CEP 桥"（`window.__adobe_cep__`）的测试。
 * 禁止：不要在测试文件里再写 `window.require = …` / `window as unknown as { ... }`。
 *
 * ── 两个入口，差别只在"装的是什么" ─────────────────────────────────────────────
 * | 入口 | 装什么 | 卸 |
 * |---|---|---|
 * | `installHostRequire(fn)` | `getRequire()` 返回 `fn`（造"没有 node"就传 `null`） | `removeHostRequire()` |
 * | `installHostBridge(bridge)` | `getBridge()` 返回 `bridge`（形状可残缺，见下） | `removeHostBridge()` |
 *
 * 生命周期由**测试文件自己管**（`beforeEach` 装 / `afterEach` 卸）：桩的**有无/形状就是测试语义**
 * （"这一例没有 node" 本身就是一个用例），不是样板，不能交给 helper 自动收。
 *
 * **别和 `installFakeFs()` 搞混**（两个不是一回事）：
 * - `installFakeFs()`（`tests/helpers/fake-fs.ts`）＝**内存盘**：落盘不碰真磁盘，能精确注入 EACCES/ENOSPC。
 * - `installHostRequire()` ＝**真 require**：拿真 node 模块（`fs` 走真磁盘、`path`/`os` 照常），
 *   只是把其中一个换掉或包一层。
 *
 * 为什么桥的形状要放宽成 `Partial<HostBridge>`：真实 CEP 桥有 5 个必填方法，但**老宿主可能只给一部分**
 * （`fake-cep-bridge.ts` 的 `withoutGetSystemPath` 就是在造这种形状）。所以本文件把形状放宽，
 * 并且**只在 `installHostBridge` 这一处**做那次故意的越过。
 */
import {
  setHostDeps,
  type HostBridge,
  type HostCep,
  type HostCepFs,
  type HostCepUtil,
  type RequireFn,
} from '@/cep/host'

/** 假桥：只需要"用得上的那几个方法" */
export type StubBridge = Partial<HostBridge>

/** 挂上 require（CEP 的裸函数：只按 id 返回模块；传 `null` = 明确"宿主没开 --enable-nodejs"） */
export function installHostRequire(require: RequireFn | null): void {
  setHostDeps({ require })
}

/**
 * 卸掉 require：**回到"没注入"**，`getRequire()` 重新读 `window.require`。
 * （要造"宿主没开 --enable-nodejs"这个形状用 `installHostRequire(null)`，不要用这个。）
 */
export function removeHostRequire(): void {
  setHostDeps({ require: undefined })
}

/**
 * 挂上桥。
 *
 * 断言理由：CEP 注入的桥**可能缺方法**（老宿主）⇒ 这里把形状放宽成 `Partial<HostBridge>`。
 * 这是全仓测试里**唯一一处**故意越过 `HostBridge` 必填的地方；别处不许再写转型。
 */
export function installHostBridge(bridge: StubBridge): StubBridge {
  setHostDeps({ bridge: bridge as HostBridge })
  return bridge
}

/**
 * 卸掉桥：**回到"没注入"**，`getBridge()` 重新读 `window.__adobe_cep__`。
 * （否则同一文件里 `installFakeFs()` 之类仍靠 `window` 的部分会读不到。）
 */
export function removeHostBridge(): void {
  setHostDeps({ bridge: undefined })
}

/** `window.cep` 的假形状：`fs` / `util` 都可残缺（老宿主可能只给一个） */
export interface StubCep {
  fs?: Partial<HostCepFs>
  util?: Partial<HostCepUtil>
}

/**
 * 挂上 CEP 的 Node 侧 API（`window.cep.fs` 文件对话框 / `window.cep.util` 外链）。
 *
 * 断言理由：同 `installHostBridge` —— 真实 CEP 里 `fs` / `util` 的方法都是必填，
 * 但**老宿主可能缺方法**，要用例能造出这种坏形状 ⇒ 放宽成 `Partial`。
 * 这是全仓测试里**唯一一处**故意越过 `HostCepFs` / `HostCepUtil` 必填的地方。
 */
export function installHostCep(cep: StubCep): StubCep {
  setHostDeps({ cep: cep as HostCep })
  return cep
}

/** 卸掉 `window.cep`：**回到"没注入"**，`getCep()` 重新读 `window.cep` */
export function removeHostCep(): void {
  setHostDeps({ cep: undefined })
}
