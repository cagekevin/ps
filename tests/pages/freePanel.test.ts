import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 自由面板的拖拽 —— T-67 起走 `useLongPressDrag`（`am()` 机制，见 `/style` 范本）。
 *
 * 这里只验机制迁移后最容易丢的一条：**跨 block 移动**。
 * 旧实现把 `blockId` 藏在 `dragstart` 的闭包里；换成指针事件后，落点靠 DOM 上的
 * `data-block-id` 反查，写错就会退化成"只能在同一个 block 里排序"。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const FreePanel = (await import('@/pages/freePanel/components/FreePanel.vue')).default
const { execute } = await import('@/commands/registry')
const { freePanelRepo } = await import('@/cep/data/free-panel')
const { createEmptyFreePanel, findBlock, normalizeFreePanel } = await import('@/domain/free-panel')
const { bindFreePanelData } = await import('@/stores/free-panel')

// 生产里由 main.ts 装配；命令写库后页面投影要能刷新
bindFreePanelData()

let pinia: Pinia

async function mountPage() {
  const wrapper = mount(FreePanel, { global: { plugins: [pinia] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(async () => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()

  await freePanelRepo.write(createEmptyFreePanel())
  // block 1：A、B；block 2：X
  await execute('freePanel.addBlock', { type: 'norow' })
  await execute('freePanel.add', {
    blockId: 1,
    items: [
      { text: 'A', key: 'action.call' },
      { text: 'B', key: 'action.call' },
    ],
  })
  await execute('freePanel.add', {
    blockId: 2,
    items: [{ text: 'X', key: 'action.call' }],
  })
})

describe('自由面板 · 拖拽', () => {
  it('长按把 block 1 的 A 拖到 block 2 的 X 之后：跨 block 移动', async () => {
    const wrapper = await mountPage()
    const buttons = wrapper.findAll('.action-item__run')
    expect(buttons).toHaveLength(3)

    vi.useFakeTimers()
    try {
      await buttons[0].trigger('mousedown', { ctrlKey: true })
      vi.advanceTimersByTime(350)
      // jsdom 的 offsetWidth 是 0，指针在任意正坐标都算目标右半 → 插后
      await buttons[2].trigger('mousemove', { clientX: 10 })
      document.dispatchEvent(new MouseEvent('mouseup'))
    } finally {
      vi.useRealTimers()
    }
    await flushPromises()

    const file = (await freePanelRepo.read()).value
    expect(findBlock(file.obj.list, 1)?.data.map((item) => item.text)).toEqual(['B'])
    expect(findBlock(file.obj.list, 2)?.data.map((item) => item.text)).toEqual(['X', 'A'])
    wrapper.unmount()
  })
})

/**
 * D-32：显示设置的口径是全局（命令一次写所有区域），但原版数据是按区域存的。
 * 这里钉的是"勾选态如实暴露不一致"，不是"点一下就统一"——后者由命令层用例钉。
 */
describe('自由面板 · 显示设置勾选态（D-32 全局口径）', () => {
  /** 造出"两个区域不一致"的原版式数据：列数 3 vs 4、图标 开 vs 关 */
  async function makeMixed() {
    await freePanelRepo.update((file) => {
      const next = normalizeFreePanel(file)
      next.obj.list[0].showNumber = 3
      next.obj.list[1].showNumber = 4
      next.obj.list[0].showIcon = true
      next.obj.list[1].showIcon = false
      return next
    })
  }

  async function openMenu() {
    const wrapper = await mountPage()
    await wrapper.find('.free-panel__menu-btn').trigger('click')
    return wrapper
  }

  it('区域不一致时：列数三条都不打勾，图标显示半选「–」，文字仍打勾', async () => {
    await makeMixed()
    const wrapper = await openMenu()

    const marks = wrapper.findAll('.free-panel__check').map((node) => node.text())
    // 双列 / 三列 / 四列：没有任何一个能被当成"当前全局值"
    expect(marks.slice(0, 3)).toEqual(['', '', ''])
    // 图标：一半开一半关 → 半选，而不是拿第一个区域的值
    expect(marks[3]).toBe('–')
    // 文字：两个区域都是开 → 正常打勾
    expect(marks[4]).toBe('✓')
    wrapper.unmount()
  })

  it('显式点「四列」后两个区域一起变 4，勾选态回到一致', async () => {
    await makeMixed()
    const wrapper = await openMenu()

    const four = wrapper
      .findAll('.free-panel__menu button')
      .find((button) => button.text().includes('四列'))
    if (!four) throw new Error('四列 菜单项缺失')
    await four.trigger('click')
    await flushPromises()

    const after = (await freePanelRepo.read()).value
    expect(after.obj.list.map((block) => block.showNumber)).toEqual([4, 4])

    // 重新打开菜单：现在只有「四列」打勾
    await wrapper.find('.free-panel__menu-btn').trigger('click')
    const marks = wrapper.findAll('.free-panel__check').map((node) => node.text())
    expect(marks.slice(0, 3)).toEqual(['', '', '✓'])
    wrapper.unmount()
  })
})
