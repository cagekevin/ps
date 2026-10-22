import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MultiTabs from '@/components/MultiTabs.vue'

const labels = ['颜色', '渐变', '字体', '样式']

describe('多选 Tab 条', () => {
  it('普通点击只留自己（原版 switchFun 的 map 分支）', async () => {
    const wrapper = mount(MultiTabs, {
      props: { modelValue: [true, true, false, false], labels },
    })

    await wrapper.findAll('.g-tabs__label')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[false, false, true, false]])
  })

  it('ctrl+点击只切换自己，其它保持（原版多选分支）', async () => {
    const wrapper = mount(MultiTabs, {
      props: { modelValue: [true, false, false, false], labels },
    })

    await wrapper.findAll('.g-tabs__label')[3].trigger('click', { ctrlKey: true })

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[true, false, false, true]])
  })

  it('点已选中的那项保持选中，不会全关', async () => {
    const wrapper = mount(MultiTabs, {
      props: { modelValue: [false, false, true, false], labels },
    })

    await wrapper.findAll('.g-tabs__label')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[false, false, true, false]])
  })

  it('文案带 ctrl 提示，选中项加 is-active，最后一项后面没有竖线', () => {
    const wrapper = mount(MultiTabs, {
      props: { modelValue: [true, false, false, false], labels },
    })

    const cells = wrapper.findAll('.g-tabs__label')
    expect(cells[0].attributes('title')).toBe('ctrl+点击同时显示')
    expect(cells[0].classes()).toContain('is-active')
    expect(cells[1].classes()).not.toContain('is-active')
    expect(wrapper.findAll('.g-tabs__line')).toHaveLength(labels.length - 1)
  })
})
