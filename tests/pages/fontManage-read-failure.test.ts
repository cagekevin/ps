import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FontItem } from '@/domain/font-item'

/**
 * 字体管理页 · 星级读不到（TD-01-4）。
 *
 * 用户视角的判据：**「读不到」与「未收藏」在页面上必须是两句不同的话**。
 * 病根在数据层把失败折成 `{}`——一折，页面上就只剩"评分 0"，跟用户自己的数据没区别。
 */

const reads = vi.hoisted(() => ({
  getFontList: vi.fn(),
  readFontTags: vi.fn(async () => []),
  readFontStars: vi.fn(),
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
    font: { setFont: vi.fn(), initSystemList: vi.fn(), checkUseFont: vi.fn(), useUse: vi.fn() },
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
    style: {},
  },
}))

await import('@/commands')
const FontManagePage = (await import('@/pages/fontManage/index.vue')).default

function font(family: string): FontItem {
  return {
    family,
    weights: ['Regular'],
    names: [family],
    postScriptNames: [family],
    star: 0,
  }
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
  reads.readFontTags.mockResolvedValue([])
  reads.readFontStars.mockResolvedValue({ ok: true, stars: {} })
  reads.getFontList.mockResolvedValue([font('MiSans')])
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = NoopObserver
})

describe('字体管理页 · 星级读不到（TD-01-4）', () => {
  it('星级读不到时页面上出现「读取不到星级文件」，并且说明 0 不代表没收藏', async () => {
    reads.readFontStars.mockResolvedValue({ ok: false, stars: {}, reason: 'EPERM: 拒绝访问' })

    const text = (await mountPage()).text()

    expect(text).toContain('读取不到星级文件')
    expect(text).toContain('不是你的评分丢了')
  })

  it('星级读得到时不出这句话（不许把正常状态也说成故障）', async () => {
    reads.readFontStars.mockResolvedValue({ ok: true, stars: { MiSans: 3 } })

    const text = (await mountPage()).text()

    expect(text).not.toContain('读取不到星级文件')
  })
})
