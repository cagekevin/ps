import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSection from '@/components/SettingsSection.vue'

/**
 * SettingsSection 现在是 GCollapse 的薄包装（契约 C-3）。
 * 这里验的是**薄包装这一层的行为**，不是 GCollapse 内部实现。
 */
describe('SettingsSection', () => {
  it('默认收起，点击后展开', async () => {
    const wrapper = mount(SettingsSection, {
      props: { title: '云同步设置' },
      slots: { default: '<p>内容</p>' },
    })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.g-collapse__body').attributes('style')).toContain('display: none')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.g-collapse__body').attributes('style') ?? '').not.toContain(
      'display: none',
    )
    expect(wrapper.text()).toContain('内容')
  })

  it('defaultOpen 打开内容', () => {
    const wrapper = mount(SettingsSection, {
      props: { title: '云同步设置', defaultOpen: true },
      slots: { default: '<p>内容</p>' },
    })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('内容')
  })

  it('variant 映射到 GCollapse 的 variant', () => {
    const section = mount(SettingsSection, {
      props: { title: '基本设置' },
      slots: { default: '<p>内容</p>' },
    })
    const sub = mount(SettingsSection, {
      props: { title: '左侧栏', variant: 'sub' },
      slots: { default: '<p>内容</p>' },
    })

    expect(section.get('.g-collapse').classes()).toContain('g-collapse--section')
    expect(sub.get('.g-collapse').classes()).toContain('g-collapse--sub')
  })

  it('二级行只画左箭头、一级块只画右箭头（原版箭头数量不变）', () => {
    const section = mount(SettingsSection, {
      props: { title: '基本设置' },
      slots: { default: '<p>内容</p>' },
    })
    const sub = mount(SettingsSection, {
      props: { title: '左侧栏', variant: 'sub' },
      slots: { default: '<p>内容</p>' },
    })

    expect(section.findAll('.g-collapse__arrow')).toHaveLength(1)
    expect(section.find('.g-collapse__arrow--left').exists()).toBe(false)
    expect(sub.findAll('.g-collapse__arrow')).toHaveLength(1)
    expect(sub.find('.g-collapse__arrow--left').exists()).toBe(true)
  })

  it('折叠状态变化时向外抛 toggle', async () => {
    const wrapper = mount(SettingsSection, {
      props: { title: '基本设置' },
      slots: { default: '<p>内容</p>' },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[true]])
  })
})
