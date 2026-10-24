// 是什么：把「本地数据文件改过了」接到同步队列的订阅层——只标脏，不发请求（ADR-21）
// 唯一入口：每个 unit 的触发源声明在它自己的 adapter 上（`entries/*` 的 `watch`）；这里只负责装配
// 替代了什么：原版 `56d7.js:48341-48351` emit → `:8998` 监听 → `:9562` 3 秒防抖 → `:9596` `$sync.pushFile`；
//            本文件原先手列两根线（action.library / font.hierarchy），漏了 stars/tags/settings（TD-11-1）
// 谁在用：cloud/auto-sync.ts 的 startCloudAutoSync（main.ts:74 启动时一次）
// 禁止：页面/组件不许 import；这里不发请求（请求归 cep/cloud/setup.ts 的队列）

import { cloudEntries } from './entries'
import { cloudSyncQueue } from './setup'

let offs: (() => void)[] = []

/**
 * 遍历 `cloudEntries`，逐个订阅它自己声明的触发源。
 *
 * **为什么遍历注册表，而不是手列几个 repo**（TD-11-1 的母体）：同步项的注册地在
 * `entries/index.ts`，触发源原先写在本文里 —— 两处分离，于是"新增一个同步项"只加了注册、
 * 忘了订阅，效果是**改了不同步、不报错、关掉面板就等于没同步**，5 个 unit 只有 2 个订上。
 * 现在触发源与 unit 同址（`SyncUnitAdapter.watch` 必填），漏声明编译不过。
 *
 * 订阅只做一次：`offs` 非空即已装配，重复调用（HMR / 二次 startAutoSync）不会重复订。
 *
 * UNVERIFIED(T-56)：`Repo.onChange` 只在本进程写成功后触发。原版面板或第二个面板实例
 * 改同一文件时这里收不到，所以"别的面板改了要不要上报"只能在真机观察；
 * 不要据本文件宣称"任何改动都会同步"。
 */
export function startCloudChangeSync(): void {
  if (offs.length > 0) return
  offs = cloudEntries.map((entry) => entry.watch(() => cloudSyncQueue.markDirty(entry.id)))
}

export function stopCloudChangeSync(): void {
  for (const off of offs) off()
  offs = []
}

/** 仅供测试：重置装配状态 */
export function __resetCloudChangeSyncForTest(): void {
  stopCloudChangeSync()
}
