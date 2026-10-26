import { defineStore } from 'pinia'
import { ref } from 'vue'
import { renameRepo } from '@/cep/data/rename'
import { seedPreset, type RenamePreset } from '@/domain/rename'
import { describeCepError } from '@/utils/error-text'

/**
 * 重命名预设的只读投影。
 *
 * 写操作全部在 `commands/rename.ts`；这里只负责"读文件 + 把失败讲清楚"。
 * 三个状态页面都要渲染：`loading`（首屏）/ `error`（读失败，带重试）/ 正常。
 */
export const useRenameStore = defineStore('rename', () => {
  const preset = ref<RenamePreset>([])
  const loading = ref(false)
  /** 非空表示读失败；页面内联显示 + 重试按钮（页面级加载失败不走 toast） */
  const error = ref('')
  /** 非空表示读到的是降级数据（文件损坏等），仍可渲染但要提示 */
  const degraded = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const read = renameRepo.read()
      // 坏文件没有 value：回退到生产者自己的默认预设（`renameRepo` 的 fallback 就是它），
      // 与改前"坏文件 → fallback 种子"逐字一致；坏因进 `degraded` 让页面提示
      preset.value = read.status === 'ok' ? read.value : seedPreset()
      degraded.value = read.reason ?? ''
    } catch (e) {
      error.value = describeCepError(e)
      preset.value = []
      degraded.value = ''
    } finally {
      loading.value = false
    }
  }

  return { preset, loading, error, degraded, load }
})

let bound = false

/** 装配层调用一次（main.ts）：命令写成功后刷新只读投影 */
export function bindRenameData() {
  if (bound) return
  bound = true

  renameRepo.onChange((value) => {
    useRenameStore().preset = value
  })
}
