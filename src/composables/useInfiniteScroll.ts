import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

/**
 * 滚到底自动加载。配 usePagedView 用：
 * 在列表末尾放一个空的哨兵元素，进入视口就调 onReach。
 *
 * 注意 root 要传**滚动容器**（列表本身），不是 window —— 面板里的滚动发生在容器内。
 */
export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | undefined>,
  onReach: () => void,
  opts: { root?: Ref<HTMLElement | undefined>; rootMargin?: string } = {},
) {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReach()
      },
      {
        root: opts.root?.value ?? null,
        rootMargin: opts.rootMargin ?? '160px',
      },
    )
    if (sentinel.value) observer.observe(sentinel.value)
  })

  // 列表可能是空的，哨兵在数据回来之后才出现，所以要看它的变化
  watch(sentinel, (el, prev) => {
    if (!observer) return
    if (prev) observer.unobserve(prev)
    if (el) observer.observe(el)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
