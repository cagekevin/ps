import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePopover } from '@/composables/usePopover'
import { useDismiss } from '@/composables/useDismiss'

// 是什么：`usePopover` 的关闭行为测试（委托给 useDismiss 之后仍成立）｜替代了什么：无（新建）｜谁在用：浮层关闭收口
// 断的是"open 变没变、别的浮层关没关"（可观察），不断监听器实现细节。

const mounted: ReturnType<typeof mount>[] = []

function popoverHost() {
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  let api!: ReturnType<typeof usePopover>

  const wrapper = mount(
    defineComponent({
      setup() {
        api = usePopover({ triggerRef, panelRef })
        return () =>
          h('div', { class: 'host' }, [
            h('div', {
              ref: triggerRef,
              class: 'trigger',
              tabindex: 0,
              onKeydown: (event: KeyboardEvent) => api.onTriggerKeydown(event),
            }),
            api.open.value
              ? h('div', { ref: panelRef, class: 'panel' }, [h('span', { class: 'inside' }, 'x')])
              : null,
          ])
      },
    }),
    { attachTo: document.body },
  )
  mounted.push(wrapper)
  return { api, wrapper, triggerRef, panelRef }
}

/** 另一个走 useDismiss 的浮层（模拟 CepModal / 页面菜单），用来验证两条路不打架 */
function dismissHost(visible: Ref<boolean>) {
  const close = vi.fn(() => {
    visible.value = false
  })
  const container = ref<HTMLElement | null>(document.createElement('div'))
  const wrapper = mount(
    defineComponent({
      setup() {
        useDismiss(() => visible.value, container, close)
        return () => null
      },
    }),
    { attachTo: document.body },
  )
  mounted.push(wrapper)
  return { close, wrapper }
}

function pressEscape(target: EventTarget = document) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

async function openPopover(api: ReturnType<typeof usePopover>) {
  api.open.value = true
  await nextTick() // 面板渲染
  await nextTick() // watch(open) 里 await nextTick 后才 bind/update
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) {
    if (wrapper.vm) wrapper.unmount()
  }
  document.body.innerHTML = ''
})

describe('usePopover 关闭行为', () => {
  it('单层：点触发器/panel 内部不关、点外部关、Esc 关', async () => {
    const { api, panelRef, triggerRef } = popoverHost()
    await openPopover(api)

    // 点触发器必须算"内部"：否则 mousedown 先关、click 再 toggle 开 ⇒ 表现为"点触发器关不掉"
    triggerRef.value!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(api.open.value).toBe(true)

    panelRef.value!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(api.open.value).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(api.open.value).toBe(false)

    await openPopover(api)
    pressEscape()
    expect(api.open.value).toBe(false)
  })

  it('第二次打开后 Esc 仍然有效（bind/unbind 循环不残留）', async () => {
    const { api } = popoverHost()
    await openPopover(api)
    pressEscape()
    expect(api.open.value).toBe(false)

    await openPopover(api)
    pressEscape()
    expect(api.open.value).toBe(false)
  })

  it('与 useDismiss 浮层共存时，一次 Esc 只关最近打开的那一个', async () => {
    const pop = popoverHost()
    const other = ref(false)
    const D = dismissHost(other)

    await openPopover(pop.api)
    other.value = true // 后打开 ⇒ 它是"最上层"
    await nextTick()

    pressEscape()

    expect(D.close).toHaveBeenCalledTimes(1)
    expect(pop.api.open.value).toBe(true)
  })

  it('触发器上按 Esc 与 document 上按 Esc 结果一致：只关最上层', async () => {
    const pop = popoverHost()
    const other = ref(false)
    const D = dismissHost(other)

    await openPopover(pop.api)
    other.value = true
    await nextTick()

    pressEscape(pop.triggerRef.value!)

    expect(D.close).toHaveBeenCalledTimes(1)
    expect(pop.api.open.value).toBe(true)
  })
})
