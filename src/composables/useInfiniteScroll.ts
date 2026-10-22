import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

/**
 * 滚到底自动加载。配 usePagedList 用：
 * 在列表末尾放一个空的哨兵元素，进入视口就调 onReach。
 *
 * 注意 root 要传**滚动容器**（列表本身），不是 window —— 面板里的滚动发生在容器内。
 *
 * root 和哨兵都可能晚于挂载才出现（首屏是空态，列表要等数据回来），
 * 所以不能只在 onMounted 读一次，两者变化时都要重建 observer。
 */
export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | undefined>,
  onReach: () => void,
  opts: { root?: Ref<HTMLElement | undefined>; rootMargin?: string } = {},
) {
  let observer: IntersectionObserver | null = null

  function connect() {
    observer?.disconnect()
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
  }

  onMounted(connect)

  // flush: 'post' 保证读到时 DOM 已经更新（ref 已绑上）
  watch([sentinel, () => opts.root?.value], connect, { flush: 'post' })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
