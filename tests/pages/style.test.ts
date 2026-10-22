import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPref } from '@/cep/data/settings'
import { decodeText } from '@/domain/translate'
import type { KuGroup, KuKind } from '@/domain/style-library'
import { useFeedbackStore } from '@/stores/feedback'

/**
 * 三态测试：加载 / 空库 / 读失败（含重试）；第 2 段再加"应用/添加经 useCommand 接线"；
 * 第 3 段是右键菜单（四库各不一样，清单 #31-51）与组间距（#28 #29）。
 *
 * 只 mock 数据入口（`@/cep/data/style-library-repo`）与 jsx，store / 命令 / 页面都走真代码——
 * 这样测到的是"页面点了之后命令怎么跑"，不是替身自己的行为。
 */
const repo = vi.hoisted(() => ({
  read: vi.fn(),
  readItem: vi.fn(),
  readGroupId: vi.fn(),
  appendItem: vi.fn(),
  replaceItem: vi.fn(),
  deleteItem: vi.fn(),
  renameItem: vi.fn(),
  sendToSwatch: vi.fn(),
  appendItemToSwatch: vi.fn(),
  sendGroupToSwatch: vi.fn(),
  appendGroupToSwatch: vi.fn(),
  addGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  setKuGroupShow: vi.fn(),
  selectWarehouse: vi.fn(),
  addWarehouse: vi.fn(),
  renameWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
  moveItemTo: vi.fn(),
  moveGroupTo: vi.fn(),
  indexRepo: { read: vi.fn() },
}))

vi.mock('@/cep/data/style-library-repo', () => ({
  readStyleLibrary: repo.read,
  readKuItem: repo.readItem,
  readKuGroupId: repo.readGroupId,
  addKuItem: repo.appendItem,
  replaceKuItem: repo.replaceItem,
  deleteKuItem: repo.deleteItem,
  renameKuItem: repo.renameItem,
  sendKuItemToSwatch: repo.sendToSwatch,
  appendKuItemToSwatch: repo.appendItemToSwatch,
  sendKuGroupToSwatch: repo.sendGroupToSwatch,
  appendKuGroupToSwatch: repo.appendGroupToSwatch,
  addKuGroup: repo.addGroup,
  renameKuGroup: repo.renameGroup,
  deleteKuGroup: repo.deleteGroup,
  setKuGroupShow: repo.setKuGroupShow,
  selectWarehouse: repo.selectWarehouse,
  addWarehouse: repo.addWarehouse,
  renameWarehouse: repo.renameWarehouse,
  deleteWarehouse: repo.deleteWarehouse,
  moveKuItemTo: repo.moveItemTo,
  moveKuGroupTo: repo.moveGroupTo,
  styleIndexRepo: repo.indexRepo,
}))

// 图片型渐变的 src 要拼 <userDir>/Gradient/<fileName>；jsdom 里没有 Node，userDir() 会抛 NO_NODE
const fsMock = vi.hoisted(() => ({ userDir: vi.fn(() => 'C:/Users/u/AppData/Roaming/SheJiZhuLi') }))
// 命令模块会加载 `cep/data/style-library-io`（导入导出），它要 base64 编解码；
// 本文件不跑导入导出，给足符号即可，不模拟磁盘。
vi.mock('@/cep/fs', () => ({
  userDir: fsMock.userDir,
  hasNode: () => true,
  readTextSmart: async () => null,
  writeTextFile: () => undefined,
  writeTextFileAtomic: () => true,
  readBase64File: () => null,
  writeBase64File: () => true,
  removeFile: () => true,
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: {
    setFont: vi.fn(),
    initSystemList: vi.fn(),
    checkUseFont: vi.fn(),
    useFont: vi.fn(),
    getFontInfo: vi.fn(),
  },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
  rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
  style: {
    useShapeFill: vi.fn(),
    setBorderColor: vi.fn(),
    changeStyleColor: vi.fn(),
    useStyleColor: vi.fn(),
    useGradient: vi.fn(),
    useStyle: vi.fn(),
    getForegroundColor: vi.fn(),
    getGradientInfo: vi.fn(),
    addStyle: vi.fn(),
    setTool: vi.fn(),
  },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

// T-66：命令要等 PS 的「吸色完成」事件；页面测试里让 setd 立刻触发，避免 60s 超时
vi.mock('@/cep/events', () => ({
  subscribeHostEvent: async (name: string, listener: () => void) => {
    if (name === 'setd') listener()
    return () => {}
  },
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

await import('@/commands')
const StylePage = (await import('@/pages/style/index.vue')).default
const ConfirmHost = (await import('@/components/ConfirmHost.vue')).default

function libraries(overrides: Partial<Record<KuKind, KuGroup[]>> = {}): Record<KuKind, KuGroup[]> {
  return { color: [], gradient: [], font: [], style: [], ...overrides }
}

function snapshot(overrides: Partial<Record<KuKind, KuGroup[]>> = {}, degraded = '') {
  return {
    index: { index: 0, list: [{ name: '我的样式仓库' }] },
    libraries: libraries(overrides),
    degraded,
  }
}

let pinia: Pinia

function mountPage() {
  return mount(StylePage, { global: { plugins: [pinia] } })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  // tab 状态走 sj_v5_ui.json；浏览器分支是 localStorage，且 settings.ts 有模块级缓存，
  // localStorage.clear() 清不掉它——所以这里直接把偏好写回默认值
  setPref('styleShowTab', [true, false, false, false])
  vi.clearAllMocks()
  repo.read.mockReset()
  repo.readItem.mockReset()
  repo.readGroupId.mockReset()
  repo.appendItem.mockReset()
  repo.replaceItem.mockReset()
  repo.appendItem.mockResolvedValue(undefined)
  repo.replaceItem.mockResolvedValue(undefined)
  repo.deleteItem.mockResolvedValue(undefined)
  repo.renameItem.mockResolvedValue(undefined)
  repo.sendToSwatch.mockResolvedValue(undefined)
  repo.appendItemToSwatch.mockResolvedValue(undefined)
  repo.sendGroupToSwatch.mockResolvedValue(undefined)
  repo.appendGroupToSwatch.mockResolvedValue(undefined)
  repo.addGroup.mockResolvedValue(undefined)
  repo.renameGroup.mockResolvedValue(undefined)
  repo.deleteGroup.mockResolvedValue(undefined)
  repo.setKuGroupShow.mockResolvedValue(undefined)
  repo.selectWarehouse.mockResolvedValue(undefined)
  repo.addWarehouse.mockResolvedValue(undefined)
  repo.renameWarehouse.mockResolvedValue(undefined)
  repo.deleteWarehouse.mockResolvedValue(undefined)
  repo.moveItemTo.mockResolvedValue(undefined)
  repo.moveGroupTo.mockResolvedValue(undefined)
  // 命令层与 store 都会读索引；不返回真索引会走"读失败"分支，渲染不出库
  repo.indexRepo.read.mockResolvedValue({
    value: { index: 0, list: [{ name: '我的样式仓库' }] },
  })
})

describe('样式页三态', () => {
  it('加载态：读完之前显示正在读取', async () => {
    let release: (value: unknown) => void = () => {}
    repo.read.mockReturnValue(new Promise((resolve) => (release = resolve)))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-loading').exists()).toBe(true)

    release(snapshot())
    await flushPromises()
    expect(wrapper.find('.style-loading').exists()).toBe(false)
  })

  it('空库：四个库都没分组时显示空态，并保留仓库名', async () => {
    repo.read.mockResolvedValue(snapshot())

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('四个库都还是空的')
    expect(wrapper.find('.style-warehouse').text()).toContain('我的样式仓库')
  })

  it('单库空态：按库给一句「该放什么」的文案（T-64）', async () => {
    setPref('styleShowTab', [true, true, true, true])
    repo.read.mockResolvedValue(snapshot({ font: [{ name: '等线字组', show: true, items: [] }] }))

    const wrapper = mountPage()
    await flushPromises()

    // 字体库有分组 → 不显示空态；另外三库各显示自己的那句
    expect(wrapper.text()).toContain('颜色库还是空的：常用颜色会存在这里')
    expect(wrapper.text()).toContain('渐变库还是空的：常用渐变色会存在这里')
    expect(wrapper.text()).toContain('样式库还是空的：常用图层样式会存在这里')
    expect(wrapper.text()).not.toContain('字体库还是空的')
    expect(wrapper.text()).not.toContain('四个库都还是空的')
  })

  it('读失败：抛错时内联显示错误 + 重试按钮', async () => {
    repo.read.mockRejectedValue(new Error('磁盘读取失败'))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-error').exists()).toBe(true)
    expect(wrapper.find('.style-error').text()).toContain('磁盘读取失败')
    expect(wrapper.find('.style-retry').exists()).toBe(true)
  })

  it('读失败：降级信息（文件损坏）也算失败，不拿空库冒充"没有内容"', async () => {
    repo.read.mockResolvedValue(snapshot({}, 'sj_kuCol1.ini 读取失败'))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-error').text()).toContain('sj_kuCol1.ini 读取失败')
    expect(wrapper.text()).not.toContain('四个库都还是空的')
  })

  it('重试：点重试重新读，成功后错误消失并显示库内容', async () => {
    repo.read.mockRejectedValueOnce(new Error('磁盘读取失败'))

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('.style-error').exists()).toBe(true)

    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
      }),
    )
    await wrapper.find('.style-retry').trigger('click')
    await flushPromises()

    expect(wrapper.find('.style-error').exists()).toBe(false)
    expect(wrapper.text()).toContain('灰白')
    expect(wrapper.find('.style-item__swatch').exists()).toBe(true)
  })

  it('四 tab：默认只显示颜色库，切到渐变后渲染渐变库', async () => {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名' }] }],
        gradient: [{ name: '渐变默认分组', show: true, items: [{ name: '未命名' }] }],
      }),
    )

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('灰白')
    expect(wrapper.text()).not.toContain('渐变默认分组')

    await wrapper.findAll('.g-tabs__label')[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('渐变默认分组')
    expect(wrapper.text()).not.toContain('灰白')
  })
})

describe('样式页第 2 段：应用 / 添加经 useCommand 接线', () => {
  /** 颜色库一组两项；命令层从磁盘读原件，这里给原始项 */
  function seedColor() {
    repo.read.mockResolvedValue(
      snapshot({
        color: [
          {
            name: '灰白',
            show: true,
            items: [{ name: '未命名', swatch: '#302F34' }],
          },
        ],
      }),
    )
    repo.readItem.mockResolvedValue({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
  }

  beforeEach(() => {
    jsx.style.useShapeFill.mockResolvedValue(null)
    jsx.style.useStyleColor.mockResolvedValue(null)
    jsx.style.changeStyleColor.mockResolvedValue(null)
    jsx.style.getForegroundColor.mockResolvedValue({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
  })

  it('点颜色项 → style.applyColor（无修饰键走 ys_useStyleColor）', async () => {
    seedColor()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.style-item').trigger('click')
    await flushPromises()

    expect(jsx.style.useStyleColor).toHaveBeenCalled()
    expect(jsx.style.useShapeFill).not.toHaveBeenCalled()
  })

  it('ctrl+点击颜色项 → ys_useShapeFill', async () => {
    seedColor()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.style-item').trigger('click', { ctrlKey: true })
    await flushPromises()

    expect(jsx.style.useShapeFill).toHaveBeenCalledWith({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
  })

  it('alt+点击颜色项 → cy_changeStyleColor，成功后重新读库', async () => {
    seedColor()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.style-item').trigger('click', { altKey: true })
    await flushPromises()

    expect(jsx.style.changeStyleColor).toHaveBeenCalled()
    expect(repo.replaceItem).toHaveBeenCalled()
    // 回写后要刷新投影，否则页面上还是旧颜色
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })

  it('点组末"+"→ style.addColor，成功后重新读库', async () => {
    seedColor()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.style-item__add').trigger('click')
    await flushPromises()

    expect(jsx.style.getForegroundColor).toHaveBeenCalled()
    expect(repo.appendItem).toHaveBeenCalledWith('color', 0, {
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })
})

describe('四库分派：点字体项 / 点字体组"+" 不能落到样式库', () => {
  /** 字体库一组一项 + 磁盘上的原始项（命令层从磁盘取原件） */
  function seedFont() {
    repo.read.mockResolvedValue(
      snapshot({
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '未命名',
                fontPreview: {
                  count: 2,
                  size: '20点',
                  color: 'rgb(255, 0, 0)',
                  family: '等线',
                  weight: 'Regular',
                  scriptFamily: 'DengXian',
                },
              },
            ],
          },
        ],
      }),
    )
    repo.readItem.mockResolvedValue({
      name: '未命名',
      fonts: [{ family: '等线', weight: 'Regular' }],
    })
  }

  async function showFontLib(wrapper: ReturnType<typeof mountPage>) {
    await wrapper.findAll('.g-tabs__label')[2].trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    jsx.font.checkUseFont.mockResolvedValue(null)
    jsx.font.useFont.mockResolvedValue(null)
  })

  it('点字体项 → style.applyFont（ys_checkUseFont 再 ys_useFont），**不是** style.applyStyle', async () => {
    seedFont()

    const wrapper = mountPage()
    await flushPromises()
    await showFontLib(wrapper)
    await wrapper.find('.style-item').trigger('click')
    await flushPromises()

    // 最重要的断言：字体项走字体命令，图层样式命令一次都不能跑
    expect(jsx.font.checkUseFont).toHaveBeenCalledTimes(1)
    expect(jsx.font.useFont).toHaveBeenCalledTimes(1)
    expect(jsx.style.useStyle).not.toHaveBeenCalled()

    // 载荷形状照 fontSet.pasteFont：整项 JSON → Xv 编码（原版 `:51200`）
    const payload = jsx.font.useFont.mock.calls[0][0] as string
    expect(JSON.parse(decodeText(payload))).toEqual({
      name: '未命名',
      fonts: [{ family: '等线', weight: 'Regular' }],
    })
    expect(jsx.font.checkUseFont).toHaveBeenCalledWith(payload)
  })

  it('字体不可用（check 返回 err=1）→ 不调 ys_useFont', async () => {
    seedFont()
    jsx.font.checkUseFont.mockResolvedValue({ err: 1, msg: '缺少字体' })

    const wrapper = mountPage()
    await flushPromises()
    await showFontLib(wrapper)
    await wrapper.find('.style-item').trigger('click')
    await flushPromises()

    expect(jsx.font.checkUseFont).toHaveBeenCalled()
    expect(jsx.font.useFont).not.toHaveBeenCalled()
  })

  it('点字体组"+"→ style.addFont（ys_getFontInfo 的 data 入库），**不是** style.addStyle', async () => {
    seedFont()
    jsx.font.getFontInfo.mockResolvedValue({
      err: 0,
      data: { name: '未命名', fonts: [{ family: '等线' }] },
    })

    const wrapper = mountPage()
    await flushPromises()
    await showFontLib(wrapper)
    // title 也要说清是加字体（原版 `:50985`「添加字体，支持多图层」）
    expect(wrapper.find('.style-item__add').attributes('title')).toContain('字体')
    await wrapper.find('.style-item__add').trigger('click')
    await flushPromises()

    expect(jsx.font.getFontInfo).toHaveBeenCalled()
    expect(repo.appendItem).toHaveBeenCalledWith('font', 0, {
      name: '未命名',
      fonts: [{ family: '等线' }],
    })
    // 绝不许把图层样式写进字体库（污染用户库文件）
    expect(jsx.style.addStyle).not.toHaveBeenCalled()
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })

  it('字体读取失败（fonts 为空）→ 报错且不入库', async () => {
    seedFont()
    jsx.font.getFontInfo.mockResolvedValue({ err: 0, data: { fonts: [] } })

    const wrapper = mountPage()
    await flushPromises()
    await showFontLib(wrapper)
    await wrapper.find('.style-item__add').trigger('click')
    await flushPromises()

    expect(repo.appendItem).not.toHaveBeenCalled()
  })

  it('样式库项仍走 style.applyStyle（分派没改错库）', async () => {
    repo.read.mockResolvedValue(
      snapshot({
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
      }),
    )
    repo.readItem.mockResolvedValue({ name: '描边', id: 'X1' })
    repo.readGroupId.mockResolvedValue('YS5B2C4C06B1029543')

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[3].trigger('click')
    await flushPromises()
    await wrapper.find('.style-item').trigger('click')
    await flushPromises()

    expect(jsx.style.useStyle).toHaveBeenCalled()
    expect(jsx.font.useFont).not.toHaveBeenCalled()
  })
})

describe('组头：ctrl+点击「仅显示该组」与折叠都写库（原版 changeGroupShowStatus :52415-52435）', () => {
  function seedTwoGroups() {
    repo.read.mockResolvedValue(
      snapshot({
        color: [
          { name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] },
          { name: '深色', show: true, items: [{ name: '未命名', swatch: '#111111' }] },
        ],
      }),
    )
  }

  it('ctrl+点击组头 → style.toggleGroupShow({only:true})，写库后重新读', async () => {
    seedTwoGroups()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.base-group__head')[1].trigger('click', { ctrlKey: true })
    await flushPromises()

    expect(repo.setKuGroupShow).toHaveBeenCalledWith('color', 1, true)
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })

  it('普通点击组头 → style.toggleGroupShow（不带 only = 取反），不是页面本地折叠', async () => {
    seedTwoGroups()

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('.base-group__head').trigger('click')
    await flushPromises()

    expect(repo.setKuGroupShow).toHaveBeenCalledWith('color', 0, false)
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })

  it('展开态直接取库里的 show：show=false 的组只渲染组头，不渲染项', async () => {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: false, items: [{ name: '未命名', swatch: '#302F34' }] }],
      }),
    )

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.base-group__head').exists()).toBe(true)
    expect(wrapper.find('.style-item').exists()).toBe(false)
  })
})

describe('底栏四个「添加×分组」（原版 :49776-49832 → addGroup :54873-54879）', () => {
  const mounted: Array<{ unmount(): void }> = []

  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    document.body.innerHTML = ''
  })

  function mountPageInBody() {
    const page = mount(StylePage, { global: { plugins: [pinia] } })
    mounted.push(page)
    return page
  }

  it('六个按钮都不再禁用；导入 / 导出各弹 2 项菜单（契约 §3.5）', async () => {
    repo.read.mockResolvedValue(snapshot())

    const page = mountPageInBody()
    await flushPromises()

    const buttons = page.findAll('.g-bottom-bar__icon')
    expect(buttons).toHaveLength(6)
    for (const button of buttons) {
      expect(button.attributes('disabled')).toBeUndefined()
    }

    await buttons[4].trigger('click')
    await flushPromises()
    const importItems = page.findAll('.style-io-menu button').map((item) => item.text())
    expect(importItems).toHaveLength(2)
    expect(importItems[0]).toContain('导入预设仓库（覆盖）')
    expect(importItems[1]).toContain('追加预设仓库')

    await buttons[4].trigger('click')
    await flushPromises()
    expect(page.findAll('.style-io-menu')).toHaveLength(0)

    await buttons[5].trigger('click')
    await flushPromises()
    const exportItems = page.findAll('.style-io-menu button').map((item) => item.text())
    expect(exportItems).toHaveLength(2)
    expect(exportItems[0]).toContain('导出所有仓库')
    expect(exportItems[1]).toContain('导出当前仓库')
  })

  it('点「添加字体分组」→ 弹输入框 → 提交后 style.addGroup 追加到末尾（不带 afterIndex）', async () => {
    repo.read.mockResolvedValue(snapshot({ font: [{ name: '等线字组', show: true, items: [] }] }))

    const page = mountPageInBody()
    await flushPromises()

    await page.findAll('.g-bottom-bar__icon')[2].trigger('click')
    await flushPromises()

    const input = document.querySelector<HTMLInputElement>('.modal input')
    expect(input).toBeTruthy()
    expect(input!.placeholder).toBe('请输入组名')

    input!.value = '新字组'
    input!.dispatchEvent(new Event('input'))
    await flushPromises()
    document.querySelector<HTMLElement>('.modal__btn.is-primary')?.click()
    await flushPromises()

    expect(repo.addGroup).toHaveBeenCalledWith('font', '新字组', undefined)
  })
})

describe('四类库的项尺寸互不相同（原版四个 scoped 段，不是一套皮肤）', () => {
  /** 每个库各一组一项，用来断言 section 上的库类名 */
  function seedAll() {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: {
        color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
        gradient: [
          {
            name: '渐变默认分组',
            show: true,
            items: [
              {
                name: '未命名',
                swatch: 'linear-gradient(180deg, #D8C09E 0%, #E5D6BD 48.7548828125%)',
              },
            ],
          },
        ],
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '未命名',
                fontPreview: {
                  count: 2,
                  size: '20点',
                  color: 'rgb(255, 0, 0)',
                  family: '等线',
                  weight: 'Regular',
                  scriptFamily: 'DengXian',
                },
              },
            ],
          },
        ],
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
      },
      degraded: '',
    })
  }

  /** 默认只显示颜色库；四个 tab 全开（ctrl+点不互斥，照 MultiTabs 的多选语义） */
  async function showAllTabs(wrapper: ReturnType<typeof mountPage>) {
    for (const index of [1, 2, 3]) {
      await wrapper.findAll('.g-tabs__label')[index].trigger('click', { ctrlKey: true })
    }
    await flushPromises()
  }

  it('section 带 style-lib--<库名>，CSS 才能按库分派尺寸', async () => {
    seedAll()

    const wrapper = mountPage()
    await flushPromises()
    await showAllTabs(wrapper)

    const classes = wrapper.findAll('.style-lib').map((s) => s.classes().join(' '))
    expect(classes).toEqual([
      'style-lib style-lib--color',
      'style-lib style-lib--gradient',
      'style-lib style-lib--font',
      'style-lib style-lib--style',
    ])
  })

  it('颜色块是纯色、渐变块是换算后的 linear-gradient（不再长得一样）', async () => {
    seedAll()

    const wrapper = mountPage()
    await flushPromises()
    await showAllTabs(wrapper)

    const colorSwatch = wrapper.find('.style-lib--color .style-item__swatch')
    expect(colorSwatch.exists()).toBe(true)
    // 颜色是纯色：background 里没有 linear-gradient（jsdom 会把 hex 归一成 rgb()，不断言具体值）
    expect(colorSwatch.attributes('style')).not.toContain('linear-gradient')

    const gradientSwatch = wrapper.find('.style-lib--gradient .style-item__swatch')
    expect(gradientSwatch.exists()).toBe(true)
    // 渐变带方向与换算后的百分比（48.7548828125 来自 1997/4096*100）
    expect(gradientSwatch.attributes('style')).toContain('linear-gradient')
    expect(gradientSwatch.attributes('style')).toContain('48.7548828125%')
    // 两者不再是同一套皮肤
    expect(gradientSwatch.attributes('style')).not.toBe(colorSwatch.attributes('style'))
  })

  it('图片型渐变渲染 <img>，src 指向 <userDir>/Gradient/<fileName>', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: {
        color: [],
        gradient: [{ name: 'g', show: true, items: [{ name: '未命名', image: 'abc.png' }] }],
        font: [],
        style: [],
      },
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    // 默认只显示颜色库，切到渐变 tab
    await wrapper.findAll('.g-tabs__label')[1].trigger('click')
    await flushPromises()

    const img = wrapper.find('.style-item__img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/\/Gradient\/abc\.png$/)
  })
})

describe('仓库条（原版 warehouse 组件 data-v-47b7c6cb，清单 #71 #72 #73）', () => {
  it('点行展开下拉，列出索引里的全部仓库，当前仓库带勾', async () => {
    repo.read.mockResolvedValue({
      index: { index: 1, list: [{ name: '默认仓库' }, { name: '客户A' }] },
      libraries: libraries(),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('.style-warehouse__down').exists()).toBe(false)

    await wrapper.find('.style-warehouse__row').trigger('click')
    await flushPromises()

    // 末尾那行是「创建新分组」（原版 `:53886-53909`），不是仓库
    const rows = wrapper.findAll('.style-warehouse__item')
    expect(rows.map((row) => row.find('.style-warehouse__item-name').text())).toEqual([
      '默认仓库',
      '客户A',
      '创建新分组',
    ])

    // 原版每行都渲染一个 svg-14：选中是勾，其余留空位对齐（末尾那行也有一个创建图标）
    const checks = wrapper.findAll('.style-warehouse__check')
    expect(checks).toHaveLength(3)
    expect(checks[0].classes()).toContain('is-hidden')
    expect(checks[1].classes()).not.toContain('is-hidden')
  })

  it('再点一次收起', async () => {
    repo.read.mockResolvedValue(snapshot())

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.style-warehouse__row').trigger('click')
    await flushPromises()
    expect(wrapper.find('.style-warehouse__down').exists()).toBe(true)

    await wrapper.find('.style-warehouse__row').trigger('click')
    await flushPromises()
    expect(wrapper.find('.style-warehouse__down').exists()).toBe(false)
  })
})

describe('字体库 / 样式库的项内容（清单 #22 #24 #26）', () => {
  it('字体项：渲染 字体数 / N点 / 中文字 / 色点，预览字体取 fonts[0].family', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: libraries({
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '未命名',
                fontPreview: {
                  count: 2,
                  size: '20点',
                  color: 'rgb(255, 0, 0)',
                  family: '等线',
                  weight: 'Regular',
                  scriptFamily: 'DengXian',
                },
              },
            ],
          },
        ],
      }),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[2].trigger('click')
    await flushPromises()

    expect(wrapper.find('.style-item__font-count').text()).toBe('2')
    expect(wrapper.find('.style-item__font-size').text()).toBe('20点')
    expect(wrapper.find('.style-item__font-sample').text()).toBe('中文字')
    expect(wrapper.find('.style-item__font-dot').attributes('style')).toContain('rgb(255, 0, 0)')
    // 原版 :50970 的拼接顺序：family,'family','family weight',scriptFamily
    // （jsdom 把单引号归一成双引号，所以只断言「家族名 + 字重」这一段在）
    expect(wrapper.find('.style-item__font-sample').attributes('style')).toContain('等线 Regular')
  })

  it('字体项：color 为 null 时没有色点（不补默认色）', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: libraries({
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '未命名',
                fontPreview: {
                  count: 1,
                  size: '20点',
                  color: '',
                  family: '等线',
                  weight: '',
                  scriptFamily: '',
                },
              },
            ],
          },
        ],
      }),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[2].trigger('click')
    await flushPromises()

    expect(wrapper.find('.style-item__font-dot').exists()).toBe(false)
    expect(wrapper.find('.style-item__font-sample').exists()).toBe(true)
  })

  it('样式项：缩略图 src 指向 <userDir>/kuStyle/<id>.png', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: libraries({
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
      }),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[3].trigger('click')
    await flushPromises()

    const img = wrapper.find('.style-item__thumb')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/\/kuStyle\/X1\.png$/)
  })

  it('样式项：缩略图加载失败就不再画 <img>，只留深色底（不显示碎图标）', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: libraries({
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
      }),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[3].trigger('click')
    await flushPromises()

    await wrapper.find('.style-item__thumb').trigger('error')
    await flushPromises()

    expect(wrapper.find('.style-item__thumb').exists()).toBe(false)
    // 卡片本身还在（26×26 深色块），只是没有图
    expect(wrapper.find('.style-lib--style .style-item').exists()).toBe(true)
  })

  it('样式项：没有 id 就不渲染 <img>（不猜文件名）', async () => {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: libraries({
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边' }] }],
      }),
      degraded: '',
    })

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('.g-tabs__label')[3].trigger('click')
    await flushPromises()

    expect(wrapper.find('.style-item__thumb').exists()).toBe(false)
    expect(wrapper.find('.style-lib--style .style-item').exists()).toBe(true)
  })
})

describe('项 hover 浮层（T-60）', () => {
  function seedHover() {
    repo.read.mockResolvedValue({
      index: { index: 0, list: [{ name: 'W' }] },
      libraries: {
        color: [
          {
            name: '灰白',
            show: true,
            items: [{ name: '未命名', swatch: '#302F34' }],
          },
        ],
        gradient: [{ name: '渐变默认分组', show: true, items: [] }],
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '正文',
                fontPreview: {
                  count: 2,
                  size: '20点',
                  color: '',
                  family: '等线',
                  weight: 'Regular',
                  scriptFamily: 'DengXian',
                },
              },
            ],
          },
        ],
        style: [{ name: '样式默认分组', show: true, items: [] }],
      },
      degraded: '',
    })
  }

  it('hover 颜色项 → 浮层给项名 / 分组 / 库名 / 色值，移出后消失', async () => {
    seedHover()

    const wrapper = mountPage()
    await flushPromises()

    const item = wrapper.find('.style-lib--color .style-item[data-drag-item="0"]')
    await item.trigger('mouseenter')
    await flushPromises()

    const tip = wrapper.find('.style-describe')
    expect(tip.exists()).toBe(true)
    expect(tip.text()).toContain('未命名')
    expect(tip.text()).toContain('灰白')
    expect(tip.text()).toContain('颜色库')
    expect(tip.text()).toContain('#302F34')

    await item.trigger('mouseleave')
    await flushPromises()
    expect(wrapper.find('.style-describe').exists()).toBe(false)
  })

  it('hover 字体项 → 只用已有字段（家族 / 字重 / 字号 / 字体数），不编 CMYK', async () => {
    setPref('styleShowTab', [true, true, true, true])
    seedHover()

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.style-lib--font .style-item[data-drag-item="0"]').trigger('mouseenter')
    await flushPromises()

    const text = wrapper.find('.style-describe').text()
    expect(text).toContain('正文')
    expect(text).toContain('等线字组')
    expect(text).toContain('字体库')
    expect(text).toContain('等线')
    expect(text).toContain('20点')
    expect(text).toContain('2 个字体')
    expect(text).not.toContain('CMYK')
  })
})

describe('样式页右键菜单（清单 #31-51：四库各不一样）', () => {
  const mounted: Array<{ unmount(): void }> = []

  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    document.body.innerHTML = ''
  })

  /** 页面 + ConfirmHost（确认框在真实布局里由 MainLayout 挂，这里照同样组合挂） */
  function mountPageWithConfirm() {
    const page = mount(StylePage, { global: { plugins: [pinia] } })
    const host = mount(ConfirmHost, { global: { plugins: [pinia] } })
    mounted.push(page, host)
    return page
  }

  function seedColorGroup() {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
      }),
    )
  }

  /** 四库各一组一项：菜单内容与项的形状无关，只要能渲染出组头与项 */
  function seedAllLibs() {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
        gradient: [
          {
            name: '渐变默认分组',
            show: true,
            items: [{ name: '未命名', swatch: 'linear-gradient(180deg, #fff 0%, #000 100%)' }],
          },
        ],
        font: [
          {
            name: '等线字组',
            show: true,
            items: [
              {
                name: '未命名',
                fontPreview: {
                  count: 1,
                  size: '12点',
                  color: '',
                  family: '等线',
                  weight: '',
                  scriptFamily: '',
                },
              },
            ],
          },
        ],
        style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
      }),
    )
  }

  // 菜单与弹窗都 Teleport 到 body，只能从 document 取
  function menuRoot() {
    return document.querySelector<HTMLElement>('.style-menu')
  }
  /**
   * 菜单条目的完整序列，分隔线记作 `—`。
   * 原版 `fg` 渲染成 `<hr class="menu-hr">`（`app.v4.js:319-320`），所以断言必须带位置，
   * 只断言"有哪些文字"会漏掉分隔线错位。
   */
  function menuSequence(): string[] {
    const root = menuRoot()
    if (!root) return []
    return Array.from(root.children).map((el) =>
      el.tagName === 'HR' ? '—' : (el.textContent ?? '').trim(),
    )
  }
  function menuItem(label: string) {
    return Array.from(document.querySelectorAll<HTMLElement>('.style-menu__item')).find(
      (el) => el.textContent?.trim() === label,
    )
  }
  function modalEl() {
    return document.querySelector<HTMLElement>('.modal')
  }
  async function clickModalOk() {
    document.querySelector<HTMLElement>('.modal__btn.is-primary')?.click()
    await flushPromises()
  }
  async function clickModalCancel() {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.modal__btn'))
    buttons.find((el) => !el.classList.contains('is-primary'))?.click()
    await flushPromises()
  }
  async function typeIntoModal(value: string) {
    const input = document.querySelector<HTMLInputElement>('.modal input')
    expect(input).toBeTruthy()
    input!.value = value
    input!.dispatchEvent(new Event('input'))
    await flushPromises()
  }

  /** 默认只显示颜色库；点第 n 个 tab 只留该库（原版 `switchFun` 非 ctrl 时只留自己） */
  async function showLib(page: ReturnType<typeof mountPageWithConfirm>, index: number) {
    if (index === 0) return
    await page.findAll('.g-tabs__label')[index].trigger('click')
    await flushPromises()
  }

  async function rightClickItem(page: ReturnType<typeof mountPageWithConfirm>) {
    await page.find('.style-item').trigger('contextmenu', { clientX: 120, clientY: 80 })
    await flushPromises()
  }
  async function rightClickGroup(page: ReturnType<typeof mountPageWithConfirm>) {
    await page.find('.base-group__head').trigger('contextmenu', { clientX: 120, clientY: 80 })
    await flushPromises()
  }

  // ---------- 四库项菜单：颜色 5 行，其余三库 2 行 ----------

  it('颜色库项菜单：删除 / 重命名 / — / 发送到色板 / 追加到色板（:50324-50366）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()

    expect(menuRoot()).toBeNull()
    await rightClickItem(page)

    expect(menuSequence()).toEqual(['删除', '重命名', '—', '发送到色板', '追加到色板'])
  })

  it('渐变库项菜单：只有 删除 / 重命名（:50800-50819，无色板项、无分隔线）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 1)
    await rightClickItem(page)

    expect(menuSequence()).toEqual(['删除', '重命名'])
  })

  it('字体库项菜单：只有 删除 / 重命名（:51116-51135）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 2)
    await rightClickItem(page)

    expect(menuSequence()).toEqual(['删除', '重命名'])
  })

  it('样式库项菜单：只有 删除 / 重命名（:51563-51579）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 3)
    await rightClickItem(page)

    expect(menuSequence()).toEqual(['删除', '重命名'])
  })

  // ---------- 四库分组菜单：颜色 12 行（4 条分隔线），其余三库 7 行（2 条）----------

  it('颜色库分组菜单：12 行，含色板两项与快速吸色（:50227-50322）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    expect(menuSequence()).toEqual([
      '创建新组',
      '—',
      '删除',
      '重命名',
      '—',
      '发送到色板',
      '追加到色板',
      '—',
      '快速吸色到组',
      '—',
      '发送到仓库...',
      '移动到仓库...',
    ])
  })

  it('渐变库分组菜单：7 行，比颜色库少色板两项与吸色（:50821-50871）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 1)
    await rightClickGroup(page)

    expect(menuSequence()).toEqual([
      '创建新组',
      '—',
      '删除',
      '重命名',
      '—',
      '发送到仓库...',
      '移动到仓库...',
    ])
  })

  it('字体库分组菜单：7 行（:51137-51185）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 2)
    await rightClickGroup(page)

    expect(menuSequence()).toEqual([
      '创建新组',
      '—',
      '删除',
      '重命名',
      '—',
      '发送到仓库...',
      '移动到仓库...',
    ])
  })

  it('样式库分组菜单：7 行（:51581-51626）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await showLib(page, 3)
    await rightClickGroup(page)

    expect(menuSequence()).toEqual([
      '创建新组',
      '—',
      '删除',
      '重命名',
      '—',
      '发送到仓库...',
      '移动到仓库...',
    ])
  })

  it('只有「创建新组」带图标 #iconchuangjian（:50231 / :50825 / :51141 / :51585）', async () => {
    seedAllLibs()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    const icons = Array.from(document.querySelectorAll('.style-menu__icon'))
    expect(icons).toHaveLength(1)
    expect(menuItem('创建新组')!.contains(icons[0])).toBe(true)
  })

  // ---------- 菜单行为 ----------

  it('项菜单：删除先二次确认，取消不删、确认才调 style.deleteItem', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickItem(page)

    menuItem('删除')!.click()
    await flushPromises()

    // 有意偏离原版（原版 :50329-50332 直接删）：先弹确认，且此时还没动库
    expect(modalEl()).toBeTruthy()
    expect(repo.deleteItem).not.toHaveBeenCalled()

    await clickModalCancel()
    expect(repo.deleteItem).not.toHaveBeenCalled()

    await rightClickItem(page)
    menuItem('删除')!.click()
    await flushPromises()
    await clickModalOk()

    expect(repo.deleteItem).toHaveBeenCalledWith('color', 0, 0)
    // 删完重新读库，否则页面上那一项还在
    expect(repo.read.mock.calls.length).toBeGreaterThan(1)
  })

  it('项菜单：重命名 → 输入框提交后调 style.renameItem', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickItem(page)

    menuItem('重命名')!.click()
    await flushPromises()
    expect(document.querySelector<HTMLInputElement>('.modal input')?.placeholder).toBe(
      '请输入颜色名称',
    )

    await typeIntoModal('品牌灰')
    await clickModalOk()

    expect(repo.renameItem).toHaveBeenCalledWith('color', 0, 0, '品牌灰')
  })

  it('项菜单：发送到色板 → style.sendToSwatch（整份替换），不弹确认', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickItem(page)

    menuItem('发送到色板')!.click()
    await flushPromises()

    expect(repo.sendToSwatch).toHaveBeenCalledWith('color', 0, 0)
    expect(modalEl()).toBeNull()
    // 点完菜单自己关掉
    expect(menuRoot()).toBeNull()
  })

  it('项菜单：追加到色板 → style.appendItemToSwatch（读回后 push，不是替换）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickItem(page)

    menuItem('追加到色板')!.click()
    await flushPromises()

    expect(repo.appendItemToSwatch).toHaveBeenCalledWith('color', 0, 0)
    expect(repo.sendToSwatch).not.toHaveBeenCalled()
  })

  it('分组菜单：创建新组 → style.addGroup（插在右键的那个组之后）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    menuItem('创建新组')!.click()
    await flushPromises()
    expect(document.querySelector<HTMLInputElement>('.modal input')?.placeholder).toBe('请输入组名')

    await typeIntoModal('新分组')
    await clickModalOk()

    expect(repo.addGroup).toHaveBeenCalledWith('color', '新分组', 0)
  })

  it('分组菜单：删除 → 二次确认后调 style.deleteGroup', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    menuItem('删除')!.click()
    await flushPromises()
    expect(repo.deleteGroup).not.toHaveBeenCalled()

    await clickModalOk()
    expect(repo.deleteGroup).toHaveBeenCalledWith('color', 0)
  })

  it('分组菜单：重命名回填当前组名，提交后调 style.renameGroup', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    menuItem('重命名')!.click()
    await flushPromises()
    // 原版 :50256 传 getGroupName 回填
    expect(document.querySelector<HTMLInputElement>('.modal input')?.value).toBe('灰白')

    await typeIntoModal('冷灰')
    await clickModalOk()

    expect(repo.renameGroup).toHaveBeenCalledWith('color', 0, '冷灰')
  })

  it('分组菜单：发送到色板 → style.sendGroupToSwatch（整组替换）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    menuItem('发送到色板')!.click()
    await flushPromises()

    expect(repo.sendGroupToSwatch).toHaveBeenCalledWith('color', 0)
  })

  it('分组菜单：追加到色板 → style.appendGroupToSwatch（逐项 push）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    menuItem('追加到色板')!.click()
    await flushPromises()

    expect(repo.appendGroupToSwatch).toHaveBeenCalledWith('color', 0)
    expect(repo.sendGroupToSwatch).not.toHaveBeenCalled()
  })

  it('两项未实现的仓库菜单置灰不可点，title 写明台账编号（T-65）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    for (const label of ['发送到仓库...', '移动到仓库...']) {
      const entry = menuItem(label)!
      expect(entry.classList.contains('is-disabled')).toBe(true)
      expect(entry.getAttribute('aria-disabled')).toBe('true')
      expect(entry.getAttribute('title')).toContain('未实现')
      expect(entry.getAttribute('title')).toContain('T-65')
      entry.click()
    }
    await flushPromises()

    // 点了不做事：命令一个都没跑，菜单也没关
    expect(repo.addGroup).not.toHaveBeenCalled()
    expect(repo.deleteGroup).not.toHaveBeenCalled()
    expect(repo.renameGroup).not.toHaveBeenCalled()
    expect(repo.sendGroupToSwatch).not.toHaveBeenCalled()
    expect(repo.appendGroupToSwatch).not.toHaveBeenCalled()
    expect(modalEl()).toBeNull()
    expect(menuRoot()).not.toBeNull()
  })

  it('快速吸色到组（T-66）可点：切吸色工具 → 吸色完成 → 加到该组', async () => {
    seedColorGroup()
    jsx.style.setTool.mockResolvedValue(null)
    jsx.style.getForegroundColor.mockResolvedValue({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })

    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    const entry = menuItem('快速吸色到组')!
    expect(entry.classList.contains('is-disabled')).toBe(false)
    entry.click()
    await flushPromises()

    expect(jsx.style.setTool).toHaveBeenCalledWith('eyedropperTool')
    expect(repo.appendItem).toHaveBeenCalledWith('color', 0, {
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
  })

  it('右键位置：菜单落在鼠标点（fixed 定位由 CSS 给，坐标走 --floating-x/y）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()

    await page.find('.style-item').trigger('contextmenu', { clientX: 120, clientY: 80 })
    await flushPromises()

    const root = menuRoot()!
    // D-22：坐标不再写内联 left/top，改成 CSS 变量；position:fixed 在 StyleMenu 的样式块里
    expect(root.style.getPropertyValue('--floating-x')).toBe('120px')
    expect(root.style.getPropertyValue('--floating-y')).toBe('80px')
  })

  it('Esc 关闭菜单（useDismiss 统一处理）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickItem(page)
    expect(menuRoot()).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(menuRoot()).toBeNull()
  })
})

describe('组与组之间的间距（清单 #29 #28）', () => {
  const ROOT = process.cwd()
  const CSS = readFileSync(join(ROOT, 'src/pages/style/index.css'), 'utf8')
  const TOKENS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')

  /** 取一条规则的花括号内容（选择器按字面匹配，只用于本文件里已知的写法） */
  function rule(selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = CSS.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))
    expect(match, `index.css 里找不到 ${selector} 规则`).toBeTruthy()
    return (match?.[1] ?? '').replace(/\s+/g, ' ').trim()
  }

  function token(name: string): string {
    const match = TOKENS.match(new RegExp(`--${name}:\\s*([^;]+);`))
    expect(match, `tokens.css 里找不到 --${name}`).toBeTruthy()
    return (match?.[1] ?? '').trim()
  }

  it('组间距挂在组容器上：margin-bottom 4px + 左内边距 10px（原版 .mb4 + .app-padding-wrap）', () => {
    // 先确认 token 值，避免"断言的是变量名、实际值是别的"
    expect(token('sp-2')).toBe('4px')
    expect(token('sp-exact-10')).toBe('10px')

    const group = rule('.style-group')
    expect(group).toContain('margin-bottom: var(--sp-2)')
    expect(group).toContain('padding: 0 0 0 var(--sp-exact-10)')
  })

  it('滚动区不再自己加左右 10px（否则与组容器叠加成 20px）', () => {
    expect(rule('.style-body')).not.toContain('padding')
  })

  it('项间距：横向 5px，样式库 6px（原版 mr6，:51350）；行距逐库 6/5/5/7', () => {
    expect(token('sp-exact-5')).toBe('5px')
    expect(token('sp-3')).toBe('6px')
    expect(token('sp-exact-7')).toBe('7px')

    expect(rule('.style-items')).toContain('gap: var(--sp-exact-5)')
    // 颜色 .mt6
    expect(rule('.style-lib--color .style-items')).toContain('row-gap: var(--sp-3)')
    expect(rule('.style-lib--color .style-items')).toContain('padding-top: var(--sp-3)')
    // 样式 .mt7 / .mr6
    const styleRow = rule('.style-lib--style .style-items')
    expect(styleRow).toContain('column-gap: var(--sp-3)')
    expect(styleRow).toContain('row-gap: var(--sp-exact-7)')
    expect(styleRow).toContain('padding-top: var(--sp-exact-7)')
  })
})

describe('添加按钮不被项的 hover 边框规则连带（原版 .add-svg:hover 只变背景）', () => {
  const ROOT = process.cwd()
  const CSS = readFileSync(join(ROOT, 'src/pages/style/index.css'), 'utf8')

  /** 按「选择器列表 → 声明块」解析，支持逗号分组与换行（Prettier 会把长选择器拆行） */
  function rule(selector: string): string {
    const blocks = CSS.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{[^}]*\}/g) ?? []
    for (const block of blocks) {
      const [selectors, body] = block.split('{')
      if (selectors.split(',').some((part) => part.trim() === selector)) {
        return body.replace(/\s+/g, ' ').trim()
      }
    }
    throw new Error(`index.css 里找不到 ${selector} 规则`)
  }

  it('四库的项 hover 规则都排除 .style-item__add', () => {
    expect(rule('.style-lib--color .style-item:not(.style-item__add):hover')).toContain(
      'border-color: var(--c-swatch-border-hover)',
    )
    expect(rule('.style-lib--font .style-item:not(.style-item__add):hover')).toContain(
      'border-color: var(--c-text-inverse)',
    )
    expect(rule('.style-lib--style .style-item:not(.style-item__add):hover')).toContain(
      'border-color: var(--c-swatch-border-hover-dim)',
    )
    // 不允许再有"不带 :not 的项 hover"——那会把添加按钮一起套上
    expect(CSS).not.toMatch(/\.style-item:hover/)
  })

  it('添加按钮自己的 hover 只改背景（原版四个 scoped 段都是 background-color:#444）', () => {
    const add = rule('.style-item__add:hover')
    expect(add).toContain('background: var(--c-font-btn-hover)')
    expect(add).not.toContain('border')
  })
})

// ---------- 第 5 段：仓库下拉真正可用（切 / 改名 / 删 / 新建 / 点空白收起）----------

describe('样式页第 5 段：仓库下拉', () => {
  const mounted: Array<ReturnType<typeof mount>> = []

  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    document.body.innerHTML = ''
  })

  /** 两个仓库的快照：切换 / 删除都要有多条才有意义 */
  function twoWarehouses(names = ['默认仓库', '客户A']) {
    return {
      index: { index: 0, list: names.map((name) => ({ name })) },
      libraries: libraries(),
      degraded: '',
    }
  }

  /** 页面 + ConfirmHost（删除仓库走 `useConfirmStore` → `ConfirmHost` 里的 CepModal） */
  function mountWithConfirm() {
    const page = mount(StylePage, { global: { plugins: [pinia] } })
    const host = mount(ConfirmHost, { global: { plugins: [pinia] } })
    mounted.push(page, host)
    return page
  }

  async function openDrop(page: ReturnType<typeof mountWithConfirm>) {
    await page.find('.style-warehouse__row').trigger('click')
    await flushPromises()
  }

  /** hover 第 i 行 → 操作区出现（原版 `mouseenter` 置 `showMore`，`:53794-53799`） */
  async function hoverRow(page: ReturnType<typeof mountWithConfirm>, i: number) {
    await page.findAll('.style-warehouse__item')[i].trigger('mouseenter')
    await flushPromises()
  }

  it('点下拉行 → 写索引（切仓库）+ 重读四库 + 关下拉', async () => {
    repo.read.mockResolvedValue(twoWarehouses())
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)
    const readsBefore = repo.read.mock.calls.length

    await page.findAll('.style-warehouse__item')[1].trigger('click')
    await flushPromises()

    expect(repo.selectWarehouse).toHaveBeenCalledWith(1)
    // 切完仓库要重读四个库（原版 `selectWarehouse` → `initData`，`:55008-55011`）
    expect(repo.read.mock.calls.length).toBeGreaterThan(readsBefore)
    expect(page.find('.style-warehouse__down').exists()).toBe(false)
  })

  it('hover 出「重命名」→ 变输入框 → 回车提交写索引 name', async () => {
    repo.read.mockResolvedValue(twoWarehouses())
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)

    // 没 hover 时操作区不渲染（原版 v-show="i == showMore"）
    expect(page.find('.style-warehouse__ops').exists()).toBe(false)

    await hoverRow(page, 1)
    const ops = page.findAll('.style-warehouse__ops')
    expect(ops).toHaveLength(1)
    expect(ops[0].findAll('.style-warehouse__op')).toHaveLength(2)

    await ops[0].findAll('.style-warehouse__op')[0].trigger('click')
    await flushPromises()

    const input = page.find('.style-warehouse__input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('客户A')

    await input.setValue('客户B')
    await input.trigger('keyup.enter')
    await flushPromises()

    expect(repo.renameWarehouse).toHaveBeenCalledWith(1, '客户B')
    expect(page.find('.style-warehouse__input').exists()).toBe(false)
  })

  it('空名回车 → 不写索引，提示「仓库名不能为空」（有意偏离：原版不校验）', async () => {
    repo.read.mockResolvedValue(twoWarehouses())
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)
    await hoverRow(page, 0)
    await page.find('.style-warehouse__op').trigger('click')
    await flushPromises()

    await page.find('.style-warehouse__input').setValue('   ')
    await page.find('.style-warehouse__input').trigger('keyup.enter')
    await flushPromises()

    expect(repo.renameWarehouse).not.toHaveBeenCalled()
    const feedback = useFeedbackStore()
    expect(feedback.toasts.map((t) => t.text)).toContain('仓库名不能为空')
    // 输入框还在，用户可以接着改
    expect(page.find('.style-warehouse__input').exists()).toBe(true)
  })

  it('只剩一个仓库 → 不删、不弹确认，tips「最少保留一个分组哦」（原版 f_delete :53978-53987）', async () => {
    repo.read.mockResolvedValue(twoWarehouses(['唯一仓库']))
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)
    await hoverRow(page, 0)

    const ops = page.findAll('.style-warehouse__op')
    await ops[1].trigger('click')
    await flushPromises()

    expect(repo.deleteWarehouse).not.toHaveBeenCalled()
    expect(document.querySelector('.modal')).toBeNull()
    const feedback = useFeedbackStore()
    expect(feedback.toasts.map((t) => t.text)).toContain('最少保留一个分组哦')
  })

  it('两个仓库时删：二次确认后才写索引（确认文案写明文件进回收目录）', async () => {
    repo.read.mockResolvedValue(twoWarehouses())
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)
    await hoverRow(page, 0)

    await page.findAll('.style-warehouse__op')[1].trigger('click')
    await flushPromises()

    const modal = document.querySelector<HTMLElement>('.modal')
    expect(modal).not.toBeNull()
    expect(modal?.textContent).toContain('.deleted-')
    expect(repo.deleteWarehouse).not.toHaveBeenCalled()

    document.querySelector<HTMLElement>('.modal__btn.is-primary')?.click()
    await flushPromises()

    expect(repo.deleteWarehouse).toHaveBeenCalledWith(0)
  })

  it('「创建新分组」→ 新建仓库后直接进入编辑态（原版 f_add :53968-53974）', async () => {
    repo.read.mockResolvedValueOnce(twoWarehouses())
    repo.read.mockResolvedValue(twoWarehouses(['默认仓库', '客户A', '未命名分组']))
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)

    await page.find('.style-warehouse__add').trigger('click')
    await flushPromises()

    expect(repo.addWarehouse).toHaveBeenCalled()
    const input = page.find('.style-warehouse__input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('未命名分组')
  })

  it('点空白收起（用 useDismiss，不新造全局状态）', async () => {
    repo.read.mockResolvedValue(twoWarehouses())
    const page = mountWithConfirm()
    await flushPromises()
    await openDrop(page)
    expect(page.find('.style-warehouse__down').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushPromises()

    expect(page.find('.style-warehouse__down').exists()).toBe(false)
  })
})

// ---------- 拖拽排序（原版 am() 机制，见 composables/useLongPressDrag）----------

/** jsdom 没有布局：落点判定要用的 offsetWidth/Height/Left/Top 全部假造 */
function setGeometry(
  element: HTMLElement,
  box: { left?: number; top?: number; width?: number; height?: number },
): void {
  Object.defineProperty(element, 'offsetLeft', { configurable: true, value: box.left ?? 0 })
  Object.defineProperty(element, 'offsetTop', { configurable: true, value: box.top ?? 0 })
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: box.width ?? 0 })
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: box.height ?? 0 })
}

/** 颜色库两组各两项：c00 c01 / c10 c11 */
function twoGroups() {
  return snapshot({
    color: [
      { name: '组一', show: true, items: [{ name: 'c00' }, { name: 'c01' }] },
      { name: '组二', show: true, items: [{ name: 'c10' }, { name: 'c11' }] },
    ],
  })
}

async function mountTwoGroups() {
  repo.read.mockResolvedValue(twoGroups())
  const page = mountPage()
  await flushPromises()
  return page
}

/**
 * 一次完整的长按拖拽：`mousedown` → 300ms（`before`）→ 50ms（建克隆、挂判定）→ 落到目标 → 抬起。
 *
 * 假时钟只在拖拽这一段用：`flushPromises` 自己靠 `setTimeout(0)`，全程假时钟会挂住，
 * 所以挂载阶段用真时钟，拖完再切回来。
 */
async function longPressDrag(
  from: HTMLElement,
  to: HTMLElement,
  options: { ctrlKey?: boolean; clientX?: number; clientY?: number } = {},
): Promise<void> {
  const { ctrlKey = true, clientX = 20, clientY = 20 } = options
  from.dispatchEvent(new MouseEvent('mousedown', { ctrlKey, bubbles: true }))
  vi.advanceTimersByTime(300)
  await nextTick()
  vi.advanceTimersByTime(50)
  to.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }))
  document.dispatchEvent(new MouseEvent('mouseup'))
  vi.useRealTimers()
  await flushPromises()
}

describe('样式页拖拽排序', () => {
  it('项拖拽：ctrl 长按后拖到同组下一项之后，只写一次盘（原版 drag Callback :50052-50069）', async () => {
    const page = await mountTwoGroups()
    const items = page.findAll('.style-item[data-drag-item]')
    expect(items).toHaveLength(4)

    const from = items[0].element as HTMLElement
    const to = items[1].element as HTMLElement
    setGeometry(from, { width: 25, height: 25 })
    setGeometry(to, { width: 25, height: 25 })

    vi.useFakeTimers()
    await longPressDrag(from, to)

    expect(repo.moveItemTo).toHaveBeenCalledTimes(1)
    expect(repo.moveItemTo).toHaveBeenCalledWith('color', {
      from: { group: 0, index: 0 },
      to: { group: 0, index: 1 },
      position: 'after',
    })
  })

  it('项拖拽跨组：落点带目标组下标，插在目标项之前（指针在左半）', async () => {
    const page = await mountTwoGroups()
    const items = page.findAll('.style-item[data-drag-item]')
    const from = items[0].element as HTMLElement
    const to = items[3].element as HTMLElement
    setGeometry(from, { width: 25, height: 25 })
    setGeometry(to, { width: 25, height: 25 })

    vi.useFakeTimers()
    // clientX = 0 且中线 12.5 → 左半 = 插前
    await longPressDrag(from, to, { clientX: 0 })

    expect(repo.moveItemTo).toHaveBeenCalledTimes(1)
    expect(repo.moveItemTo).toHaveBeenCalledWith('color', {
      from: { group: 0, index: 0 },
      to: { group: 1, index: 1 },
      position: 'before',
    })
  })

  it('没按 ctrl/meta：长按再久也不起拖、不写盘（原版 am() 闸门 :37418）', async () => {
    const page = await mountTwoGroups()
    const items = page.findAll('.style-item[data-drag-item]')
    const from = items[0].element as HTMLElement
    const to = items[1].element as HTMLElement
    setGeometry(from, { width: 25, height: 25 })
    setGeometry(to, { width: 25, height: 25 })

    vi.useFakeTimers()
    await longPressDrag(from, to, { ctrlKey: false })

    expect(document.querySelector('.drag-hidden')).toBeNull()
    expect(repo.moveItemTo).not.toHaveBeenCalled()
  })

  it('组拖拽：起拖时该组折叠（原版 before() :50086-50088），落到另一组后只写一次盘', async () => {
    const page = await mountTwoGroups()
    const groups = page.findAll('.style-group')
    expect(groups).toHaveLength(2)

    const from = groups[0].element as HTMLElement
    const to = groups[1].element as HTMLElement
    setGeometry(from, { width: 200, height: 22 })
    setGeometry(to, { width: 200, height: 22, top: 100 })

    vi.useFakeTimers()
    from.dispatchEvent(new MouseEvent('mousedown', { ctrlKey: true, bubbles: true }))

    // 300ms：before() 折叠被拖的组 → 它的项从 DOM 里消失
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(groups[0].find('.style-items').exists()).toBe(false)
    expect(groups[1].find('.style-items').exists()).toBe(true)

    // 50ms：进入拖拽态；指针落在第二组下半 → 插到它后面
    vi.advanceTimersByTime(50)
    to.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 120, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    vi.useRealTimers()
    await flushPromises()

    expect(repo.moveGroupTo).toHaveBeenCalledTimes(1)
    expect(repo.moveGroupTo).toHaveBeenCalledWith('color', 0, 1, 'after')
  })

  it('组拖拽落回自己：不写盘（原版 if (t != moveEndIndex) :50095）', async () => {
    const page = await mountTwoGroups()
    const groups = page.findAll('.style-group')
    const from = groups[0].element as HTMLElement
    setGeometry(from, { width: 200, height: 22 })

    vi.useFakeTimers()
    await longPressDrag(from, from, { clientY: 20 })

    expect(repo.moveGroupTo).not.toHaveBeenCalled()
    // 折叠只是拖拽期的视图状态，没写盘就要还原
    await flushPromises()
    expect(groups[0].find('.style-items').exists()).toBe(true)
  })

  it('拖拽提示：颜色库内容区带 shift/alt/ctrl 说明，样式库挂在组容器上（原版 :49955 / :51316）', async () => {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '组一', show: true, items: [{ name: 'c00' }] }],
        style: [{ name: '样式组', show: true, items: [{ name: 's0' }] }],
      }),
    )
    const page = mountPage()
    await flushPromises()

    // 颜色库：整库一层 + 内容区一层（内容区那句带 shift / alt）
    expect(page.find('.style-lib--color').attributes('title')).toBe('按住ctrl拖拽位置')
    expect(page.find('.style-lib--color .style-items').attributes('title')).toBe(
      'shift+点击设置描边，alt+点击更改颜色，按住ctrl拖拽位置',
    )
    // 颜色库的组容器不重复挂
    expect(page.find('.style-lib--color .style-group').attributes('title')).toBeUndefined()

    await page.findAll('.g-tabs__label')[3].trigger('click')
    await flushPromises()

    // 样式库没有"整库外层"，提示挂在组容器上
    expect(page.find('.style-lib--style').attributes('title')).toBeUndefined()
    expect(page.find('.style-lib--style .style-group').attributes('title')).toBe('按住ctrl拖拽位置')
  })
})
