import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FontWeight from '@/pages/fontManage/components/FontWeight.vue'
import type { FontItem } from '@/domain/font-item'

function font(over: Partial<FontItem> = {}): FontItem {
  return {
    family: 'MiSans',
    weights: ['Regular', 'Medium', 'Bold'],
    names: ['MiSans'],
    postScriptNames: ['MiSans-Regular', 'MiSans-Medium', 'MiSans-Bold'],
    ...over,
  }
}

describe('FontWeight', () => {
  it('每个字重渲染一个字形，英文用 A', () => {
    const wrapper = mount(FontWeight, { props: { font: font(), current: 0 } })
    const glyphs = wrapper.findAll('.fw__glyph')
    expect(glyphs).toHaveLength(3)
    expect(glyphs[0].text()).toBe('A')
  })

  it('中文字体用「永」', () => {
    const wrapper = mount(FontWeight, { props: { font: font({ family: '思源黑体' }), current: 0 } })
    expect(wrapper.find('.fw__glyph').text()).toBe('永')
  })

  it('只有一个字重时整行不渲染', () => {
    const wrapper = mount(FontWeight, {
      props: {
        font: font({ weights: ['Regular'], postScriptNames: ['MiSans-Regular'] }),
        current: 0,
      },
    })
    expect(wrapper.find('.fw').exists()).toBe(false)
  })

  it('最多显示 7 个字形', () => {
    const wrapper = mount(FontWeight, {
      props: {
        font: font({
          weights: Array.from({ length: 9 }, (_, i) => `W${i}`),
          postScriptNames: Array.from({ length: 9 }, (_, i) => `PS${i}`),
        }),
        current: 0,
      },
    })
    expect(wrapper.findAll('.fw__glyph')).toHaveLength(7)
  })

  it('点字形把下标 emit 出去', async () => {
    const wrapper = mount(FontWeight, { props: { font: font(), current: 0 } })
    await wrapper.findAll('.fw__glyph')[1].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([1])
  })

  it('当前字重有选中样式', () => {
    const wrapper = mount(FontWeight, { props: { font: font(), current: 2 } })
    expect(wrapper.findAll('.fw__glyph')[2].classes()).toContain('is-current')
  })

  it('数字 chip 显示字重总数，点开出现下拉并可选择', async () => {
    const wrapper = mount(FontWeight, { props: { font: font(), current: 0 } })
    expect(wrapper.find('.fw__count').text()).toBe('3')
    expect(wrapper.find('.fw__dropdown').exists()).toBe(false)

    await wrapper.find('.fw__count').trigger('click')
    const options = wrapper.findAll('.fw__option')
    expect(options).toHaveLength(3)

    await options[2].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([2])
    expect(wrapper.find('.fw__dropdown').exists()).toBe(false)
  })

  it('点击不冒泡到列表项（避免误应用字体）', async () => {
    const wrapper = mount(FontWeight, { props: { font: font(), current: 0 } })
    let bubbled = false
    wrapper.element.addEventListener('click', () => (bubbled = true))
    await wrapper.findAll('.fw__glyph')[0].trigger('click')
    expect(bubbled).toBe(false)
  })
})
