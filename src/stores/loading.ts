import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 全局阻塞 loading。
 *
 * 用于**无进度可报**的阻塞任务；**有进度可报**（能报 i/n 或百分比）的走 TaskHud。
 * 判据是"报不报得出进度"，不是 `kind`（见 docs/组件库/页面契约.md T-97-7b）。
 * 用计数而不是布尔，避免并发任务互相提前关掉。
 */
export const useLoadingStore = defineStore('loading', () => {
  const count = ref(0)
  const message = ref('')
  const active = computed(() => count.value > 0)

  function show(text = '处理中…') {
    count.value += 1
    message.value = text
  }

  function hide() {
    count.value = Math.max(0, count.value - 1)
    if (!count.value) message.value = ''
  }

  async function invoke<T>(text: string, task: () => Promise<T>): Promise<T> {
    show(text)
    try {
      return await task()
    } finally {
      hide()
    }
  }

  return { count, message, active, show, hide, invoke }
})
