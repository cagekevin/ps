import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDismiss } from '@/composables/useDismiss'

// 是什么：`useDismiss` 的关闭语义测试｜替代了什么：无（本文件新建）｜谁在用：浮层关闭收口
// 断的是"哪个浮层被关掉"（可观察），不断监听器实现细节、不断 stopPropagation。

const mounted: ReturnType<typeof mount>[] = []

function host(visible: Ref<boolean>, options: { outside?: boolean } = {}) {
  const close = vi.fn(() => {
    visible.value = false
  })
  const el = document.createElement('div')
  document.body.appendChild(el)
  const container = ref<HTMLElement | null>(el)
  const wrapper = mount(
    defineComponent({
      setup() {
        useDismiss(() => visible.value, container, close, options)
        return () => null
      },
    }),
    { attachTo: document.body },
  )
  mounted.push(wrapper)
  return { close, el, wrapper }
}

function pressEscape(target: EventTarget = document) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

function clickOutside() {
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) {
    if (wrapper.vm) wrapper.unmount()
  }
  document.body.innerHTML = ''
})

describe('useDismiss', () => {
  it('两层都开着时，Esc 只关最近打开的那一个（与挂载顺序无关）', async () => {
    const a = ref(false)
    const b = ref(false)
    const A = host(a)
    const B = host(b)

    b.value = true // 先开 B（先挂载的是 A）
    await nextTick()
    a.value = true // A 最后打开 ⇒ 它才是"最上层"
    await nextTick()

    pressEscape()

    expect(A.close).toHaveBeenCalledTimes(1)
    expect(B.close).toHaveBeenCalledTimes(0)
  })

  it('挂载即打开的浮层同样能被 Esc 关掉（seq 不能是 0）', async () => {
    const only = ref(true)
    const M = host(only, { outside: false })
    await nextTick()

    pressEscape()

    expect(M.close).toHaveBeenCalledTimes(1)
  })

  it('点页面空白：所有开着的浮层都关（点空白与 Esc 是两个手势）', async () => {
    const a = ref(false)
    const b = ref(false)
    const A = host(a)
    const B = host(b)
    a.value = true
    b.value = true
    await nextTick()

    clickOutside()

    expect(A.close).toHaveBeenCalledTimes(1)
    expect(B.close).toHaveBeenCalledTimes(1)
  })

  it('outside:false（弹窗）点外部不关，但 Esc 关', async () => {
    const modal = ref(true)
    const M = host(modal, { outside: false })
    await nextTick()

    clickOutside()
    expect(M.close).not.toHaveBeenCalled()

    pressEscape()
    expect(M.close).toHaveBeenCalledTimes(1)
  })

  it('卸载后不再响应 Esc 与点空白', async () => {
    const a = ref(true)
    const A = host(a)
    await nextTick()
    A.wrapper.unmount()
    mounted.splice(mounted.indexOf(A.wrapper), 1)

    pressEscape()
    clickOutside()

    expect(A.close).not.toHaveBeenCalled()
  })
})
