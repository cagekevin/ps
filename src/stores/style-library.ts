// 是什么：样式库的只读投影（仓库列表 + 当前仓库的四个库）
// 替代了什么：页面直接读 `cep/data`（ADR-16 禁止）；原版 `data.initData()`（`app.v4.js:54803`）四处 new 库
// 谁在用：`pages/style/index.vue`
// 禁止：不写文件；写库/导入导出是第 2 段的命令，不在这里

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readStyleLibrary } from '@/cep/data/style-library-repo'
import { KU_KINDS, type KuGroup, type KuKind, type StyleWarehouse } from '@/domain/style-library'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

function emptyLibraries(): Record<KuKind, KuGroup[]> {
  const value = {} as Record<KuKind, KuGroup[]>
  for (const kind of KU_KINDS) value[kind] = []
  return value
}

export const useStyleLibraryStore = defineStore('styleLibrary', () => {
  const warehouses = ref<StyleWarehouse[]>([])
  const activeIndex = ref(0)
  const libraries = ref<Record<KuKind, KuGroup[]>>(emptyLibraries())

  /** 正在读 → 页面显示加载态（本地 IO，通常只有一帧，但读 4 个库时确实会闪） */
  const loading = ref(false)
  /**
   * 非空 = 读失败。两条路都归到这里，页面内联显示 + 重试：
   * 1. 读抛错（Node 不可用、文件被占用）
   * 2. 读到了但不是真数据（索引损坏 / 某个库文件读不到）
   * 第 2 条尤其重要：原版 `readToArray` 静默回 `[]`（`app.v4.js:72714-72742`），
   * 读失败会伪装成"空库"，用户接着导入覆盖就丢数据。
   */
  const error = ref('')

  const currentName = computed(() => warehouses.value[activeIndex.value]?.name ?? '默认仓库')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const snapshot = readStyleLibrary()
      warehouses.value = snapshot.index.list
      activeIndex.value = snapshot.index.index
      libraries.value = snapshot.libraries
    } catch (e) {
      error.value = describeCepError(e)
      log.error('style', '读取样式库失败', e)
    } finally {
      loading.value = false
    }
  }

  /** 页面上的"重试"按钮 */
  function retry() {
    return load()
  }

  return { warehouses, activeIndex, libraries, loading, error, currentName, load, retry }
})
