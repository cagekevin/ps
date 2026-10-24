import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * 色板面板（`pages/seBan/index.vue`）。
 *
 * 只验可观察结果：色点数量、点击/右键发到哪条命令、错误态与设置弹窗。
 * 布局（换行、分隔线方向）jsdom 没有布局，不测——那部分只能真机看。
 */
const swatch = vi.hoisted(() => ({
  recent: [
    { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } },
    { name: '未命名', color: { hex: '00FF00', c: 100, m: 0, y: 100, k: 0 } },
  ],
  custom: [{ name: '未命名', color: { hex: '0000FF', c: 100, m: 100, y: 0, k: 0 } }],
  recentLimit: 10,
  error: '',
  degraded: '',
  load: vi.fn(),
  retry: vi.fn(),
}))

vi.mock('@/stores/swatch', () => ({
  useSwatchStore: () => swatch,
}))

/** 命令层：只关心"点了哪条命令、带什么载荷"，执行细节在 `tests/commands/swatch.test.ts` */
const commands = vi.hoisted(() => ({
  addForegroundColor: { run: vi.fn(), disabled: { value: false }, running: { value: false } },
  setRecentLimit: { run: vi.fn(), disabled: { value: false }, running: { value: false } },
  sendColor: { run: vi.fn(), disabled: { value: false }, running: { value: false } },
  sendWireframeColor: { run: vi.fn(), disabled: { value: false }, running: { value: false } },
}))
const byId = vi.hoisted(() => new Map<string, unknown>())

vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => byId.get(id) ?? { run: vi.fn(), disabled: { value: true } },
}))

const { default: SeBanPage } = await import('@/pages/seBan/index.vue')
const { default: SwatchDot } = await import('@/pages/seBan/components/SwatchDot.vue')

beforeEach(() => {
  vi.clearAllMocks()
  swatch.error = ''
  swatch.recentLimit = 10
  byId.set('seban.addForegroundColor', commands.addForegroundColor)
  byId.set('seban.setRecentLimit', commands.setRecentLimit)
  byId.set('seban.sendColor', commands.sendColor)
  byId.set('seban.sendWireframeColor', commands.sendWireframeColor)
  commands.sendColor.run.mockResolvedValue(true)
  commands.sendWireframeColor.run.mockResolvedValue(true)
  commands.addForegroundColor.run.mockResolvedValue(true)
  commands.setRecentLimit.run.mockResolvedValue(true)
})

describe('色板面板：一整排（最近颜色 │ 常用颜色 │ 按钮）', () => {
  it('读出多少条就渲染多少个色点，三组之间两条分隔线', async () => {
    const wrapper = mount(SeBanPage)
    await nextTick()

    const dots = wrapper.findAllComponents(SwatchDot)
    expect(dots).toHaveLength(swatch.recent.length + swatch.custom.length)
    // 三组 → 两个分隔线
    expect(wrapper.findAll('.divider')).toHaveLength(2)
    // 两个按钮（＋ / ⚙）
    expect(wrapper.findAll('button.g-btn')).toHaveLength(2)
    expect(swatch.load).toHaveBeenCalledTimes(1)
  })

  it('左键点色点 → seban.sendColor，载荷是磁盘原始形状（不带视图模型多余字段）', async () => {
    const wrapper = mount(SeBanPage)
    await nextTick()

    await wrapper.findAllComponents(SwatchDot)[0].trigger('click')

    expect(commands.sendColor.run).toHaveBeenCalledWith({
      item: { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } },
    })
  })

  it('右键点色点 → seban.sendWireframeColor（不触发左键那条）', async () => {
    const wrapper = mount(SeBanPage)
    await nextTick()

    await wrapper.findAllComponents(SwatchDot)[2].trigger('contextmenu')

    expect(commands.sendWireframeColor.run).toHaveBeenCalledWith({
      item: { name: '未命名', color: { hex: '0000FF', c: 100, m: 100, y: 0, k: 0 } },
    })
    expect(commands.sendColor.run).not.toHaveBeenCalled()
  })

  it('读取失败时显示原因与重试，不把失败画成空色板', async () => {
    swatch.error = '自定义色读取失败（IO）'
    const wrapper = mount(SeBanPage)
    await nextTick()

    expect(wrapper.text()).toContain('自定义色读取失败')
    expect(wrapper.findAllComponents(SwatchDot)).toHaveLength(0)

    await wrapper.find('.strip__retry').trigger('click')
    expect(swatch.retry).toHaveBeenCalled()
  })
})

describe('设置：最近颜色数量', () => {
  it('点齿轮 → 弹窗带上当前值；确定把数字交给命令层（范围校验也在那边）', async () => {
    const wrapper = mount(SeBanPage, { attachTo: document.body })
    await nextTick()

    await wrapper.findAll('button.g-btn')[1].trigger('click')
    await nextTick()

    const input = document.body.querySelector<HTMLInputElement>('.g-input input')
    expect(input?.value).toBe('10')

    if (input) {
      input.value = '5'
      input.dispatchEvent(new Event('input'))
      await nextTick()
    }

    const ok = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === '确定',
    )
    ok?.click()
    await nextTick()

    expect(commands.setRecentLimit.run).toHaveBeenCalledWith({ limit: 5 })
    wrapper.unmount()
  })
})

describe('色点组件', () => {
  it('左键 emit pick、右键 emit outline（不发 DOM 默认菜单）', async () => {
    const dot = mount(SwatchDot, { props: { color: '#FF0000', label: '#FF0000' } })

    await dot.trigger('click')
    await dot.trigger('contextmenu')

    expect(dot.emitted('pick')).toHaveLength(1)
    expect(dot.emitted('outline')).toHaveLength(1)
  })
})
