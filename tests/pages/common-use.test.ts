import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

/**
 * T-88a：常用页外壳 + 网格区。
 *
 * 只测可观察结果：三态渲染、网格从投影派生、点击发什么命令。
 * 不测布局坐标（jsdom 没有），也不测"看起来对不对"。
 */

const commands = vi.hoisted(() => ({
  zoom: vi.fn(async () => true),
  flip: vi.fn(async () => true),
  setCollapsed: vi.fn(async () => true),
  correctBlur: vi.fn(async () => true),
  layerReplace: vi.fn(async () => true),
  locationTrade: vi.fn(async () => true),
  exchangeLayerColor: vi.fn(async () => true),
  move: vi.fn(async () => true),
  embedImage: vi.fn(async () => true),
  embedMultipleImages: vi.fn(async () => true),
  importMultipleImages: vi.fn(async () => true),
  optimizeOnce: vi.fn(async () => true),
  exportImages: vi.fn(async () => true),
  swapWireframeFill: vi.fn(async () => true),
  setOption: vi.fn(async () => true),
  addToPanel: vi.fn(async (_payload: unknown) => true),
}))

/** 每个用例换一份新的响应式假 store（`storeToRefs` 需要真响应式对象） */
interface FakeStore {
  tiles: Ref<unknown[]>
  collapsed: Ref<Record<string, boolean>>
  options: Ref<Record<string, unknown>>
  loading: Ref<boolean>
  error: Ref<string>
  degraded: Ref<string>
  load: () => Promise<void>
  loadOptions: () => Promise<void>
  loadCollapsed: () => void
}

let store!: FakeStore

vi.mock('@/stores/common-use', () => ({ useCommonUseStore: () => store }))

// 页面右键只读 locks[0].id（官方 $freePanelBox.show 的弹层我们还没有，D-45）
vi.mock('@/stores/free-panel', () => ({
  useFreePanelStore: () => ({ blocks: [{ id: 'b1' }] }),
}))

vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => {
    const map: Record<string, unknown> = {
      'commonUse.zoom': commands.zoom,
      'commonUse.setCollapsed': commands.setCollapsed,
      'commonUse.correctBlur': commands.correctBlur,
      'commonUse.layerReplace': commands.layerReplace,
      'commonUse.locationTrade': commands.locationTrade,
      'commonUse.exchangeLayerColor': commands.exchangeLayerColor,
      'commonUse.move': commands.move,
      'commonUse.embedImage': commands.embedImage,
      'commonUse.embedMultipleImages': commands.embedMultipleImages,
      'commonUse.importMultipleImages': commands.importMultipleImages,
      'commonUse.optimizeOnce': commands.optimizeOnce,
      'commonUse.exportImages': commands.exportImages,
      'commonUse.swapWireframeFill': commands.swapWireframeFill,
      'commonUse.setOption': commands.setOption,
      'freePanel.add': commands.addToPanel,
    }
    return {
      run: map[id] ?? commands.flip,
      disabled: false,
      running: false,
      command: undefined,
    }
  },
}))
const { useFeedbackStore } = await import('@/stores/feedback')
const Page = (await import('@/pages/commonUse/index.vue')).default

function tile(index: number, name: string, extra: Record<string, unknown> = {}) {
  return {
    id: `t${index}`,
    index,
    name,
    title: `${name} 的提示`,
    icon: { rest: '#icona', filled: null },
    isMore: false,
    ismark: false,
    visible: true,
    moreId: '',
    comName: null,
    ...extra,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  // pinia setup store 的形态：状态一律是 ref，storeToRefs 才拿得到
  store = {
    tiles: ref([] as unknown[]),
    collapsed: ref({}),
    loading: ref(false),
    error: ref(''),
    degraded: ref(''),
    options: ref({}),
    load: vi.fn(async () => {}),
    loadOptions: vi.fn(async () => {}),
    loadCollapsed: vi.fn(),
  }
  commands.zoom.mockClear()
  commands.flip.mockClear()
  commands.setCollapsed.mockClear()
  commands.correctBlur.mockClear()
  commands.layerReplace.mockClear()
  commands.locationTrade.mockClear()
  commands.exchangeLayerColor.mockClear()
  commands.move.mockClear()
})

describe('三种状态', () => {
  it('加载中：显示 spinner，不渲染网格', () => {
    store.loading.value = true
    const wrapper = mount(Page)

    expect(wrapper.find('.page-common-use__loading').exists()).toBe(true)
    expect(wrapper.find('.page-common-use__grid').exists()).toBe(false)
  })

  it('空列表：EmptyState + 文案', () => {
    const wrapper = mount(Page)

    expect(wrapper.text()).toContain('还没有常用功能')
    expect(wrapper.find('.page-common-use__grid').exists()).toBe(false)
  })

  it('degraded 非空：页内联提示，且仍然渲染网格', () => {
    store.degraded.value = '常用项文件损坏'
    store.tiles.value = [tile(0, '嵌入图片')]

    const wrapper = mount(Page)

    expect(wrapper.find('.page-common-use__warn').text()).toContain('常用项文件损坏')
    expect(wrapper.find('.page-common-use__grid').exists()).toBe(true)
  })

  it('error 非空：内联错误 + 重试按钮，不显示网格', () => {
    store.error.value = '读取失败'
    const wrapper = mount(Page)

    expect(wrapper.find('.page-common-use__error').text()).toContain('读取失败')
    expect(wrapper.text()).toContain('重试')
    expect(wrapper.find('.page-common-use__grid').exists()).toBe(false)
  })
})

describe('网格区', () => {
  it('按投影顺序渲染，一个格子一个 UseGridItem，角标只出在 ismark 那格', () => {
    store.tiles.value = [
      tile(0, '嵌入图片'),
      tile(1, '优化文档', { ismark: true }),
      tile(2, '导出图片'),
    ]

    const wrapper = mount(Page)

    expect(wrapper.findAll('.use-grid-item')).toHaveLength(3)
    expect(wrapper.findAll('.use-grid-item__text').map((el) => el.text())).toEqual([
      '嵌入图片',
      '优化文档',
      '导出图片',
    ])
    expect(wrapper.findAll('.use-grid-item__mark')).toHaveLength(1)
  })

  it('点预设按钮发 commonUse.zoom，倍数就是按钮上的数', async () => {
    const wrapper = mount(Page)
    const preset = wrapper.findAll('button').find((btn) => btn.text() === '105')

    expect(preset, '应能找到 105 这颗预设').toBeTruthy()
    await preset!.trigger('click')

    expect(commands.zoom).toHaveBeenCalledWith({ scale: 105 })
  })

  it('6 颗翻转按钮各发自己的方向文本', async () => {
    const wrapper = mount(Page)
    const buttons = wrapper.findAll('.page-common-use__flip button')

    expect(buttons).toHaveLength(6)
    expect(buttons.map((btn) => btn.attributes('title'))).toEqual([
      '左右翻转',
      '上下翻转',
      '向左翻转',
      '向右翻转',
      '向下翻转',
      '向上翻转',
    ])

    await buttons[1].trigger('click')
    expect(commands.flip).toHaveBeenCalledWith({ direction: '上下' })
  })
})

describe('展开面板（T-88b）', () => {
  it('点可展开格：面板出现在该行下方，并把折叠态写成"展开"', async () => {
    store.tiles.value = [tile(0, '自定义变换', { isMore: true, comName: 'comcustomChange' })]
    const wrapper = mount(Page)
    await flushPromises() // onMounted 里先 await store.load() 才恢复展开态

    await wrapper.find('.use-grid-item').trigger('click')

    expect(wrapper.find('.page-common-use__panel').exists()).toBe(true)
    expect(commands.setCollapsed).toHaveBeenCalledWith({ id: 't0', collapsed: false })
  })

  it('再点同一格：面板收起，折叠态写成"收起"（官方 openfun 再点收起，:38193）', async () => {
    store.tiles.value = [tile(0, '自定义变换', { isMore: true, comName: 'comcustomChange' })]
    const wrapper = mount(Page)
    await flushPromises() // onMounted 里先 await store.load() 才恢复展开态

    await wrapper.find('.use-grid-item').trigger('click')
    await wrapper.find('.use-grid-item').trigger('click')

    expect(wrapper.find('.page-common-use__panel').exists()).toBe(false)
    expect(commands.setCollapsed).toHaveBeenLastCalledWith({ id: 't0', collapsed: true })
  })

  it('点不可展开格：没有面板、也不写折叠态', async () => {
    store.tiles.value = [tile(0, '修正模糊')]
    const wrapper = mount(Page)
    await flushPromises() // onMounted 里先 await store.load() 才恢复展开态

    await wrapper.find('.use-grid-item').trigger('click')

    expect(wrapper.find('.page-common-use__panel').exists()).toBe(false)
    expect(commands.setCollapsed).not.toHaveBeenCalled()
  })

  it('同时只开一个：开第二格时第一格面板消失', async () => {
    store.tiles.value = [
      tile(0, '自定义变换', { isMore: true, comName: 'comcustomChange' }),
      tile(1, '参考线工具', { isMore: true, comName: 'comreference' }),
    ]
    const wrapper = mount(Page)
    await flushPromises()
    const items = wrapper.findAll('.use-grid-item')

    await items[0].trigger('click')
    expect(wrapper.findAll('.page-common-use__panel')).toHaveLength(1)

    await items[1].trigger('click')
    expect(wrapper.findAll('.page-common-use__panel')).toHaveLength(1)
    expect(wrapper.find('.panel-reference').exists()).toBe(true)
    expect(wrapper.find('.panel-custom').exists()).toBe(false)
  })

  it('文件里记过 collapsed:false 的那一格启动即展开', async () => {
    store.tiles.value = [tile(0, '自定义变换', { isMore: true, comName: 'comcustomChange' })]
    store.collapsed.value = { t0: false }

    const wrapper = mount(Page)
    await flushPromises()

    expect(wrapper.find('.page-common-use__panel').exists()).toBe(true)
  })
})

describe('4 个直连格子（A1）', () => {
  const cases: Array<[string, keyof typeof commands]> = [
    ['修正模糊', 'correctBlur'],
    ['元素替换', 'layerReplace'],
    ['位置对换', 'locationTrade'],
    ['图层颜色互换', 'exchangeLayerColor'],
  ]

  it.each(cases)('点「%s」→ 调 %s 命令且不带参数', async (name, fn) => {
    store.tiles.value = [tile(0, name as string)]
    const wrapper = mount(Page)
    await flushPromises()

    await wrapper.find('.use-grid-item').trigger('click')

    expect(commands[fn]).toHaveBeenCalledTimes(1)
    expect(commands[fn]).toHaveBeenCalledWith()
    // 不是展开面板的路子，也不会误写折叠态
    expect(commands.setCollapsed).not.toHaveBeenCalled()
  })
})

describe('A2：显隐立刻反映在网格', () => {
  it('visible:false 的项不进网格（隐藏项在设置页管）', async () => {
    store.tiles.value = [tile(0, '嵌入图片'), tile(1, '修正模糊', { visible: false })]
    const wrapper = mount(Page)
    await flushPromises()

    const names = wrapper.findAll('.use-grid-item__text').map((el) => el.text())
    expect(names).toEqual(['嵌入图片'])
  })
})

describe('A3：长按拖拽排序', () => {
  /** 完整链路：mousedown(ctrl) → 300ms → 50ms → 目标 mousemove → document mouseup（同 /style 范本） */
  async function dragTile(from: number, to: number, ctrlKey = true, root?: HTMLElement) {
    const items = (root ?? document).querySelectorAll('.use-grid-item')
    const source = items[from] as HTMLElement
    const target = items[to] as HTMLElement
    source.dispatchEvent(new MouseEvent('mousedown', { ctrlKey, bubbles: true }))
    vi.advanceTimersByTime(300)
    await nextTick()
    vi.advanceTimersByTime(50)
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 30, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    vi.useRealTimers()
    await flushPromises()
  }

  it('ctrl 长按拖到第 3 格之后 → move({from:0,to:2,position:"after"})，且只写一次', async () => {
    store.tiles.value = [tile(0, '嵌入图片'), tile(1, '修正模糊'), tile(2, '元素替换')]
    const wrapper = mount(Page)
    await flushPromises()

    vi.useFakeTimers()
    await dragTile(0, 2, true, wrapper.element as HTMLElement)

    expect(commands.move).toHaveBeenCalledTimes(1)
    expect(commands.move).toHaveBeenCalledWith({ from: 0, to: 2, position: 'after' })
    expect(commands.setCollapsed).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('没按 ctrl：闸门不过，不进拖拽态也不发命令', async () => {
    store.tiles.value = [tile(0, '嵌入图片'), tile(1, '修正模糊')]
    const w1 = mount(Page)
    await flushPromises()

    vi.useFakeTimers()
    await dragTile(0, 1, false, w1.element as HTMLElement)

    expect(commands.move).not.toHaveBeenCalled()
  })

  it('拖到自己身上：不写盘', async () => {
    store.tiles.value = [tile(0, '嵌入图片'), tile(1, '修正模糊')]
    const w2 = mount(Page)
    await flushPromises()

    vi.useFakeTimers()
    await dragTile(0, 0, true, w2.element as HTMLElement)

    expect(commands.move).not.toHaveBeenCalled()
  })
})

describe('T-97-1：14 格左键逐格断言（对齐官方 :37894 分派表）', () => {
  type Case = {
    name: string
    comName?: string
    command?: string
    expand?: boolean
    toggle?: string
  }
  const CASES: Case[] = [
    { name: '嵌入图片', comName: 'comembed', command: 'embedImage' },
    { name: '嵌入多图片', command: 'embedMultipleImages' },
    { name: '导入多图片', comName: 'comimport', command: 'importMultipleImages' },
    { name: '自动填充颜色', toggle: 'cyAutoFillColor' },
    { name: '修正模糊', command: 'correctBlur' },
    { name: '填充线框互换', command: 'swapWireframeFill' },
    { name: '优化文档', comName: 'comoptimization', command: 'optimizeOnce' },
    { name: '自定义变换', comName: 'comcustomChange', expand: true },
    { name: '参考线工具', comName: 'comreference', expand: true },
    { name: '按间距分布', comName: 'comspacing', expand: true },
    { name: '导出图片', comName: 'comexport', command: 'exportImages' },
    { name: '元素替换', command: 'layerReplace' },
    { name: '位置对换', command: 'locationTrade' },
    { name: '图层颜色互换', command: 'exchangeLayerColor' },
  ]

  it.each(CASES)('$name → 按官方分派表执行', async (item) => {
    store.tiles.value = [
      tile(0, item.name, item.comName ? { comName: item.comName, isMore: true } : {}),
    ]
    const wrapper = mount(Page)
    await flushPromises()

    await wrapper.find('.use-grid-item').trigger('click')
    await flushPromises()

    if (item.expand) {
      expect(wrapper.find('.page-common-use__panel').exists()).toBe(true)
      expect(commands.setCollapsed).toHaveBeenCalledWith({ id: 't0', collapsed: false })
      return
    }
    if (item.toggle) {
      expect(commands.setOption).toHaveBeenCalledWith({ path: item.toggle, value: true })
      expect(wrapper.find('.page-common-use__panel').exists()).toBe(false)
      expect(commands.setCollapsed).not.toHaveBeenCalled()
      return
    }
    expect(commands[item.command as keyof typeof commands]).toHaveBeenCalledTimes(1)
    // 官方这 10 格都不展开面板
    expect(wrapper.find('.page-common-use__panel').exists()).toBe(false)
  })
})

describe('T-97-1b：右键三层（图标区 → 展开；其它区 → 加入自由面板）', () => {
  it('图标块右键 → 展开面板（官方 .context-svg-wrap 的 open，:35682）', async () => {
    store.tiles.value = [tile(0, '自定义变换', { isMore: true, comName: 'comcustomChange' })]
    const wrapper = mount(Page)
    await flushPromises()

    await wrapper.find('.use-grid-item__icon').trigger('contextmenu')
    await flushPromises()

    expect(wrapper.find('.page-common-use__panel').exists()).toBe(true)
    expect(commands.setCollapsed).toHaveBeenCalledWith({ id: 't0', collapsed: false })
    // `.stop`：图标区右键不许冒泡到外层的"加入自由面板"
    expect(commands.addToPanel).not.toHaveBeenCalled()
  })

  it('格子其它区域右键 → 加入自由面板（官方 .context-one-wrap 的 fpFunction，:35648）', async () => {
    store.tiles.value = [tile(0, '修正模糊')]
    const wrapper = mount(Page)
    await flushPromises()

    await wrapper.find('.use-grid-item').trigger('contextmenu')
    await flushPromises()

    expect(commands.addToPanel).toHaveBeenCalledTimes(1)
    expect(commands.addToPanel.mock.calls[0][0]).toMatchObject({
      blockId: 'b1',
      items: [{ text: '修正模糊', key: expect.any(String) }],
    })
    expect(commands.setCollapsed).not.toHaveBeenCalled()
  })

  it('两条官方提示：自动填充颜色 / 有子面板的格子 → 只提示，不加入', async () => {
    store.tiles.value = [tile(0, '自动填充颜色'), tile(1, '嵌入图片', { comName: 'comembed' })]
    const wrapper = mount(Page)
    await flushPromises()

    const items = wrapper.findAll('.use-grid-item')
    await items[0].trigger('contextmenu')
    await items[1].trigger('contextmenu')
    await flushPromises()

    expect(commands.addToPanel).not.toHaveBeenCalled()
    const texts = useFeedbackStore().toasts.map((t) => t.text)
    expect(texts).toContain('不支持添加自定义面板')
    expect(texts).toContain('请添加展开后的功能')
  })
})

describe('T-97-3：点格子那条路径的 bLink2 是官方原值直传', () => {
  it('嵌入图片格子 → bLink2 = cyLinkObject 原值、bDelete = cyDeleteNext 原值（官方 :37751-37755）', async () => {
    store.options.value = { cyLinkObject: 'sameFolder', cyDeleteNext: false }
    store.tiles.value = [tile(0, '嵌入图片', { isMore: true, comName: 'comembed' })]
    const wrapper = mount(Page)
    await flushPromises()

    await wrapper.find('.use-grid-item').trigger('click')
    await flushPromises()

    expect(commands.embedImage).toHaveBeenCalledWith({
      options: { path: '', bLink2: 'sameFolder', bDelete: false },
    })
  })
})
