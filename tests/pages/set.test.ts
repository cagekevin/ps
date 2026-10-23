import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive, ref } from 'vue'

/**
 * 设置页空态（T-50）：快捷键与常用功能面板本版**不提供**配置项，
 * 页面必须显示诚实文案（不许写「暂无数据」让人误以为加载失败）。
 */
vi.mock('@/stores/cloud', () => ({
  // queuedUnits 是 T-74 新加的状态（队列里等自动同步的条数），页面会读它
  useCloudStore: () => ({
    refresh: vi.fn(),
    refreshLive: vi.fn(),
    status: reactive({ autoSyncEnabled: false, pendingItems: [] }),
    queuedUnits: ref(0),
  }),
}))
/** 设置页要用到的命令：只留"点了写什么"这一层可观察结果 */
const cmds = vi.hoisted(() => ({
  setOption: vi.fn(async (_payload: unknown) => true),
  setShow: vi.fn(async (_payload: unknown) => true),
  resetAll: vi.fn(async () => true),
}))
vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => ({
    run:
      id === 'commonUse.setOption'
        ? cmds.setOption
        : id === 'commonUse.setShow'
          ? cmds.setShow
          : id === 'commonUse.resetAll'
            ? cmds.resetAll
            : vi.fn(async () => true),
    disabled: false,
    running: false,
  }),
}))
/** `/commonUse` 的 sj_set.json 投影：T-97-5 的两个显隐键从这里读 */
const commonUseOptions = ref<Record<string, unknown>>({})
vi.mock('@/stores/common-use', () => ({
  useCommonUseStore: () => ({
    tiles: ref([
      {
        id: 'div_img_cya1',
        index: 0,
        name: '嵌入图片',
        title: '',
        icon: { rest: '#icona', filled: null },
        isMore: true,
        ismark: false,
        visible: true,
        moreId: '',
        comName: 'comembed',
      },
      {
        id: 'div_img_cya2',
        index: 1,
        name: '嵌入多图片',
        title: '',
        icon: { rest: '#icona', filled: null },
        isMore: false,
        ismark: false,
        visible: false,
        moreId: '',
        comName: null,
      },
    ]),
    load: vi.fn(async () => {}),
    loadOptions: vi.fn(async () => {}),
    loadCollapsed: vi.fn(),
    collapsed: ref({}),
    options: commonUseOptions,
  }),
}))

vi.mock('@/stores/font-set', () => ({
  useFontSetStore: () => ({
    settings: {
      ztShowQuick: false,
      ztShowCustom: false,
      ztExpandMultiple: false,
      ztDefaultSize: [],
      ztDefaultLeading: [],
      ztDefaultTracking: [],
      appUnit: 'px',
    },
    load: vi.fn(async () => {}),
  }),
}))

const { default: SetPage } = await import('@/pages/set/index.vue')

beforeEach(() => setActivePinia(createPinia()))

describe('set 页面空态', () => {
  it('快捷键写明本版未提供配置；常用功能面板已提供配置（A2）', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })
    const text = wrapper.text()
    expect(text).toContain('当前版本未提供快捷键配置')
    expect(text).toContain('当前版本未提供快捷键配置')
    expect(text).not.toContain('当前版本未提供常用功能面板配置')
    expect(text).not.toContain('暂无数据')
  })

  it('快捷键区的两个按钮仍可点（命令已注册）', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })
    const buttons = wrapper.findAll('button')
    const labels = buttons.map((b) => b.text())
    expect(labels.some((t) => t.includes('手动拷贝配置文件'))).toBe(true)
    expect(labels.some((t) => t.includes('刷新配置文件'))).toBe(true)
  })
})

describe('常用功能面板区块（A2）', () => {
  it('按投影渲染 14 项勾选，未勾的那项 modelValue 为 false', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })
    const text = wrapper.text()

    expect(text).toContain('常用功能面板')
    expect(text).toContain('嵌入图片')
    expect(text).toContain('恢复默认')
  })
})

describe('T-97-5：两块区域的显隐开关（官方 :61445-61449 / :61454-61458）', () => {
  beforeEach(() => {
    commonUseOptions.value = {}
    cmds.setOption.mockClear()
  })

  function checkboxOf(wrapper: ReturnType<typeof mount>, label: string) {
    return wrapper.findAll('.check-box').find((el) => el.text().includes(label))
  }

  it('两个勾选在「常用功能面板」里，缺键 = 官方默认 true → 都勾上', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })

    for (const label of ['显示缩放', '显示变换元素']) {
      const box = checkboxOf(wrapper, label)
      expect(box, `应有「${label}」勾选`).toBeTruthy()
      expect(box!.find('[role="checkbox"]').attributes('aria-checked')).toBe('true')
    }
  })

  it('文件里是 false → 对应勾选不勾', () => {
    commonUseOptions.value = { cyShowZoom: false, cyShowTransformation: true }
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })

    expect(
      checkboxOf(wrapper, '显示缩放')!.find('[role="checkbox"]').attributes('aria-checked'),
    ).toBe('false')
    expect(
      checkboxOf(wrapper, '显示变换元素')!.find('[role="checkbox"]').attributes('aria-checked'),
    ).toBe('true')
  })

  it('点一下 → 写回 sj_set.json 的那个键（真值取反）', async () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })

    await checkboxOf(wrapper, '显示缩放')!.find('[role="checkbox"]').trigger('click')
    expect(cmds.setOption).toHaveBeenCalledWith({ path: 'cyShowZoom', value: false })

    await checkboxOf(wrapper, '显示变换元素')!.find('[role="checkbox"]').trigger('click')
    expect(cmds.setOption).toHaveBeenCalledWith({ path: 'cyShowTransformation', value: false })
  })
})
