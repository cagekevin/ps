import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import GAnchorGrid, { ANCHOR_ROWS } from '@/components/GAnchorGrid.vue'
/** pinia setup store 形态：状态是 ref，storeToRefs 才拿得到 */
let fakeStore: { options: Ref<Record<string, unknown>>; loadOptions: () => Promise<void> }

vi.mock('@/stores/common-use', () => ({ useCommonUseStore: () => fakeStore }))

vi.mock('@/components/command/useCommand', () => ({
  useCommand: () => ({ run: vi.fn(async () => true), disabled: false, running: false }),
}))
import GRadio from '@/components/GRadio.vue'
import PanelExport from '@/pages/commonUse/components/PanelExport.vue'
import PanelCustomChange from '@/pages/commonUse/components/PanelCustomChange.vue'
import PanelImport from '@/pages/commonUse/components/PanelImport.vue'

/**
 * T-88b 的公共件与面板：只断言"可观察结果"（分组数据、点击 emit、DOM 数量）。
 * 布局坐标不测（jsdom 没有）。
 */

describe('GAnchorGrid 的分组是数据', () => {
  it('锚点分两行、每行 6 个，共 12 个（官方 svgOne/svgTwo 各 6 项，:36278-36315）', () => {
    expect(ANCHOR_ROWS.map((row) => row.length)).toEqual([6, 6])
    expect(ANCHOR_ROWS.flat()).toHaveLength(12)
    // 12 格 / 9 个不同图标：svgTwo = [7,8,9,9,9,9]，展平下标 8/9/10/11 复用 weizhi9（app.v4.js:36304-36314）
    expect(new Set(ANCHOR_ROWS.flat()).size).toBe(9)
    expect(ANCHOR_ROWS.flat().slice(8)).toEqual([
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
    ])
  })

  it('按 rows 渲染：两行、每行格子数 = 分组长度，点格子 emit 锚点名', async () => {
    const wrapper = mount(GAnchorGrid)

    const rows = wrapper.findAll('.g-anchor-grid__row')
    expect(rows).toHaveLength(2)
    expect(rows[0].findAll('.g-anchor-grid__cell')).toHaveLength(6)
    expect(rows[1].findAll('.g-anchor-grid__cell')).toHaveLength(6)

    // 第二行第 3 格 = 展平下标 8
    await rows[1].findAll('.g-anchor-grid__cell')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([8])
  })

  it('传自定义 rows 时排法完全由数据决定（组件里没有写死的两段）', () => {
    const wrapper = mount(GAnchorGrid, { props: { rows: [['iconA'], ['iconB', 'iconC']] } })

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
  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = { options: ref({}), loadOptions: vi.fn(async () => {}) }
  })

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

describe('comexport 折叠区标题是官方原文', () => {
  it('三个标题逐字来自 app.v4.js:36661 / :36754 / :36784', () => {
    const wrapper = mount(PanelExport)
    const titles = wrapper.findAll('.g-collapse__title').map((el) => el.text())

    expect(titles).toEqual(['压缩尺寸 & 加水印', '所在目录设置', '批量导出功能'])
  })
})

describe('comcustomChange 六输入的商品名与配对', () => {
  it('六项官方 data 名各出现一次（app.v4.js:36316-36323）', () => {
    const wrapper = mount(PanelCustomChange)
    const rows = wrapper.findAll('.setting-row')

    expect(rows).toHaveLength(4) // 3 行输入 + 1 行按钮
    expect(wrapper.findAll('.g-input')).toHaveLength(6)
  })
})
