import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TagInput from '@/pages/fontManage/components/TagInput.vue'

/**
 * TagInput（`font-manage__tag__input`，T-53 抽出）自己的行为。
 * 父组件（TagMenu / TagCreator）只负责决定「回车之后干什么」，
 * 这里只钉住输入框自身：v-model 回写、回车 emit、清空、字数上限。
 */
describe('TagInput', () => {
  it('输入回写到 model', async () => {
    const wrapper = mount(TagInput, { props: { modelValue: '' } })

    await wrapper.find('.tag-input__field').setValue('免费')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['免费'])
  })

  it('回车发 enter 事件（父组件据此提交）', async () => {
    const wrapper = mount(TagInput, { props: { modelValue: '免费' } })

    await wrapper.find('.tag-input__field').trigger('keydown.enter')

    expect(wrapper.emitted('enter')).toHaveLength(1)
  })

  it('清空按钮：有值才出现，点它把 model 置空', async () => {
    const wrapper = mount(TagInput, { props: { modelValue: '免费' } })

    expect(wrapper.find('.tag-input__clear').exists()).toBe(true)
    await wrapper.find('.tag-input__clear').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
  })

  it('clearable=false 时不渲染清空按钮', () => {
    const wrapper = mount(TagInput, { props: { modelValue: '免费', clearable: false } })

    expect(wrapper.find('.tag-input__clear').exists()).toBe(false)
  })

  it('默认限 8 个字', () => {
    const wrapper = mount(TagInput)

    expect(wrapper.find('.tag-input__field').attributes('maxlength')).toBe('8')
  })
})
