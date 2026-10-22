import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/EmptyState.vue'

describe('EmptyState', () => {
  it('compact 只渲染一行文案', () => {
    const wrapper = mount(EmptyState, {
      props: { compact: true, text: '没有内容' },
    })

    expect(wrapper.get('p').text()).toBe('没有内容')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('默认渲染官方插画和文案', () => {
    const wrapper = mount(EmptyState, {
      props: { text: '没有找到匹配的字体' },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('没有找到匹配的字体')
  })
})
