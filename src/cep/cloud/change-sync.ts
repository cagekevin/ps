// 是什么：把「本地数据文件改过了」接到同步队列的订阅层——只标脏，不发请求（ADR-21）
// 唯一入口：repo 的 onChange 只能在这里订阅；别处不许自己起定时器或直接 push
// 替代了什么：原版 `56d7.js:48341-48351` emit → `:8998` 监听 → `:9562` 3 秒防抖 → `:9596` `$sync.pushFile`
// 谁在用：cloud/auto-sync.ts 的 startCloudAutoSync（main.ts:74 启动时一次）
// 禁止：页面/组件不许 import；这里不发请求（请求归 cep/cloud/setup.ts 的队列）

import { actionIndexRepo, actionLibraryRepo } from '@/cep/data/actions'
import { hierarchyRepo } from '@/cep/data/font-extra'
import { cloudSyncQueue } from './setup'

/** 原版三类事件在我们这里只剩两根线（unit 内文件由 adapter 一起处理）： */
const ACTION_UNIT = 'action.library'
const HIERARCHY_UNIT = 'font.hierarchy'

let offs: (() => void)[] = []

/**
 * 订阅"改过了"的两类来源：
 * - `actionIndexRepo`：动作仓库的增删改 / 切换（原版 `syncActionWarehouse`）
 * - `actionLibraryRepo`：当前仓库文件里的分组与动作（原版 `syncActionItem` / `syncActionWarehouse`）
 * - `hierarchyRepo`：层级预设（T-55，原版 `fontSetHierarych` 的 `$sync.pushFile`）
 *
 * 依据（二手）：`docs/生成/jsx返回结构复原.md` §3.3；`data/actions.ts:60,66` 两个 repo 均已实现 onChange。
 *
 * UNVERIFIED(T-56)：`Repo.onChange` 只在本进程写成功后触发。原版面板或第二个面板
 * 实例改同一文件时这里收不到，所以"别的面板改了动作仓库要不要上报"这件事
 * 只能在真机观察；不要据本文件宣称"任何改动都会同步"。
 */
export function startCloudChangeSync(): void {
  if (offs.length > 0) return

  const mark = (unit: string) => () => cloudSyncQueue.markDirty(unit)
  offs = [
    actionIndexRepo.onChange(mark(ACTION_UNIT)),
    actionLibraryRepo.onChange(mark(ACTION_UNIT)),
    hierarchyRepo.onChange(mark(HIERARCHY_UNIT)),
  ]
}

export function stopCloudChangeSync(): void {
  for (const off of offs) off()
  offs = []
}

/** 仅供测试：重置装配状态 */
export function __resetCloudChangeSyncForTest(): void {
  stopCloudChangeSync()
}
