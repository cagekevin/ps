import { defineStore } from 'pinia'
import { ref } from 'vue'
import { freePanelRepo } from '@/cep/data/free-panel'
import type { FreePanelBlock } from '@/domain/free-panel'

/**
 * 自由面板只读投影。
 *
 * 写操作全部在 `commands/freePanel.ts`；这里只负责读文件并投影。
 *
 * 归一在**读边界**（`data/free-panel.ts` 的 `decode: decodeFreePanelFile`），不在这里，
 * 所以投影拿到的 `value.obj.list` 一定存在，`degraded` 也一定意味着"磁盘上那份文件不能当数据用"。
 *
 * `degraded` 是 D-40 加回来的：当时判"没有消费方"，现在页面有（读坏时提示"原文件已保留"，
 * 而不是显示一个空工作区让人以为数据被清了）。
 */
export const useFreePanelStore = defineStore('freePanel', () => {
  const blocks = ref<FreePanelBlock[]>([])
  const degraded = ref('')

  async function load() {
    const read = freePanelRepo.read()
    degraded.value = read.reason ?? ''
    // **故意不用 `read.fallback`**（T-104 逐处判过，这处不是 F 类）：生产者的默认值
    // `createEmptyFreePanel()` 带**一个** `norow` 区域（`domain/free-panel.ts:56-76`），
    // 不是空数组。投影它 = 坏文件和"新装首次使用"在界面上长得一模一样（ADR-14 扩展二），
    // 而且用户点新增会被 `file-repo.ts:161` 以坏因拒绝写（D-42），白点一次。
    // 这里给 `[]` 是**显示决策 + 可见信号（`degraded`）**，不是替生产者捏造值。
    blocks.value = read.ok ? read.value.obj.list : []
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
