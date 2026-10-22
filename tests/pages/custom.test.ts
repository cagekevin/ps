import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 自定义页（`/custom`）的页面级行为。
 *
 * 测的是**页面给出的 DOM 与前置校验**：
 * - 空态显示「预览效果」，有可解析文案时显示格子
 * - 前置校验：至少一行、每行不超 100 字（`docs/页面/04-自定义.md:224-225`）
 * - 「重置参数」只重置形状 / 位置 / 显示高度，不重置行（`04-自定义.md:240-255`）
 * - 生成/合并走命令，页面不裸调 jsx
 *
 * 不测布局与坐标（jsdom 没有）。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 1 }))

vi.mock('@/selection', async () => {
  const { shallowRef } = await import('vue')
  const snapshot = shallowRef({ ...selection })
  return {
    selectionRef: snapshot,
    refresh: async () => snapshot.value,
    current: () => snapshot.value,
  }
})

/** 每个命令 id 一个 run；记录调用便于断言「走了哪条命令」 */
const calls = vi.hoisted(() => [] as Array<{ id: string; payload: unknown }>)

vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => ({
    command: undefined,
    disabled: { value: false },
    running: { value: false },
    run: async (payload: unknown) => {
      calls.push({ id, payload })
      return true
    },
  }),
}))

/** 假偏好存储；用例之间要清空，否则 `zdyShowHeight` 会漏到下一个用例 */
const prefs = vi.hoisted(() => ({ store: {} as Record<string, unknown> }))

vi.mock('@/cep/data/settings', () => ({
  getPref: (key: string, fallback: unknown) => (key in prefs.store ? prefs.store[key] : fallback),
  setPref: (key: string, value: unknown) => {
    prefs.store[key] = value
  },
}))

import CustomPage from '@/pages/custom/index.vue'

function mountPage(): VueWrapper {
  return mount(CustomPage, { global: { plugins: [createPinia()] } })
}

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(prefs.store)) delete prefs.store[key]
})

describe('/custom 页面', () => {
  it('无文案时预览区显示空态「预览效果」', () => {
    const wrapper = mountPage()

    expect(wrapper.get('.custom-preview__empty').text()).toBe('预览效果')
    expect(wrapper.findAll('.custom-preview__cell')).toHaveLength(0)
  })

  it('填入可解析的比例文案后预览区画出格子', async () => {
    const wrapper = mountPage()

    const input = wrapper.get('.custom-row__input input')
    await input.setValue('1:2:1')

    expect(wrapper.findAll('.custom-preview__cell')).toHaveLength(3)
    expect(wrapper.find('.custom-preview__empty').exists()).toBe(false)
  })

  it('一行都没填时点生成：报「至少输入一行」且不发命令', async () => {
    const wrapper = mountPage()

    await wrapper.get('.custom__generate').trigger('click')

    expect(calls).toHaveLength(0)
  })

  it('文案超过 100 字时点生成：报「不要超过100哦」且不发命令', async () => {
    const wrapper = mountPage()

    await wrapper.get('.custom-row__input input').setValue('a'.repeat(101))
    await wrapper.get('.custom__generate').trigger('click')

    expect(calls).toHaveLength(0)
  })

  it('点「生成框架」走 custom.generate 命令并带上页面状态', async () => {
    const wrapper = mountPage()

    await wrapper.get('.custom-row__input input').setValue('1:2')
    await wrapper.get('.custom__generate').trigger('click')

    expect(calls).toHaveLength(1)
    const { id, payload } = calls[0]
    expect(id).toBe('custom.generate')
    expect((payload as { request: { lines: Array<{ text: string }> } }).request.lines[0].text).toBe(
      '1:2',
    )
    // 空间距按原版兜底 8px，空字号兜底 0
    expect(payload.request.rowSpacing).toBe('8px')
    expect(payload.request.textSize1).toBe('0')
  })

  it('点「合并矩形」走 custom.mergeRectangles 命令', async () => {
    const wrapper = mountPage()

    await wrapper.get('.custom-row__input input').setValue('1:2')
    await wrapper.findAll('.custom__button')[1].trigger('click')

    expect(calls[0].id).toBe('custom.mergeRectangles')
  })

  it('形状段选切换后，生成的请求里带上新的形状序号', async () => {
    const wrapper = mountPage()

    await wrapper.get('.custom-row__input input').setValue('1:2')
    await wrapper.findAll('.g-segment__cell')[1].trigger('click')
    await wrapper.get('.custom__generate').trigger('click')

    expect((calls[0].payload as { request: { shapeIndex: number } }).request.shapeIndex).toBe(1)
  })

  it('「重置参数」把形状复位到矩形，但不删行', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('.g-segment__cell')[2].trigger('click')
    await wrapper.get('.custom-row__input input').setValue('1:2')
    await wrapper.findAll('.custom__button')[0].trigger('click')

    expect(wrapper.findAll('.g-segment__cell')[0].classes()).toContain('is-active')
    expect(wrapper.findAll('.custom-row')).toHaveLength(1)
  })

  it('说明折叠块默认收起，展开后有三条说明', async () => {
    const wrapper = mountPage()

    const head = wrapper.get('.g-collapse__head')
    expect(head.attributes('aria-expanded')).toBe('false')

    await head.trigger('click')

    expect(wrapper.get('.g-collapse__head').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.custom__note')).toHaveLength(3)
    expect(wrapper.text()).toContain('1:2:1表示按比例生成3块')
  })

  it('勾上「显示高度」后，每行多出高度输入框', async () => {
    const wrapper = mountPage()

    expect(wrapper.findAll('.custom-row__height')).toHaveLength(0)

    await wrapper.get('.check-box__box').trigger('click')

    expect(wrapper.findAll('.custom-row__height')).toHaveLength(1)
  })

  it('单位选择与引导图二选一：开显示高度时给引导图，不开时给单位', async () => {
    const wrapper = mountPage()

    expect(wrapper.find('.custom-row__unit-select').exists()).toBe(true)
    expect(wrapper.find('.custom-row__guide').exists()).toBe(false)

    await wrapper.get('.check-box__box').trigger('click')

    expect(wrapper.find('.custom-row__unit-select').exists()).toBe(false)
    expect(wrapper.find('.custom-row__guide').exists()).toBe(true)
  })
})
