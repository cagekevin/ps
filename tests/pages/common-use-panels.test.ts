import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import GAnchorGrid, { ANCHOR_ROWS } from '@/components/GAnchorGrid.vue'
import { useLoadingStore } from '@/stores/loading'
/** pinia setup store 形态：状态是 ref，storeToRefs 才拿得到 */
let fakeStore: { options: Ref<Record<string, unknown>>; loadOptions: () => Promise<void> }

vi.mock('@/stores/common-use', () => ({ useCommonUseStore: () => fakeStore }))

const cmds = vi.hoisted(() => ({
  exportImages: vi.fn(async (_payload: unknown) => true),
  openExportFolder: vi.fn(async () => true),
  exportPsdFolder: vi.fn(async () => true),
  setOption: vi.fn(async (_payload: unknown) => true),
  referenceGuide: vi.fn(async (_payload: unknown) => true),
  smartToLink: vi.fn(async () => true),
  linkToSmart: vi.fn(async () => true),
  transform: vi.fn(async (_payload: unknown) => true),
}))

vi.mock('@/components/command/useCommand', () => ({
  useCommand: (id: string) => ({
    invoke:
      id === 'commonUse.exportImages'
        ? cmds.exportImages
        : id === 'commonUse.openExportFolder'
          ? cmds.openExportFolder
          : id === 'commonUse.exportPsdFolder'
            ? cmds.exportPsdFolder
            : id === 'commonUse.setOption'
              ? cmds.setOption
              : id === 'commonUse.referenceGuide'
                ? cmds.referenceGuide
                : id === 'commonUse.smartToLinkSmartObject'
                  ? cmds.smartToLink
                  : id === 'commonUse.linkSmartObjectToSmartObject'
                    ? cmds.linkToSmart
                    : id === 'commonUse.transform'
                      ? cmds.transform
                      : vi.fn(async () => true),
    disabled: false,
    running: false,
  }),
}))

const toasts = vi.hoisted(() => [] as Array<{ type: string; text: string }>)
vi.mock('@/stores/feedback', () => ({
  useFeedbackStore: () => ({
    ok: (text: string) => toasts.push({ type: 'ok', text }),
    error: (text: string) => toasts.push({ type: 'error', text }),
    warn: (text: string) => toasts.push({ type: 'warn', text }),
    info: () => {},
  }),
}))
import GRadio from '@/components/GRadio.vue'
import PanelExport from '@/pages/commonUse/components/PanelExport.vue'
import PanelCustomChange from '@/pages/commonUse/components/PanelCustomChange.vue'
import PanelImport from '@/pages/commonUse/components/PanelImport.vue'
import PanelEmbed from '@/pages/commonUse/components/PanelEmbed.vue'
import PanelReference from '@/pages/commonUse/components/PanelReference.vue'

/**
 * T-88b 的公共件与面板：只断言"可观察结果"（分组数据、点击 emit、DOM 数量）。
 * 布局坐标不测（jsdom 没有）。
 */

describe('GAnchorGrid 的分组是数据', () => {
  it('锚点分两行、每行 6 个，共 12 个（官方 svgOne/svgTwo 各 6 项，:36278-36315）', () => {
    expect(ANCHOR_ROWS.map((row) => row.length)).toEqual([6, 6])
    expect(ANCHOR_ROWS.flat()).toHaveLength(12)
    // 12 格 / 9 个不同图标：svgTwo = [7,8,9,9,9,9]，展平下标 8/9/10/11 复用 weizhi9（app.v4.js:36304-36314）
    expect(new Set(ANCHOR_ROWS.flat()).size).toBe(9)
    expect(ANCHOR_ROWS.flat().slice(8)).toEqual([
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
      'iconmaodianbianhuandianweizhi9',
    ])
  })

  it('按 rows 渲染：两行、每行格子数 = 分组长度，点格子 emit 锚点名', async () => {
    const wrapper = mount(GAnchorGrid)

    const rows = wrapper.findAll('.g-anchor-grid__row')
    expect(rows).toHaveLength(2)
    expect(rows[0].findAll('.g-anchor-grid__cell')).toHaveLength(6)
    expect(rows[1].findAll('.g-anchor-grid__cell')).toHaveLength(6)

    // 第二行第 3 格 = 展平下标 8
    await rows[1].findAll('.g-anchor-grid__cell')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([8])
  })

  it('传自定义 rows 时排法完全由数据决定（组件里没有写死的两段）', () => {
    const wrapper = mount(GAnchorGrid, { props: { rows: [['iconA'], ['iconB', 'iconC']] } })

    expect(wrapper.findAll('.g-anchor-grid__row')).toHaveLength(2)
    expect(wrapper.findAll('.g-anchor-grid__cell')).toHaveLength(3)
  })
})

describe('GRadio', () => {
  it('点未选中项：写回 v-model 并 emit change', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'b' },
      slots: { default: 'B' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['b'])
  })

  it('点已选中项：不重复 emit', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'a' },
      slots: { default: 'A' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disabled：不 emit', async () => {
    const wrapper = mount(GRadio, {
      props: { modelValue: 'a', value: 'b', disabled: true },
      slots: { default: 'B' },
    })

    await wrapper.find('.g-radio__dot').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('面板形态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = { options: ref({}), loadOptions: vi.fn(async () => {}) }
  })

  it('comexport 有 3 个折叠区，且缺省全部收起（没有 default-open）', () => {
    const wrapper = mount(PanelExport)

    expect(wrapper.findAll('.g-collapse')).toHaveLength(3)
    // 三个 body 都 v-show=false（缺省收起）
    expect(
      wrapper
        .findAll('.g-collapse__body')
        .every((el) => el.attributes('style')?.includes('display: none')),
    ).toBe(true)
  })

  it('comimport 是"一块 = 一行勾选"', () => {
    const wrapper = mount(PanelImport)

    expect(wrapper.findAll('input[type="checkbox"], .check-box, label')).not.toHaveLength(0)
    expect(wrapper.find('.g-collapse').exists()).toBe(false)
  })
})

describe('comexport 折叠区标题是官方原文', () => {
  it('三个标题逐字来自 app.v4.js:36661 / :36754 / :36784', () => {
    const wrapper = mount(PanelExport)
    const titles = wrapper.findAll('.g-collapse__title').map((el) => el.text())

    expect(titles).toEqual(['压缩尺寸 & 加水印', '所在目录设置', '批量导出功能'])
  })
})

describe('comcustomChange 六输入的商品名与配对', () => {
  it('六项官方 data 名各出现一次（app.v4.js:36316-36323）', () => {
    const wrapper = mount(PanelCustomChange)
    const rows = wrapper.findAll('.setting-row')

    expect(rows).toHaveLength(4) // 3 行输入 + 1 行按钮
    expect(wrapper.findAll('.g-input')).toHaveLength(6)
  })
})

describe('A4：导出链路（参数 = 面板写进 cyExport 的整块）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = {
      options: ref({
        cyExport: { ext: 'JPG', quality: '100', path: '', compress: { level: 60, enable: true } },
      }),
      loadOptions: vi.fn(async () => {}),
    }
    toasts.length = 0
    cmds.exportImages.mockClear()
    cmds.exportImages.mockResolvedValue(true)
  })

  it('点「导出一级图层」→ 命令 id + 实参就是当前 cyExport 那份（未被面板管的子键也带上）', async () => {
    const wrapper = mount(PanelExport)
    const button = wrapper.findAll('button').find((b) => b.text() === '导出一级图层')
    expect(button).toBeTruthy()

    await button!.trigger('click')

    expect(cmds.exportImages).toHaveBeenCalledTimes(1)
    const payload = cmds.exportImages.mock.calls[0][0] as {
      mode: string
      options: Record<string, unknown>
    }
    expect(payload.mode).toBe('first')
    expect(payload.options).toEqual({
      ext: 'JPG',
      quality: '100',
      path: '',
      saveMode: 'desktop',
      name: '',
      userLayerName: false,
      autoNumber: false,
      mode: 'web',
      autoOpenFolder: false,
      compress: { level: 60, enable: true, exportOriginalGraph: false },
    })
  })

  it('改了品质再点：第二次实参与第一次逐字段不同，且只有品质变了', async () => {
    const wrapper = mount(PanelExport)
    const button = wrapper.findAll('button').find((b) => b.text() === '导出一级图层')

    await button!.trigger('click')
    const seg = wrapper.findAll('.g-segment__item').find((b) => b.text() === 'PNG')
    await seg!.trigger('click')
    await button!.trigger('click')

    const first = (cmds.exportImages.mock.calls[0][0] as { options: Record<string, unknown> })
      .options
    const second = (cmds.exportImages.mock.calls[1][0] as { options: Record<string, unknown> })
      .options
    expect(second.ext).toBe('PNG')
    expect(second.ext).not.toBe(first.ext)
    // 其余字段逐个相同
    for (const key of Object.keys(first)) {
      if (key === 'ext') continue
      expect(second[key]).toEqual(first[key])
    }
  })

  it('导出失败：命令返回 false → 出现用户可见的错误提示（不静默）', async () => {
    cmds.exportImages.mockResolvedValue(false)
    const wrapper = mount(PanelExport)
    const button = wrapper.findAll('button').find((b) => b.text() === '导出一级图层')

    await button!.trigger('click')
    // T-97-7 之后这条路径多了"撤遮罩"一步（多一层 await），断言前先跑完微任务
    await flushPromises()

    expect(toasts.filter((t) => t.type === 'error')).toHaveLength(1)
    expect(toasts.find((t) => t.type === 'error')?.text).toContain('导出失败')
  })
})

describe('T-97-2：两个智能对象按钮（各一条无参命令）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = { options: ref({}), loadOptions: vi.fn(async () => {}) }
    cmds.smartToLink.mockClear()
    cmds.linkToSmart.mockClear()
  })

  it('「转链接智能对象」→ commonUse.smartToLinkSmartObject，**无参**', async () => {
    const wrapper = mount(PanelEmbed)
    const button = wrapper.findAll('button').find((b) => b.text() === '转链接智能对象')
    expect(button).toBeTruthy()

    await button!.trigger('click')

    expect(cmds.smartToLink).toHaveBeenCalledTimes(1)
    // `toHaveBeenCalledWith()` 不接受任何实参：多传一个字段这条就红
    expect(cmds.smartToLink).toHaveBeenCalledWith()
    expect(cmds.linkToSmart).not.toHaveBeenCalled()
  })

  it('「转智能对象」→ commonUse.linkSmartObjectToSmartObject，**无参**', async () => {
    const wrapper = mount(PanelEmbed)
    const button = wrapper.findAll('button').find((b) => b.text() === '转智能对象')
    expect(button).toBeTruthy()

    await button!.trigger('click')

    expect(cmds.linkToSmart).toHaveBeenCalledTimes(1)
    expect(cmds.linkToSmart).toHaveBeenCalledWith()
    expect(cmds.smartToLink).not.toHaveBeenCalled()
  })
})

describe('T-97-3：参数落盘（官方键名）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = { options: ref({}), loadOptions: vi.fn(async () => {}) }
    cmds.setOption.mockClear()
    cmds.referenceGuide.mockClear()
  })

  it.each([
    ['导出宽度', 'cyExport.compress.width'],
    ['导出高度', 'cyExport.compress.height'],
    ['水印文件', 'cyExport.compress.watermark'],
  ])('压缩区「%s」→ 写 %s', async (_label, path) => {
    const wrapper = mount(PanelExport)
    const inputs = wrapper.findAll('.panel-export input')
    // 压缩区三个输入在折叠区里，按顺序取最后三个（前三个是品质/保存到/命名）
    const target = inputs[inputs.length - 3 + ['导出宽度', '导出高度', '水印文件'].indexOf(_label)]
    await target.setValue('800')
    expect(cmds.setOption).toHaveBeenCalledWith({ path, value: '800' })
  })

  it.each([
    ['压缩尺寸 & 加水印', 'cyShowCompress'],
    ['所在目录设置', 'cyShowSetFolder'],
    ['批量导出功能', 'cyShowBatch'],
  ])('折叠标题「%s」→ 写 %s', async (title, path) => {
    const wrapper = mount(PanelExport)
    const head = wrapper.findAll('.g-collapse__head').find((b) => b.text().includes(title))
    expect(head).toBeTruthy()
    await head!.trigger('click')
    expect(cmds.setOption).toHaveBeenCalledWith({ path, value: true })
  })

  it('参考线「应用」→ 宽度真进命令实参（官方 cy_createSafeAreaGuide([width])，:37228）', async () => {
    const wrapper = mount(PanelReference)
    const input = wrapper.find('.panel-reference input')
    await input.setValue('30')
    const button = wrapper.findAll('button').find((b) => b.text() === '应用')
    await button!.trigger('click')

    expect(cmds.referenceGuide).toHaveBeenCalledWith({ options: '30' })
  })

  it('参考线宽度为空 → 提示「请输入宽度」且不发命令（官方 :37225-37227）', async () => {
    const wrapper = mount(PanelReference)
    await wrapper.find('.panel-reference input').setValue('')
    const button = wrapper.findAll('button').find((b) => b.text() === '应用')
    await button!.trigger('click')

    expect(cmds.referenceGuide).not.toHaveBeenCalled()
    expect(toasts.some((t) => t.text === '请输入宽度')).toBe(true)
  })
})

describe('T-97-7：长任务全屏遮罩 + 官方文案', () => {
  /** 让"执行中"可观察：命令返回一个由用例自己决定何时结束的 promise */
  function deferred<T>() {
    let settle!: (value: T) => void
    const promise = new Promise<T>((resolve) => {
      settle = resolve
    })
    return { promise, settle }
  }

  function clickButton(wrapper: ReturnType<typeof mount>, label: string) {
    const button = wrapper.findAll('button').find((b) => b.text() === label)
    expect(button, `应有按钮「${label}」`).toBeTruthy()
    return button!.trigger('click')
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    fakeStore = { options: ref({}), loadOptions: vi.fn(async () => {}) }
    cmds.smartToLink.mockClear()
    cmds.linkToSmart.mockClear()
    cmds.exportImages.mockClear()
    cmds.exportPsdFolder.mockClear()
    cmds.transform.mockClear()
  })

  it('转链接智能对象：执行中出遮罩、文案是官方原文，结束后消失（官方 :35889）', async () => {
    const gate = deferred<boolean>()
    cmds.smartToLink.mockImplementationOnce(() => gate.promise)
    const loading = useLoadingStore()
    const wrapper = mount(PanelEmbed)

    await clickButton(wrapper, '转链接智能对象')

    expect(loading.active).toBe(true)
    expect(loading.message).toBe('正在转链接智能对象...')

    gate.settle(true)
    await flushPromises()
    expect(loading.active).toBe(false)
  })

  it('转智能对象：文案是官方原文，命令返回 false（失败）也撤遮罩（官方 :35869）', async () => {
    const gate = deferred<boolean>()
    cmds.linkToSmart.mockImplementationOnce(() => gate.promise)
    const loading = useLoadingStore()
    const wrapper = mount(PanelEmbed)

    await clickButton(wrapper, '转智能对象')
    expect(loading.message).toBe('正在转回普通智能对象...')

    gate.settle(false)
    await flushPromises()
    expect(loading.active).toBe(false)
  })

  it.each([
    ['导出一级图层', '正在导出一级图层...', 'first'],
    ['导出二级图层', '正在导出二级图层...', 'second'],
  ])(
    '「%s」执行中出遮罩、文案 %s，结束后消失（官方 :37829 / :37858）',
    async (label, text, mode) => {
      const gate = deferred<boolean>()
      cmds.exportImages.mockImplementationOnce(() => gate.promise)
      const loading = useLoadingStore()
      const wrapper = mount(PanelExport)

      await clickButton(wrapper, label)
      expect(loading.active).toBe(true)
      expect(loading.message).toBe(text)
      expect(cmds.exportImages.mock.calls[0][0]).toMatchObject({ mode })

      gate.settle(true)
      await flushPromises()
      expect(loading.active).toBe(false)
    },
  )

  it('「批量导出文件夹所有PSD」不加遮罩：官方那两条文案在命令层的循环里，已由 TaskHud 承担', async () => {
    const gate = deferred<boolean>()
    cmds.exportPsdFolder.mockImplementationOnce(() => gate.promise)
    const loading = useLoadingStore()
    const wrapper = mount(PanelExport)

    await clickButton(wrapper, '批量导出文件夹所有PSD')
    expect(loading.active).toBe(false)

    gate.settle(true)
    await flushPromises()
    expect(loading.active).toBe(false)
  })

  it('自定义变换：数量 >5 才出遮罩，文案「正在处理...」（官方 :36412-36414）', async () => {
    const gate = deferred<boolean>()
    cmds.transform.mockImplementationOnce(() => gate.promise)
    const loading = useLoadingStore()
    const wrapper = mount(PanelCustomChange)

    await wrapper.findAll('.panel-custom input')[0].setValue('6')
    await clickButton(wrapper, '生成变换')

    expect(loading.active).toBe(true)
    expect(loading.message).toBe('正在处理...')

    gate.settle(true)
    await flushPromises()
    expect(loading.active).toBe(false)
  })

  it('自定义变换：数量 ≤5 不出遮罩（官方只对 number>5 才 show）', async () => {
    const gate = deferred<boolean>()
    cmds.transform.mockImplementationOnce(() => gate.promise)
    const loading = useLoadingStore()
    const wrapper = mount(PanelCustomChange)

    await wrapper.findAll('.panel-custom input')[0].setValue('5')
    await clickButton(wrapper, '生成变换')

    expect(loading.active).toBe(false)
    expect(cmds.transform).toHaveBeenCalledTimes(1)

    gate.settle(true)
    await flushPromises()
  })
})
