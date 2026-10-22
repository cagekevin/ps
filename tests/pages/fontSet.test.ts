import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FontColor from '@/pages/fontSet/components/FontColor.vue'
import FontSetNumber from '@/pages/fontSet/components/FontSetNumber.vue'

/**
 * 回归守卫：字号 / 行距 / 字距的预设面板**点完保持展开**。
 *
 * 这是用户明确要求的行为。上一轮「底部图标统一」收口时被顺手改成
 * `pickPreset` 里重置 `presetOpen[index] = false`（自动收起），
 * 而 fontSet 页当时**一条测试都没有**，所以三个门禁全绿、改动无人察觉，
 * 最后是用户自己在界面上发现并改回来的。
 *
 * 所以这条断言只钉一件事：点预设 → 值提交出去，但面板不收起。
 */
const DEFAULTS = { size: [8, 10], leading: [1.2, 1.4], tracking: [0, 25] }

function mountColor() {
  return mount(FontColor, {
    props: { text: null, fonts: [], defaults: DEFAULTS, oldVersion: false, unitLabel: '点' },
  })
}

describe('FontColor 预设面板（用户确认行为）', () => {
  it('点字号预设：提交数值，但面板保持展开', async () => {
    const wrapper = mountColor()
    const numbers = wrapper.findAllComponents(FontSetNumber)

    numbers[0].vm.$emit('preset')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.fontset-color__preset')).toHaveLength(2)

    await wrapper.findAll('.fontset-color__preset')[1].trigger('click')

    expect(wrapper.emitted('size')?.at(-1)).toEqual([10])
    expect(wrapper.findAll('.fontset-color__preset')).toHaveLength(2)
  })

  it('再点一次箭头才收起', async () => {
    const wrapper = mountColor()
    const numbers = wrapper.findAllComponents(FontSetNumber)

    numbers[0].vm.$emit('preset')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.fontset-color__preset')).toHaveLength(2)

    numbers[0].vm.$emit('preset')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.fontset-color__preset')).toHaveLength(0)
  })
})
