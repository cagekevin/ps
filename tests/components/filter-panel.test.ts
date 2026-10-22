import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FilterPanel from '@/pages/fontManage/components/FilterPanel.vue'
import type { Category } from '@/domain/classification'

const categories: Category[] = [
  {
    key: 'language',
    name: '字体语言',
    extraTag: 1,
    tags: [
      { id: 1, category: 'language', name: '简体' },
      { id: 3, category: 'language', name: 'English' },
    ],
  },
  {
    key: 'rating',
    name: '评分',
    tags: [{ id: 3, category: 'rating', icon: 'star_fill', repeat: 3 }],
  },
]

describe('FilterPanel', () => {
  it('渲染分组标题和 chip，「全部」只在有 extraTag 的组出现', () => {
    const wrapper = mount(FilterPanel, { props: { categories, modelValue: {} } })
    expect(wrapper.findAll('.fp__group')).toHaveLength(2)
    expect(wrapper.findAll('.fp__title')[0].text()).toBe('字体语言')
    // 语言组：全部 + 2 个，评分组：1 个
    expect(wrapper.findAll('.fp__chip')).toHaveLength(4)
    expect(wrapper.findAll('.fp__chip')[0].text()).toBe('全部')
  })

  it('评分用重复星号显示', () => {
    const wrapper = mount(FilterPanel, { props: { categories, modelValue: {} } })
    expect(wrapper.text()).toContain('★★★')
  })

  it('点 chip 发出新状态（不是原地改 props）', async () => {
    const wrapper = mount(FilterPanel, { props: { categories, modelValue: {} } })
    await wrapper.findAll('.fp__chip')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ language: [1] }])
  })

  it('再点一次取消选中', async () => {
    const wrapper = mount(FilterPanel, {
      props: { categories, modelValue: { language: [1] } },
    })
    await wrapper.findAll('.fp__chip')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ language: [] }])
  })

  it('有选中项时该 chip 高亮，「全部」不高亮', () => {
    const wrapper = mount(FilterPanel, {
      props: { categories, modelValue: { language: [1] } },
    })
    const chips = wrapper.findAll('.fp__chip')
    expect(chips[0].classes()).not.toContain('is-on')
    expect(chips[1].classes()).toContain('is-on')
  })

  it('点「全部」清空该组', async () => {
    const wrapper = mount(FilterPanel, {
      props: { categories, modelValue: { language: [1] } },
    })
    await wrapper.findAll('.fp__chip')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ language: [] }])
  })
})
