import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FontItem } from '@/domain/font-item'

/**
 * 字体管理页 · 系统字体读不到。
 *
 * 用户视角的判据：**「读不到」与「没有」在页面上必须是两句不同的话**。
 * - 读盘失败 → 错误块（带原因）+「重试」
 * - 真的一个字体都没有 → 空态「没有找到匹配的字体」
 *
 * 病根在数据层 `return []`：一折，页面就只剩那句空态，用户以为机器上没有字体。
 */

const reads = vi.hoisted(() => ({
  getFontList: vi.fn(),
  readFontTags: vi.fn(async () => []),
  readFontStars: vi.fn(async () => ({ ok: true, stars: {} })),
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/data/font-list', () => ({ getFontList: reads.getFontList }))
vi.mock('@/cep/data/font-meta', () => ({
  readFontTags: reads.readFontTags,
  readFontStars: reads.readFontStars,
}))
vi.mock('@/cep/jsx', () => ({
  jsx: {
    action: { callAction: vi.fn(), getActionList: vi.fn() },
    font: { setFont: vi.fn(), initSystemList: vi.fn(), checkUseFont: vi.fn() },
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
    style: {},
  },
}))

await import('@/commands')
const FontManagePage = (await import('@/pages/fontManage/index.vue')).default

function font(family: string): FontItem {
  return { family, weights: ['Regular'], names: [family], postScriptNames: [family], star: 0 }
}

let pinia: Pinia

async function mountPage() {
  const wrapper = mount(FontManagePage, {
    global: { plugins: [pinia], stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  reads.getFontList.mockResolvedValue([font('MiSans')])
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = NoopObserver
})

describe('字体管理页 · 系统字体读不到（TD-09-3）', () => {
  it('读盘失败 → 错误块 + 重试，且不是空态那句话', async () => {
    reads.getFontList.mockRejectedValue(new Error('读不到系统字体：EACCES: 拒绝访问'))

    const text = (await mountPage()).text()

    expect(text).toContain('读不到系统字体')
    expect(text).toContain('重试')
    expect(text).not.toContain('没有找到匹配的字体')
  })

  it('真的一个字体都没有 → 空态，且不是"读不到"', async () => {
    reads.getFontList.mockResolvedValue([])

    const text = (await mountPage()).text()

    expect(text).toContain('没有找到匹配的字体')
    expect(text).not.toContain('读不到系统字体')
  })
})
