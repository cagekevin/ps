// 是什么：云同步状态的只读投影——台账（上次同步 / rev）+ 待同步痕迹明细 + 队列里的待推送数
// 唯一入口：页面只从这里读云同步状态，不直接 import cloudEngine / cloudSyncQueue
// 替代了什么：原来只有 status 一个 ref（看不出"还没到时间推"和"推失败过"的区别）
// 谁在用：src/pages/set/index.vue
// 禁止：这里不写数据、不发请求（写操作走 cloud.* 命令）

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cloudEngine, cloudSyncQueue } from '@/cep/cloud/setup'
import type { CloudStatus } from '@/cloud/types'

export const useCloudStore = defineStore('cloud', () => {
  const status = ref<CloudStatus>(cloudEngine.getStatus())
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
  function refresh() {
    status.value = cloudEngine.getStatus()
    refreshLive()
  }

  return { status, queuedUnits, syncing, refresh, refreshLive }
})
