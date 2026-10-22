import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSection from '@/components/SettingsSection.vue'

describe('SettingsSection', () => {
  it('默认收起，点击后展开', async () => {
    const wrapper = mount(SettingsSection, {
      props: { title: '云同步设置' },
      slots: { default: '<p>内容</p>' },
    })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.setting-section__body').attributes('style')).toContain('display: none')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.setting-section__body').attributes('style')).not.toContain('display: none')
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
})
