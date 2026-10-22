import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/selection', async () => {
  const { shallowRef } = await import('vue')
  const snapshot = shallowRef({ ...selection })
  return {
    selectionRef: snapshot,
    refresh: async () => snapshot.value,
    current: () => snapshot.value,
  }
})

import CommandGrid from '@/components/command/CommandGrid.vue'
import { fontListRefresh } from '@/utils/signal'

function mountGrid(group?: 'font') {
  return mount(CommandGrid, {
    props: { group },
    global: { plugins: [createPinia()] },
  })
}

describe('CommandGrid', () => {
  it('按 group 渲染注册表里的命令（页面不写具体命令）', () => {
    const wrapper = mountGrid('font')
    const text = wrapper.text()

    expect(text).toContain('应用字体')
    expect(text).toContain('font.apply')
    expect(text).toContain('font.rate')
  })

  it('点击能真的执行：刷新命令发出信号（第二入口成立）', async () => {
    const spy = vi.spyOn(fontListRefresh, 'emit')
    const wrapper = mountGrid('font')

    const button = wrapper
      .findAll('button')
      .find((item) => item.text().includes('font.refreshList'))
    expect(button).toBeTruthy()

    await button?.trigger('click')
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
  })
})
