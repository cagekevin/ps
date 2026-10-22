import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPref } from '@/cep/data/settings'
import type { KuGroup, KuKind } from '@/domain/style-library'

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
  styleIndexRepo: repo.indexRepo,
}))

// 图片型渐变的 src 要拼 <userDir>/Gradient/<fileName>；jsdom 里没有 Node，userDir() 会抛 NO_NODE
const fsMock = vi.hoisted(() => ({ userDir: vi.fn(() => 'C:/Users/u/AppData/Roaming/SheJiZhuLi') }))
vi.mock('@/cep/fs', () => ({ userDir: fsMock.userDir }))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
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
  },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

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

    expect(wrapper.text()).toContain('样式库还是空的')
    expect(wrapper.find('.style-warehouse').text()).toContain('我的样式仓库')
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
    expect(wrapper.text()).not.toContain('样式库还是空的')
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

    expect(wrapper.findAll('.style-warehouse__item-name').map((n) => n.text())).toEqual([
      '默认仓库',
      '客户A',
    ])

    // 原版每行都渲染一个 svg-14：选中是勾，其余留空位对齐
    const checks = wrapper.findAll('.style-warehouse__check')
    expect(checks).toHaveLength(2)
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

  it('颜色库分组菜单：12 行，含色板两项与置灰的快速吸色（:50227-50322）', async () => {
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

  it('三项未实现的菜单项置灰不可点，title 写明台账编号', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()
    await rightClickGroup(page)

    // 快速吸色到组 = T-66（依赖 PS 事件 1936028772）；仓库两项 = T-65
    const entries: Array<[string, string]> = [
      ['快速吸色到组', 'T-66'],
      ['发送到仓库...', 'T-65'],
      ['移动到仓库...', 'T-65'],
    ]
    for (const [label, id] of entries) {
      const entry = menuItem(label)!
      expect(entry.classList.contains('is-disabled')).toBe(true)
      expect(entry.getAttribute('aria-disabled')).toBe('true')
      expect(entry.getAttribute('title')).toContain('未实现')
      expect(entry.getAttribute('title')).toContain(id)
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

  it('右键位置：菜单落在鼠标点（fixed 定位，左上角对齐 clientX/clientY）', async () => {
    seedColorGroup()
    const page = mountPageWithConfirm()
    await flushPromises()

    await page.find('.style-item').trigger('contextmenu', { clientX: 120, clientY: 80 })
    await flushPromises()

    const root = menuRoot()!
    expect(root.style.position).toBe('fixed')
    expect(root.style.left).toBe('120px')
    expect(root.style.top).toBe('80px')
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
