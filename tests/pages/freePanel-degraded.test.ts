import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyFreePanel, type FreePanelFile } from '@/domain/free-panel'
import type { Repo } from '@/cep/data/types'

/**
 * T-99-2：自由面板读坏时的**页面可见提示**。
 *
 * 判据是"失败可发现"：文件坏了要能在页面上看出来，而不是显示成"还没有自由面板区域"——
 * 后者会让人以为数据被清了，然后去点新增（写路径 D-42 会拒绝，白点一次）。
 *
 * repo 换成假对象，只钉页面这一层；真实接线在 `tests/data/free-panel-repo.test.ts`。
 */

// 类型参数不是装饰：`vi.fn()` 不写参数时 `mockResolvedValue` 收 `any`，
// 旧形状 `{ value, degraded }` / 漏 `ok` 都能编译过，运行时静默走失败分支。
const repo = vi.hoisted(() => ({
  read: vi.fn<Repo<FreePanelFile>['read']>(),
  onChange: vi.fn(),
}))

const selection = vi.hoisted(() => ({ hasSelection: false, typeNumber: 0 }))
const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/cep/data/free-panel', () => ({ freePanelRepo: repo }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const FreePanel = (await import('@/pages/freePanel/components/FreePanel.vue')).default

let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  repo.read.mockReset()
})

async function mountPage() {
  const wrapper = mount(FreePanel, { global: { plugins: [pinia] } })
  await flushPromises()
  return wrapper
}

describe('自由面板 · 读坏提示', () => {
  it('degraded 有值时空态显示原因，不再显示"还没有自由面板区域"', async () => {
    repo.read.mockResolvedValue({
      ok: false,
      reason: '内容结构不认识',
      // 坏读臂必带默认值（T-102）；本条钉的是"页面显示坏因，不显示默认空面板的空态文案"
      fallback: createEmptyFreePanel(),
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('内容结构不认识')
    expect(wrapper.text()).toContain('原文件已保留')
    expect(wrapper.text()).not.toContain('还没有自由面板区域')
    wrapper.unmount()
  })

  it('正常空文件仍显示普通空态文案', async () => {
    repo.read.mockResolvedValue({
      ok: true,
      value: { uid: 1, btnId: 0, obj: { version: '1.0', type: 'row', list: [] } },
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('还没有自由面板区域')
    wrapper.unmount()
  })
})
