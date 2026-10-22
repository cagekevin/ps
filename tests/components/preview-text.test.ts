import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PreviewText from '@/pages/fontManage/components/PreviewText.vue'

describe('PreviewText', () => {
  it('用当前值初始化输入框', () => {
    const wrapper = mount(PreviewText, { props: { current: '设计助理' } })
    expect((wrapper.find('.pt__input').element as HTMLInputElement).value).toBe('设计助理')
  })

  it('空值时按钮禁用并置灰', () => {
    const wrapper = mount(PreviewText, { props: { current: '' } })
    const button = wrapper.find('.pt__btn')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('is-disabled')
  })

  it('只有空格也算空，回车不提交', async () => {
    const wrapper = mount(PreviewText, { props: { current: '' } })
    const input = wrapper.find('.pt__input')
    await input.setValue('   ')
    await input.trigger('keydown.enter')

    expect(wrapper.find('.pt__btn').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('输入后点应用，emit 去掉首尾空格的值', async () => {
    const wrapper = mount(PreviewText, { props: { current: '' } })
    await wrapper.find('.pt__input').setValue('  永字八法  ')
    await wrapper.find('.pt__btn').trigger('click')

    expect(wrapper.emitted('apply')?.[0]).toEqual(['永字八法'])
  })

  it('回车等同点应用', async () => {
    const wrapper = mount(PreviewText, { props: { current: 'abc' } })
    await wrapper.find('.pt__input').trigger('keydown.enter')
    expect(wrapper.emitted('apply')?.[0]).toEqual(['abc'])
  })

  it('外部 current 变化时同步输入框', async () => {
    const wrapper = mount(PreviewText, { props: { current: '旧' } })
    await wrapper.setProps({ current: '新' })
    expect((wrapper.find('.pt__input').element as HTMLInputElement).value).toBe('新')
  })
})
