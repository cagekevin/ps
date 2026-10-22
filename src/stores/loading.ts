import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 全局阻塞 loading。
 *
 * 用于“页面不能继续操作”的短任务；长任务进度仍走 TaskHud。
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

  async function run<T>(text: string, task: () => Promise<T>): Promise<T> {
    show(text)
    try {
      return await task()
    } finally {
      hide()
    }
  }

  return { count, message, active, show, hide, run }
})
