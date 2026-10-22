import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FontSetSelect from '@/pages/fontSet/components/FontSetSelect.vue'

describe('FontSetSelect 标签', () => {
  it('点标签发事件，activeTag 只保留标签内字体', async () => {
    const wrapper = mount(FontSetSelect, {
      props: {
        items: ['A', 'B', 'C'],
        tags: [{ text: '常用', arr: ['A', 'C'] }],
        mode: 'all',
      },
    })

    await wrapper.get('.fontset-select__trigger').trigger('click')
    await wrapper.get('.fontset-select__tags button').trigger('click')
    expect(wrapper.emitted('update:activeTag')?.[0]).toEqual(['常用'])

    await wrapper.setProps({ activeTag: '常用' })
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual(['A', 'C'])
  })
})

describe('FontSetSelect 中英文', () => {
  it('lang=cn 只显示中文家族，lang=en 只显示英文家族', async () => {
    const wrapper = mount(FontSetSelect, {
      props: {
        items: ['MiSans', '思源黑体', 'OPPOSans'],
        lang: 'cn',
        mode: 'all',
      },
    })

    await wrapper.get('.fontset-select__trigger').trigger('click')
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual([
      '思源黑体',
    ])

    await wrapper.setProps({ lang: 'en' })
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual([
      'MiSans',
      'OPPOSans',
    ])
  })
})

describe('FontSetSelect 预览档位', () => {
  it('previewSize 应用到列表项，点档位发事件', async () => {
    const wrapper = mount(FontSetSelect, {
      props: { items: ['A'], previewSize: 24, mode: 'all' },
    })

    await wrapper.get('.fontset-select__trigger').trigger('click')
    expect(wrapper.get('.fontset-select__item').attributes('style')).toContain('font-size: 24px')

    const options = wrapper.findAll('.fontset-select__tags button')
    await options[1].trigger('click')
    expect(wrapper.emitted('update:previewSize')?.[0]).toEqual([24])
  })
})

describe('FontSetSelect 星级', () => {
  it('activeStar 只保留对应星级', async () => {
    const wrapper = mount(FontSetSelect, {
      props: {
        items: ['A', 'B', 'C'],
        stars: { A: 3, B: 1, C: 3 },
        activeStar: 3,
        mode: 'all',
      },
    })

    await wrapper.get('.fontset-select__trigger').trigger('click')
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual(['A', 'C'])
  })
})

describe('FontSetSelect 最近', () => {
  it('全部模式显示所有字体，最近模式只显示最近并保持顺序', async () => {
    const wrapper = mount(FontSetSelect, {
      props: {
        items: ['A', 'B', 'C'],
        recent: ['C', 'A'],
        mode: 'all',
        filterable: true,
      },
      global: { stubs: { teleport: true } },
    })

    await wrapper.get('.fontset-select__trigger').trigger('click')
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual([
      'A',
      'B',
      'C',
    ])

    await wrapper.findAll('.fontset-select__tabs button')[1].trigger('click')
    expect(wrapper.emitted('update:mode')?.[0]).toEqual(['recent'])

    await wrapper.setProps({ mode: 'recent' })
    expect(wrapper.findAll('.fontset-select__item').map((item) => item.text())).toEqual(['C', 'A'])
  })
})
