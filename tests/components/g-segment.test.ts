import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GSegment from '@/components/GSegment.vue'

/**
 * 单选段条（C-4 定案的新公共件）。
 * 语义与 `MultiTabs` 不同：单选，没有 ctrl 多选。
 */
describe('GSegment', () => {
  it('渲染全部段并标出当前选中项', () => {
    const wrapper = mount(GSegment, {
      props: { modelValue: 1, labels: ['矩形', '圆形', '正方形'] },
    })

    const cells = wrapper.findAll('.g-segment__cell')
    expect(cells).toHaveLength(3)
    expect(cells.map((cell) => cell.text())).toEqual(['矩形', '圆形', '正方形'])
    expect(cells[1].classes()).toContain('is-active')
    expect(cells[0].classes()).not.toContain('is-active')
  })

  it('点另一段时 emit 新的下标', async () => {
    const wrapper = mount(GSegment, {
      props: { modelValue: 0, labels: ['矩形', '圆形', '正方形'] },
    })

    await wrapper.findAll('.g-segment__cell')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  })

  it('点已选中的段不 emit（避免无意义的状态回写）', async () => {
    const wrapper = mount(GSegment, {
      props: { modelValue: 1, labels: ['矩形', '圆形', '正方形'] },
    })

    await wrapper.findAll('.g-segment__cell')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('选中项带 aria-checked', () => {
    const wrapper = mount(GSegment, {
      props: { modelValue: 0, labels: ['矩形', '圆形', '正方形'] },
    })

    const radios = wrapper.findAll('[role="radio"]')
    expect(radios[0].attributes('aria-checked')).toBe('true')
    expect(radios[1].attributes('aria-checked')).toBe('false')
  })
})
