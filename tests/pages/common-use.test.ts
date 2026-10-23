import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
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
}))

/** 每个用例换一份新的响应式假 store（`storeToRefs` 需要真响应式对象） */
interface FakeStore {
  tiles: Ref<unknown[]>
  collapsed: Ref<Record<string, boolean>>
  loading: Ref<boolean>
  error: Ref<string>
  degraded: Ref<string>
  load: () => Promise<void>
  loadCollapsed: () => void
}

let store!: FakeStore

vi.mock('@/stores/common-use', () => ({ useCommonUseStore: () => store }))

vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => ({
    run: id === 'commonUse.zoom' ? commands.zoom : commands.flip,
    disabled: false,
    running: false,
    command: undefined,
  }),
}))

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
    load: vi.fn(async () => {}),
    loadCollapsed: vi.fn(),
  }
  commands.zoom.mockClear()
  commands.flip.mockClear()
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

  it('本刀格子没有点击行为：不发任何命令（面板接线在 T-88b）', async () => {
    store.tiles.value = [tile(0, '嵌入图片')]
    const wrapper = mount(Page)

    await wrapper.find('.use-grid-item').trigger('click')

    expect(commands.zoom).not.toHaveBeenCalled()
    expect(commands.flip).not.toHaveBeenCalled()
  })
})
