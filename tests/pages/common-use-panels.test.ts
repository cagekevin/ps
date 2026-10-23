import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GAnchorGrid, { ANCHOR_ROWS } from '@/components/GAnchorGrid.vue'
import GRadio from '@/components/GRadio.vue'
import PanelExport from '@/pages/commonUse/components/PanelExport.vue'
import PanelImport from '@/pages/commonUse/components/PanelImport.vue'

/**
 * T-88b 的公共件与面板：只断言"可观察结果"（分组数据、点击 emit、DOM 数量）。
 * 布局坐标不测（jsdom 没有）。
 */

describe('GAnchorGrid 的分组是数据', () => {
  it('九宫格分成 3 + 6 两组，合计 9 个锚点', () => {
    expect(ANCHOR_ROWS.map((row) => row.length)).toEqual([3, 6])
    expect(ANCHOR_ROWS.flat()).toHaveLength(9)
    // 9 个锚点不重复（防止改分组时抄重）
    expect(new Set(ANCHOR_ROWS.flat()).size).toBe(9)
  })

  it('按 rows 渲染：两行、每行格子数 = 分组长度，点格子 emit 锚点名', async () => {
    const wrapper = mount(GAnchorGrid)

    const rows = wrapper.findAll('.g-anchor-grid__row')
    expect(rows).toHaveLength(2)
    expect(rows[0].findAll('.g-anchor-grid__cell')).toHaveLength(3)
    expect(rows[1].findAll('.g-anchor-grid__cell')).toHaveLength(6)

    await rows[1].findAll('.g-anchor-grid__cell')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['right'])
  })

  it('传自定义 rows 时排法完全由数据决定（组件里没有写死的两段）', () => {
    const wrapper = mount(GAnchorGrid, { props: { rows: [['top'], ['left', 'right']] } })

    expect(wrapper.findAll('.g-anchor-grid__row')).toHaveLength(2)
    expect(wrapper.findAll('.g-anchor-grid__cell')).toHaveLength(3)
  })
})

describe('GRadio', () => {
  it('点未选中项：写回 v-model 并 emit change', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'b' },
      slots: { default: 'B' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['b'])
  })

  it('点已选中项：不重复 emit', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'a' },
      slots: { default: 'A' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disabled：不 emit', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'b', disabled: true },
      slots: { default: 'B' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('面板形态', () => {
  it('comexport 有 3 个折叠区，且缺省全部收起（没有 default-open）', () => {
    const wrapper = mount(PanelExport)

    expect(wrapper.findAll('.g-collapse')).toHaveLength(3)
    // 三个 body 都 v-show=false（缺省收起）
    expect(
      wrapper
        .findAll('.g-collapse__body')
        .every((el) => el.attributes('style')?.includes('display: none')),
    ).toBe(true)
  })

  it('comimport 是"一块 = 一行勾选"', () => {
    const wrapper = mount(PanelImport)

    expect(wrapper.findAll('input[type="checkbox"], .check-box, label')).not.toHaveLength(0)
    expect(wrapper.find('.g-collapse').exists()).toBe(false)
  })
})
