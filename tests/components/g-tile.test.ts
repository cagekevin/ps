import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GButton from '@/components/GButton.vue'
import GTile from '@/components/GTile.vue'

describe('GTile（常用网格项）', () => {
  it('渲染图标块与文案', () => {
    const wrapper = mount(GTile, { props: { icon: 'iconqianrutupian', text: '嵌入图片' } })

    expect(wrapper.find('.g-tile__icon').exists()).toBe(true)
    expect(wrapper.find('.g-tile__text').text()).toBe('嵌入图片')
  })

  it('点击图标块发 click', async () => {
    const wrapper = mount(GTile, { props: { text: '嵌入图片' } })

    await wrapper.find('.g-tile__icon').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('mousedown 透传（拖拽起手交给页面）', async () => {
    const wrapper = mount(GTile, { props: { text: '嵌入图片' } })

    await wrapper.find('.g-tile__icon').trigger('mousedown')

    expect(wrapper.emitted('mousedown')).toHaveLength(1)
  })

  it('落点加 is-drop-before / is-drop-after', () => {
    const before = mount(GTile, { props: { text: 'x', drop: 'before' } })
    expect(before.classes()).toContain('is-drop-before')

    const after = mount(GTile, { props: { text: 'x', drop: 'after' } })
    expect(after.classes()).toContain('is-drop-after')
  })
})

describe('GButton 宽度变体（官方四档）', () => {
  it('full / half / quarter / fifth 各加对应类', () => {
    expect(mount(GButton, { props: { width: 'full' } }).classes()).toContain('is-w-full')
    expect(mount(GButton, { props: { width: 'half' } }).classes()).toContain('is-w-half')
    expect(mount(GButton, { props: { width: 'quarter' } }).classes()).toContain('is-w-quarter')
    expect(mount(GButton, { props: { width: 'fifth' } }).classes()).toContain('is-w-fifth')
  })

  it('不传 width 时不加任何宽度类', () => {
    const wrapper = mount(GButton)

    expect(wrapper.classes().some((name) => name.startsWith('is-w-'))).toBe(false)
  })
})
