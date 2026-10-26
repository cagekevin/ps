// 是什么：云同步状态的只读投影——台账（上次同步 / rev）+ 待同步痕迹明细 + 队列里的待推送数
// 唯一入口：页面只从这里读云同步状态，不直接 import cloudEngine / cloudSyncQueue
// 替代了什么：单一 status ref 已删除，现由台账（上次同步/rev）+ 待同步痕迹 + 待推送数三块投影替代
// 谁在用：src/pages/set/index.vue
// 禁止：这里不写数据、不发请求（写操作走 cloud.* 命令）

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cloudEngine, cloudSyncQueue } from '@/cep/cloud/setup'
import { onSyncOutcomeReported } from '@/cep/cloud/sync-report'
import { emptyCloudStatus, type CloudStatus } from '@/cloud/types'

export const useCloudStore = defineStore('cloud', () => {
  // T-114：台账读取改成三态后 `getStatus()` 是 async，初值先用空状态，`refresh()` 里填真值
  const status = ref<CloudStatus>(emptyCloudStatus())
  /** 队列里还没到时间推的 unit 数（内存值，和 status.pending 不是一回事） */
  const queuedUnits = ref(cloudSyncQueue.pendingUnits().length)
  /** 正在同步（拉取 / 推送飞行中） */
  const syncing = ref(cloudSyncQueue.busy())

  /** 只刷内存态：队列脏数 + 是否在飞。不读盘，可以高频调 */
  function refreshLive() {
    queuedUnits.value = cloudSyncQueue.pendingUnits().length
    syncing.value = cloudSyncQueue.busy()
  }

  /** 全量刷新：读台账与痕迹（有磁盘 I/O），只在打开页面 / 操作完成后调 */
  async function refresh() {
    status.value = await cloudEngine.getStatus()
    refreshLive()
  }

  return { status, queuedUnits, syncing, refresh, refreshLive }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：后台同步的结局**跃迁**时重读一次盘上的痕迹。
 *
 * 为什么必须有人接：页面只在挂载、手动拉取、切开关后 `refresh()`，5 秒定时器只刷内存脏数；
 * 后台推送失败时那句"没同步成功"永远不出现——痕迹在盘上，但用户看不到。
 *
 * 为什么不放在 store setup 里：测试每次 `createPinia` 都会新建 store，订阅会越积越多（同 `bindFontData`）。
 */
export function bindCloudData(): void {
  if (bound) return
  bound = true
  onSyncOutcomeReported(() => {
    void useCloudStore().refresh()
  })
}
