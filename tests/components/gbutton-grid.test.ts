import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GButton from '@/components/GButton.vue'

describe('GButton grid', () => {
  it('按 columns 输出网格类和宽度语义', () => {
    const wrapper = mount(GButton, {
      props: { grid: true, columns: 3 },
      slots: { default: '动作' },
    })

    const classes = wrapper.get('button').classes()
    expect(classes).toContain('is-grid')
    expect(classes).toContain('is-grid-3')
  })

  it('普通按钮不输出网格类', () => {
    const wrapper = mount(GButton, { slots: { default: '普通' } })
    expect(wrapper.get('button').classes()).not.toContain('is-grid')
  })
})
