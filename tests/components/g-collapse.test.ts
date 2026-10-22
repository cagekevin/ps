import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GCollapse from '@/components/GCollapse.vue'

/**
 * 通用折叠行（C-3 定案的新公共件）。
 * 只断言可观察结果：展开态、箭头语义、emit 载荷。不测布局。
 */
describe('GCollapse', () => {
  it('默认收起，body 不可见', () => {
    const wrapper = mount(GCollapse, {
      props: { title: '说明' },
      slots: { default: '<p>内容</p>' },
    })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.g-collapse__body').attributes('style')).toContain('display: none')
  })

  it('defaultOpen 直接展开', () => {
    const wrapper = mount(GCollapse, {
      props: { title: '说明', defaultOpen: true },
      slots: { default: '<p>内容</p>' },
    })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    // 展开时 v-show 不再加 display:none，style 属性直接不存在
    expect(wrapper.get('.g-collapse__body').attributes('style') ?? '').not.toContain(
      'display: none',
    )
  })

  it('点击标题切换展开态并抛 toggle', async () => {
    const wrapper = mount(GCollapse, {
      props: { title: '说明' },
      slots: { default: '<p>内容</p>' },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[true]])

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
  })

  it('sub 变体只有左箭头，section 变体只有右箭头', () => {
    const section = mount(GCollapse, { props: { title: '基本设置' } })
    const sub = mount(GCollapse, { props: { title: '左侧栏', variant: 'sub' } })
    const plain = mount(GCollapse, { props: { title: '说明', variant: 'plain' } })

    expect(section.findAll('.g-collapse__arrow')).toHaveLength(1)
    expect(section.find('.g-collapse__arrow--left').exists()).toBe(false)
    expect(sub.findAll('.g-collapse__arrow')).toHaveLength(1)
    expect(sub.find('.g-collapse__arrow--left').exists()).toBe(true)
    // plain 是 /custom 的 baseOpen 说明块：右箭头
    expect(plain.findAll('.g-collapse__arrow')).toHaveLength(1)
    expect(plain.find('.g-collapse__arrow--left').exists()).toBe(false)
  })

  it('不传 title 时不渲染标题文字', () => {
    const wrapper = mount(GCollapse, { props: {} })

    expect(wrapper.find('.g-collapse__title').exists()).toBe(false)
  })
})
