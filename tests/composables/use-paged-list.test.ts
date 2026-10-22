import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'
import { usePagedList } from '@/composables/usePagedList'

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', ObserverStub)
  // 失败用例会走 log.error，别污染测试输出
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

function setup(fetcher: () => Promise<number[]>, autoLoad = false) {
  let api!: ReturnType<typeof usePagedList<number>>
  const Host = defineComponent({
    setup() {
      api = usePagedList(fetcher, { autoLoad })
      return () => null
    },
  })
  const wrapper = mount(Host)
  return { api, wrapper }
}

describe('usePagedList', () => {
  it('首屏只给 30 条，hasMore 为 true', async () => {
    const { api } = setup(async () => range(45))
    await api.load()

    expect(api.items.value).toHaveLength(45)
    expect(api.visible.value).toHaveLength(30)
    expect(api.hasMore.value).toBe(true)
  })

  it('loadMore 追加一页，到底后 hasMore 变 false', async () => {
    const { api } = setup(async () => range(45))
    await api.load()

    api.loadMore()
    expect(api.visible.value).toHaveLength(45)
    expect(api.hasMore.value).toBe(false)
  })

  it('已加载过时再调 load 不重复请求，reset 才重新拉', async () => {
    const fetcher = vi.fn(async () => range(5))
    const { api } = setup(fetcher)

    await api.load()
    await api.load()
    expect(fetcher).toHaveBeenCalledTimes(1)

    await api.load(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(api.visible.value).toHaveLength(5)
  })

  it('加载中重复调用只发一次请求', async () => {
    let release!: (v: number[]) => void
    const fetcher = vi.fn(
      () =>
        new Promise<number[]>((resolve) => {
          release = resolve
        }),
    )
    const { api } = setup(fetcher)

    const first = api.load()
    const second = api.load()
    expect(fetcher).toHaveBeenCalledTimes(1)

    release(range(3))
    await Promise.all([first, second])
    expect(api.visible.value).toHaveLength(3)
  })

  it('失败时把错误翻成人话，重试能恢复', async () => {
    let fail = true
    const { api } = setup(async () => {
      if (fail) throw new CepError('TIMEOUT', 'timeout')
      return range(2)
    })

    await api.load()
    expect(api.error.value).toBe('Photoshop 没有响应，请稍后重试')
    expect(api.loading.value).toBe(false)

    fail = false
    await api.load(true)
    expect(api.error.value).toBe('')
    expect(api.visible.value).toHaveLength(2)
  })

  it('bind 之后以筛选结果为准，筛选变化回到第一页', async () => {
    const { api } = setup(async () => range(90))
    await api.load()

    const filtered = ref(range(60))
    api.bind(filtered)
    await nextTick()
    expect(api.visible.value).toHaveLength(30)

    api.loadMore()
    expect(api.visible.value).toHaveLength(60)

    filtered.value = range(40)
    await nextTick()
    expect(api.visible.value).toHaveLength(30)
    expect(api.hasMore.value).toBe(true)
  })

  it('autoLoad 在挂载后自动加载', async () => {
    const fetcher = vi.fn(async () => range(4))
    setup(fetcher, true)
    await flushPromises()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
