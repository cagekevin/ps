import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { describeCepError } from '@/cep/eval-script'
import { log } from '@/utils/logger'
import { useInfiniteScroll } from './useInfiniteScroll'

type Fetcher<T> = () => Promise<T[]>

/**
 * 列表页一站式：取数据 + loading/error + 增量渲染 + 滚到底加载。
 *
 * 为什么合成一个：拆成「加载 / 分页 / 滚动」三个 composable 时，
 * 少接一个就出错，而且没人记得顺序（字体管理页实际踩过）。
 *
 * 用法：
 *   const { items, visible, loading, error, load, bind, listRef, sentinelRef } =
 *     usePagedList(() => getFontList())
 *   const filtered = computed(() => items.value.filter(...))
 *   bind(filtered)                      // 有筛选时把它绑成分页源
 *
 * 模板：
 *   <ul ref="listRef"> ... <li ref="sentinelRef" /> </ul>
 */
export function usePagedList<T>(
  fetcher: Fetcher<T>,
  opts: {
    pageSize?: number
    autoLoad?: boolean
    /** 由页面声明并绑到模板，这样 vue-tsc 能认出来被使用过 */
    listRef?: Ref<HTMLElement | undefined>
    sentinelRef?: Ref<HTMLElement | undefined>
  } = {},
) {
  // 原版字体页 store 里是 pageSize: 30，这里对齐
  const pageSize = opts.pageSize ?? 30

  const items = ref([]) as Ref<T[]>
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  // 分页源：默认跟 items 一致；页面有筛选时用 bind() 换成筛选结果
  const source = ref([]) as Ref<T[]>
  let bound = false
  watch(
    items,
    (value) => {
      if (!bound) source.value = value
    },
    { immediate: true },
  )

  const count = ref(pageSize)
  const visible = computed(() => source.value.slice(0, count.value))
  const hasMore = computed(() => source.value.length > count.value)

  function loadMore() {
    if (!hasMore.value) return
    count.value = Math.min(count.value + pageSize, source.value.length)
  }

  /** 把筛选后的数组绑成分页源；筛选变化时回到第一屏 */
  function bind(filtered: Ref<T[]>) {
    bound = true
    watch(
      filtered,
      (value) => {
        source.value = value
        count.value = pageSize
      },
      { immediate: true },
    )
  }

  const listRef = opts.listRef ?? ref<HTMLElement>()
  const sentinelRef = opts.sentinelRef ?? ref<HTMLElement>()
  useInfiniteScroll(
    sentinelRef,
    () => {
      if (hasMore.value) loadMore()
    },
    { root: listRef },
  )

  async function load(reset = false) {
    if (loading.value) return
    if (loaded.value && !reset) return

    loading.value = true
    error.value = ''
    try {
      items.value = await fetcher()
      loaded.value = true
      count.value = pageSize
    } catch (e) {
      error.value = describeCepError(e)
      log.error('list', error.value, e)
    } finally {
      loading.value = false
    }
  }

  if (opts.autoLoad) onMounted(() => void load())

  return { items, visible, loading, loaded, error, hasMore, loadMore, load, bind, listRef, sentinelRef }
}
