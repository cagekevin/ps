import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * 监听容器宽度。CEP 面板可以被用户拉宽，原版就靠这个在 420px 以上切双列。
 * 注意：不要用 window.innerWidth，面板宽度和视口不是一回事。
 *
 * 目标元素可能是延迟渲染的（列表要等数据），所以 watch 它而不是只在 onMounted 观察一次。
 */
export function useElementWidth(target: Ref<HTMLElement | undefined>) {
  const width = ref(0)
  let observer: ResizeObserver | null = null

  function observe(el: HTMLElement | undefined) {
    if (!observer) {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) width.value = entry.contentRect.width
      })
    }
    observer.disconnect()
    if (!el) {
      width.value = 0
      return
    }
    width.value = el.getBoundingClientRect().width
    observer.observe(el)
  }

  watch(target, observe, { immediate: true })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return width
}
