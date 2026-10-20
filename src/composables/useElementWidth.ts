import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 监听容器宽度。CEP 面板可以被用户拉宽，原版就靠这个在 420px 以上切双列。
 * 注意：不要用 window.innerWidth，面板宽度和视口不是一回事。
 */
export function useElementWidth(target: Ref<HTMLElement | undefined>) {
  const width = ref(0)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const el = target.value
    if (!el) return
    width.value = el.getBoundingClientRect().width
    observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) width.value = entry.contentRect.width
    })
    observer.observe(el)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return width
}
