import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DistributedDialog from '@/pages/fontSet/components/DistributedDialog.vue'
import FontColor from '@/pages/fontSet/components/FontColor.vue'

describe('DistributedDialog', () => {
  it('空值只报错，不提交也不关闭', async () => {
    const wrapper = mount(DistributedDialog, { props: { title: '垂直分布元素' } })

    await wrapper.find('input').setValue('   ')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })

    expect(wrapper.text()).toContain('不能输入空字符')
    expect(wrapper.emitted('ok')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('提交后未固定时自动关闭，固定时保持打开', async () => {
    const free = mount(DistributedDialog, { props: { pinned: false } })
    await free.find('input').setValue('20,30,40')
    await free.find('input').trigger('keydown', { key: 'Enter' })

    expect(free.emitted('ok')?.[0]).toEqual(['20,30,40'])
    expect(free.emitted('close')).toHaveLength(1)

    const pinned = mount(DistributedDialog, { props: { pinned: true } })
    await pinned.find('input').setValue('20=1:2:1')
    await pinned.find('input').trigger('keydown', { key: 'Enter' })

    expect(pinned.emitted('ok')?.[0]).toEqual(['20=1:2:1'])
    expect(pinned.emitted('close')).toBeUndefined()
  })
})

describe('FontColor', () => {
  const base = {
    text: null,
    fonts: [],
    defaults: { size: [12], leading: [1], tracking: [0] },
    oldVersion: false,
    unitLabel: '点',
  }

  it('没有选中文字时显示占位，不崩', () => {
    const wrapper = mount(FontColor, { props: base })
    expect(wrapper.text()).toContain('请选择字体')
    expect(wrapper.text()).toContain('选择字重')
  })

  it('有选中文字时把字号/行距/字距填进输入框', () => {
    const wrapper = mount(FontColor, {
      props: {
        ...base,
        text: {
          size: '60 点',
          weight: 'Medium',
          fauxBold: false,
          fauxItalic: false,
          useAutoLeading: false,
          leading: 12,
          tracking: 25,
          autoKerning: 'manual',
          capitalization: 'Nrml',
          color: { r: 0, g: 0, b: 0 },
          family: '思源黑体 CN',
          justification: 'left',
        },
      },
    })

    const inputs = wrapper.findAll('.fontset-number__input')
    expect(inputs.map((input) => (input.element as HTMLInputElement).value)).toEqual([
      '60',
      '12',
      '25',
    ])
    expect(wrapper.text()).toContain('思源黑体 CN')
    expect(wrapper.text()).toContain('Medium')
    // 有选中文字时才显示单位后缀
    expect(wrapper.text()).toContain('点')
  })

  it('ctrl+点击对齐图标走段落对齐', async () => {
    const wrapper = mount(FontColor, {
      props: {
        ...base,
        text: {
          size: '12 点',
          weight: 'Regular',
          fauxBold: false,
          fauxItalic: false,
          useAutoLeading: false,
          leading: 0,
          tracking: 0,
          autoKerning: 'manual',
          capitalization: 'Nrml',
          color: { r: 255, g: 255, b: 255 },
          family: 'MiSans',
          justification: 'left',
        },
      },
    })

    const align = wrapper
      .findAll('button')
      .find((item) => item.attributes('title')?.startsWith('左'))
    expect(align).toBeTruthy()
    await align!.trigger('click', { ctrlKey: true })

    expect(wrapper.emitted('align')?.[0]).toEqual([{ index: 0, shift: false, paragraph: true }])
  })
})
