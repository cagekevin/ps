import { defineStore } from 'pinia'
import { ref } from 'vue'
import { freePanelRepo } from '@/cep/data/free-panel'
import { normalizeFreePanel, type FreePanelBlock } from '@/domain/free-panel'

/**
 * 自由面板只读投影。
 *
 * 写操作全部在 `commands/freePanel.ts`；这里只负责读文件并归一。
 *
 * 没有 `degraded`（D-40）：写路径在 degraded 时已被 `file-repo.update` 拒绝，页面也不区分降级态。
 * 要加回来，先有消费方。
 */
export const useFreePanelStore = defineStore('freePanel', () => {
  const blocks = ref<FreePanelBlock[]>([])

  async function load() {
    const read = await freePanelRepo.read()
    blocks.value = normalizeFreePanel(read.value).obj.list
  }

  return { blocks, load }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新投影 */
export function bindFreePanelData() {
  if (bound) return
  bound = true

  freePanelRepo.onChange((value) => {
    useFreePanelStore().blocks = normalizeFreePanel(value).obj.list
  })
}
