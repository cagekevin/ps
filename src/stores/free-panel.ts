import { defineStore } from 'pinia'
import { ref } from 'vue'
import { freePanelRepo } from '@/cep/data/free-panel'
import { normalizeFreePanel, type FreePanelBlock } from '@/domain/free-panel'

/**
 * 自由面板只读投影。
 *
 * 写操作全部在 `commands/freePanel.ts`；这里只负责读文件并归一。
 */
export const useFreePanelStore = defineStore('freePanel', () => {
  const blocks = ref<FreePanelBlock[]>([])
  const degraded = ref('')

  async function load() {
    const read = await freePanelRepo.read()
    blocks.value = normalizeFreePanel(read.value).obj.list
    degraded.value = read.degraded ?? ''
  }

  return { blocks, degraded, load }
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
