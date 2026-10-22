import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cloudEngine } from '@/cep/cloud/setup'
import type { CloudStatus } from '@/cloud/types'

/** 云同步状态只读投影；写操作仍走 cloud.* 命令 */
export const useCloudStore = defineStore('cloud', () => {
  const status = ref<CloudStatus>(cloudEngine.getStatus())

  function refresh() {
    status.value = cloudEngine.getStatus()
  }

  return { status, refresh }
})
