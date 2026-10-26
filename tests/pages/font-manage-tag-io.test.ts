import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 字体管理页的「标签导入 / 导出」接线（T-51）。
 *
 * 页面这一层只管两件事：
 * 1. 菜单里有「导入标签」「导出标签」两项；
 * 2. 点了先弹**确认框**，取消不跑命令（不写盘），确定才跑命令。
 *
 * 命令本身的四条 P0 在命令层用例里钉死，这里不重复。
 */
const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

vi.mock('@/cep/data/font-list', () => ({ getFontList: async () => [] }))
vi.mock('@/cep/data/font-meta', () => ({
  readFontTags: async () => [],
  readFontStars: async () => ({ status: 'ok', stars: {} }),
}))

vi.mock('@/cep/jsx', () => ({
  jsx: {
    action: { callAction: vi.fn(), getActionList: vi.fn() },
    font: { setFont: vi.fn(), initSystemList: vi.fn(), checkUseFont: vi.fn(), useFont: vi.fn() },
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
    style: {},
  },
}))

const dialog = vi.hoisted(() => ({
  open: null as string | null,
  save: null as string | null,
  openFile: vi.fn(),
  saveFile: vi.fn(),
}))

vi.mock('@/cep/dialog', () => ({
  openFile: () => dialog.openFile(),
  saveFile: () => dialog.saveFile(),
}))

await import('@/commands')
const FontManagePage = (await import('@/pages/fontManage/index.vue')).default

let pinia: Pinia

async function mountPage() {
  const wrapper = mount(FontManagePage, {
    global: { plugins: [pinia], stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

/** 打开页头 ⋮ 菜单，返回菜单里的文字 */
async function openMenu(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  await wrapper.find('.icon-btn').trigger('click')
  await flushPromises()
  return wrapper.find('.g-menu').text()
}

/** 弹出的确认框（页面自己挂的 CepModal）；没弹出来就是用例失败，别让它变成后面的 TypeError */
function ioModal(wrapper: Awaited<ReturnType<typeof mountPage>>): DOMWrapper<Element> {
  const modal = wrapper.findAll('.modal').at(-1)
  if (!modal) throw new Error('没有弹出确认框：找不到 .modal')
  return modal
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  dialog.open = null
  dialog.save = null
  // jsdom 没有 IntersectionObserver，列表分页用不了 → 给个空实现
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: NoopObserver,
    configurable: true,
  })
})

describe('字体管理页 · 标签导入 / 导出（T-51）', () => {
  it('菜单里有「导入标签」「导出标签」两项', async () => {
    const wrapper = await mountPage()

    const text = await openMenu(wrapper)

    expect(text).toContain('导入标签')
    expect(text).toContain('导出标签')
  })

  it('点「导入标签」先弹确认框，文案是原版那一句', async () => {
    const wrapper = await mountPage()
    await openMenu(wrapper)

    await wrapper
      .findAll('.g-menu-item')
      .find((item) => item.text() === '导入标签')!
      .trigger('click')
    await flushPromises()

    const modal = ioModal(wrapper)
    expect(modal.text()).toContain('导入标签，会覆盖原来的标签及评分，是否继续？')
  })

  it('点「导出标签」弹的确认框是原版那一句', async () => {
    const wrapper = await mountPage()
    await openMenu(wrapper)

    await wrapper
      .findAll('.g-menu-item')
      .find((item) => item.text() === '导出标签')!
      .trigger('click')
    await flushPromises()

    const modal = ioModal(wrapper)
    expect(modal.text()).toContain('导出标签，不包含字体文件，仅导出标签及评分，是否继续？')
  })

  it('取消确认框 → 不跑命令（不写盘）', async () => {
    const wrapper = await mountPage()
    await openMenu(wrapper)

    await wrapper
      .findAll('.g-menu-item')
      .find((item) => item.text() === '导入标签')!
      .trigger('click')
    await flushPromises()

    // 取消按钮：`.modal__btn` 里第一个是「取消」
    await ioModal(wrapper).findAll('.modal__btn')[0].trigger('click')
    await flushPromises()

    // 命令没跑：文件对话框从没被调起 → 一个字都没写
    expect(dialog.openFile).not.toHaveBeenCalled()
  })

  it('确定确认框 → 跑命令（文件对话框被调起）', async () => {
    const wrapper = await mountPage()
    await openMenu(wrapper)

    await wrapper
      .findAll('.g-menu-item')
      .find((item) => item.text() === '导入标签')!
      .trigger('click')
    await flushPromises()

    // 确定按钮：`.modal__btn` 里最后一个是「确定」
    await ioModal(wrapper).findAll('.modal__btn').at(-1)!.trigger('click')
    await flushPromises()

    expect(dialog.openFile).toHaveBeenCalled()
  })
})
