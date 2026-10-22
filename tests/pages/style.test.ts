import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setPref } from '@/cep/data/settings'
import type { KuGroup, KuKind } from '@/domain/style-library'

/**
 * 三态测试：加载 / 空库 / 读失败（含重试）；第 2 段再加"应用/添加经 useCommand 接线"。
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
  indexRepo: { read: vi.fn() },
}))

vi.mock('@/cep/data/style-library-repo', () => ({
  readStyleLibrary: repo.read,
  readKuItem: repo.readItem,
  readKuGroupId: repo.readGroupId,
  addKuItem: repo.appendItem,
  replaceKuItem: repo.replaceItem,
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
