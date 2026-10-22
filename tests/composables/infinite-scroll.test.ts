import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, onMounted, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'

class ObserverStub {
  static instances: ObserverStub[] = []

  observed: Element[] = []
  disconnected = false

  constructor(
    public callback: IntersectionObserverCallback,
    public options: IntersectionObserverInit,
  ) {
    ObserverStub.instances.push(this)
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true
    this.observed = []
  }

  trigger() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
  }
}

beforeEach(() => {
  ObserverStub.instances = []
  vi.stubGlobal('IntersectionObserver', ObserverStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function host() {
  let hits = 0
  const Component = defineComponent({
    setup() {
      const ready = ref(false)
      const root = ref<HTMLElement>()
      const sentinel = ref<HTMLElement>()
      useInfiniteScroll(
        sentinel,
        () => {
          hits++
        },
        { root },
      )
      onMounted(() => {
        ready.value = true
      })
      return { ready, root, sentinel }
    },
    template: `<div v-if="ready" ref="root"><div ref="sentinel" /></div>`,
  })
  return { Component, hits: () => hits }
}

describe('useInfiniteScroll', () => {
  it('哨兵和容器晚于挂载出现时，重建 observer 并绑定容器作为 root', async () => {
    const { Component } = host()
    mount(Component)
    await nextTick()
    await nextTick()

    const last = ObserverStub.instances.at(-1)!
    expect(last.options.root).toBeInstanceOf(HTMLElement)
    expect(last.observed).toHaveLength(1)
  })

  it('哨兵进入视口时触发 onReach', async () => {
    const { Component, hits } = host()
    mount(Component)
    await nextTick()
    await nextTick()

    ObserverStub.instances.at(-1)!.trigger()
    expect(hits()).toBe(1)
  })

  it('root 变化时重建，旧 observer 被断开', async () => {
    const { Component } = host()
    mount(Component)
    await nextTick()
    await nextTick()

    // 第一次在 onMounted：容器还没渲染，root 为 null
    expect(ObserverStub.instances[0].options.root).toBeNull()
    // 容器出现后重建，旧的必须断开，否则两个 observer 同时存在
    expect(ObserverStub.instances[0].disconnected).toBe(true)
    expect(ObserverStub.instances.length).toBeGreaterThanOrEqual(2)
  })
})
