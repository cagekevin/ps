import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  emptyClassification,
  getClassification,
  type Classification,
} from '@/cep/data/classification-repo'

/**
 * 分类数据的只读投影。
 *
 * 页面不再直接 import `@/cep/data`（ADR-16）：读也走读模型，
 * 这样 `degraded` 只有一个来源，UI 不会各写一套"数据不可用"判断。
 */
export const useClassificationStore = defineStore('classification', () => {
  const data = ref<Classification>(emptyClassification())
  /** 非空表示不是真实数据（缺文件/损坏），UI 必须提示 */
  const degraded = ref('')
  const loaded = ref(false)

  async function load(force = false) {
    if (loaded.value && !force) return
    const result = await getClassification()
    // `reason` 两种分支都有：`ok: true` + reason 表示"有数据但不完整"（分组为空），
    // `ok: false` 表示整份不可用。两种情况页面都要提示，所以这里不判 `ok` 就能取 reason
    data.value = result.ok ? result.value : emptyClassification()
    degraded.value = result.reason ?? ''
    loaded.value = true
  }

  return { data, degraded, loaded, load }
})
