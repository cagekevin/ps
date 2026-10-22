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

import AtomsPage from '@/pages/_atoms/index.vue'

function mountAtoms() {
  return mount(AtomsPage, { global: { plugins: [createPinia()] } })
}

describe('_atoms 演示页', () => {
  it('渲染 CommandGrid：演示页是命令注册表的第二个真实消费入口', () => {
    const wrapper = mountAtoms()

    // 命令 id 只可能来自 CommandGrid（本页不写任何命令 id 字面量）
    expect(wrapper.text()).toContain('font.apply')
    expect(wrapper.text()).toContain('命令网格 CommandGrid')
  })

  it('页面上仍然只有一套控件入口：CommandGrid 出现且没有重复标题', () => {
    const wrapper = mountAtoms()

    expect(wrapper.findAll('h2').filter((h) => h.text().includes('CommandGrid'))).toHaveLength(1)
  })
})
