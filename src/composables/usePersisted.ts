import { ref, watch, type Ref } from 'vue'
import { getPref, setPref } from '@/cep/prefs'

/**
 * 会记住的 ref。用于界面偏好（预览档位、筛选、展开状态）。
 * 业务数据（字体列表、动作列表）不要用它，那些要每次从 PS 取最新的。
 */
export function usePersistedRef<T>(key: string, fallback: T): Ref<T> {
  const state = ref(getPref(key, fallback)) as Ref<T>

  watch(
    state,
    (value) => setPref(key, value),
    { deep: true },
  )

  return state
}
