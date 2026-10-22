import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import CepModal from '@/components/CepModal.vue'

function mountModal(visible = true) {
  return mount(CepModal, {
    props: { visible, title: '删除标签' },
    slots: { default: '<button class="inner">内容</button>' },
    attachTo: document.body,
  })
}

function modalEl() {
  return document.querySelector<HTMLElement>('.modal')
}

describe('CepModal 无障碍', () => {
  it('是对外可识别的对话框', async () => {
    const wrapper = mountModal()
    await nextTick()
    const modal = modalEl()
    expect(modal?.getAttribute('role')).toBe('dialog')
    expect(modal?.getAttribute('aria-modal')).toBe('true')
    expect(modal?.getAttribute('aria-label')).toBe('删除标签')
    wrapper.unmount()
  })

  it('打开时焦点进入对话框，关闭后还给触发元素', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = mountModal()
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(modalEl())

    await wrapper.setProps({ visible: false })
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(trigger)

    wrapper.unmount()
    trigger.remove()
  })

  it('Tab 在对话框内部循环，不跑到页面外', async () => {
    const wrapper = mountModal()
    await nextTick()
    await nextTick()

    const modal = modalEl()!
    const buttons = Array.from(modal.querySelectorAll<HTMLElement>('button'))
    const first = buttons[0]
    const last = buttons[buttons.length - 1]

    last.focus()
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(first)

    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)

    wrapper.unmount()
  })

  it('Esc 关闭', async () => {
    const wrapper = mountModal()
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
    wrapper.unmount()
  })

  it('关闭按钮有可读名字', async () => {
    const wrapper = mountModal()
    await nextTick()
    expect(modalEl()?.querySelector('.modal__close')?.getAttribute('aria-label')).toBe('关闭')
    wrapper.unmount()
  })
})
