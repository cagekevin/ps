import { defineStore } from 'pinia'
import { ref } from 'vue'
import { freePanelRepo } from '@/cep/data/free-panel'
import type { FreePanelBlock } from '@/domain/free-panel'

/**
 * 自由面板只读投影。
 *
 * 写操作全部在 `commands/freePanel.ts`；这里只负责读文件并投影。
 *
 * 归一在**读边界**（`data/free-panel.ts` 的 `normalize: readFreePanelFile`），不在这里，
 * 所以投影拿到的 `value.obj.list` 一定存在，`degraded` 也一定意味着"磁盘上那份文件不能当数据用"。
 *
 * `degraded` 是 D-40 加回来的：当时判"没有消费方"，现在页面有（读坏时提示"原文件已保留"，
 * 而不是显示一个空工作区让人以为数据被清了）。
 */
export const useFreePanelStore = defineStore('freePanel', () => {
  const blocks = ref<FreePanelBlock[]>([])
  const degraded = ref('')

  async function load() {
    const read = await freePanelRepo.read()
    degraded.value = read.degraded ?? ''
    // 读坏时不投影 fallback 的空区域：那会显示成"工作区还在，只是空了"，
    // 用户点新增又会被 `file-repo.update` 以 degraded 拒绝（D-42），白点一次
    blocks.value = read.degraded ? [] : read.value.obj.list
  }

  return { blocks, degraded, load }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新投影 */
export function bindFreePanelData() {
  if (bound) return
  bound = true

  freePanelRepo.onChange((value) => {
    useFreePanelStore().blocks = value.obj.list
  })
}
