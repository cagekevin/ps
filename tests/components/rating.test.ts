import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Rating from '@/pages/fontManage/components/Rating.vue'

describe('Rating', () => {
  it('默认 3 颗星', () => {
    expect(mount(Rating).findAll('.rating__star')).toHaveLength(3)
  })

  it('已选值点亮对应星数', () => {
    const wrapper = mount(Rating, { props: { selected: 2 } })
    const stars = wrapper.findAll('.rating__star')
    expect(stars[0].classes()).toContain('is-on')
    expect(stars[1].classes()).toContain('is-on')
    expect(stars[2].classes()).not.toContain('is-on')
  })

  it('hover 到第几颗就亮到第几颗，移开恢复已选值', async () => {
    const wrapper = mount(Rating, { props: { selected: 1 } })
    const stars = wrapper.findAll('.rating__star')

    await stars[2].trigger('mouseenter')
    expect(stars[2].classes()).toContain('is-on')

    await wrapper.trigger('mouseleave')
    expect(stars[2].classes()).not.toContain('is-on')
    expect(stars[0].classes()).toContain('is-on')
  })

  it('点击 emit 星数，且不冒泡', async () => {
    const wrapper = mount(Rating, { props: { selected: 0 } })
    let bubbled = false
    wrapper.element.addEventListener('click', () => (bubbled = true))

    await wrapper.findAll('.rating__star')[1].trigger('click')

    expect(wrapper.emitted('rating')?.[0]).toEqual([2])
    expect(bubbled).toBe(false)
  })

  it('外部 selected 变化会同步显示', async () => {
    const wrapper = mount(Rating, { props: { selected: 1 } })
    await wrapper.setProps({ selected: 3 })
    expect(wrapper.findAll('.rating__star').every((s) => s.classes().includes('is-on'))).toBe(true)
  })
})
