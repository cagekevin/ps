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
const { createEmptyFreePanel, findBlock } = await import('@/domain/free-panel')
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
