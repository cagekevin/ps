import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'
import { createPinia, setActivePinia } from 'pinia'
import { encodeText } from '@/domain/translate'
import { readValue } from '../support/repo-read'

/**
 * 样式域命令（第 2 段）。
 *
 * 重点覆盖三件事：
 * 1. 原版 `useColor` 是**修饰键路由**（`ft.f/g/e` = ctrl/meta、shift、alt，`app.v4.js:70622-70638`），
 *    不是能力降级链——四步都要走到，顺序错就是功能错；
 * 2. `alt` 分支（`cy_changeStyleColor`）拿到新项要回写库文件（`:50153-50159`）；
 * 3. 三条"添加"命令把 jsx 结果写进正确的库文件。
 */
const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

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

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

/**
 * 快速吸色到组（T-66）要等 PS 事件。这里把订阅换成可手动触发的表：
 * 测试先等命令订阅上，再按名字触发「吸色完成 / 取消」，或交给超时。
 */
const hostEvents = vi.hoisted(() => ({ listeners: new Map<string, (payload?: unknown) => void>() }))
/** 发出去的 app event（发送到色板后要通知色板面板重读，`app.v4.js:50216-50218`） */
const appEvents = vi.hoisted(() => ({ sent: [] as Array<{ channel: string; data: unknown }> }))
vi.mock('@/cep/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/events')>()
  return {
    // 只换订阅通道；`classifySetd` 用真的——判据本身由 `tests/cep/setd-router.test.ts` 对官方源码校验
    classifySetd: actual.classifySetd,
    subscribeHostEvent: async (name: string, listener: (payload?: unknown) => void) => {
      hostEvents.listeners.set(name, listener)
      return () => hostEvents.listeners.delete(name)
    },
    APP_EVENT_SEBAN: actual.APP_EVENT_SEBAN,
    sendAppEvent: (channel: string, data: unknown) => {
      appEvents.sent.push({ channel, data })
      return true
    },
  }
})

/** 样式库的磁盘读写：测试里换内存实现，命令与 jsx 都走真的 */
const store = vi.hoisted(() => {
  const files = new Map<string, string>()
  return { files }
})

/**
 * `userDir()` 必须真的以 `USER_DIR`（`/SheJiZhuLi`）结尾——发送到色板要把它剥掉还原成
 * `%APPDATA%` 根（原版 `path.seBan` = `getUserDataPath() + "/FengZiSeBan/userColor.ini"`）。
 */
vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextSmart: async (path: string) => store.files.get(path) ?? null,
  // T-107：唯一读入口（三态）+ 同步例外（CAS / 结构上同步的调用方）  readTextOutcome: async (path: string) => {
      const text = store.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = store.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFileAtomic: (path: string, text: string) => {
      store.files.set(path, text)
      return true
    },
  // 备份走普通写（和 fileRepo 一致）  writeTextFile: (path: string, text: string) => {
      store.files.set(path, text)
    },
  // 删除仓库把文件搬进回收目录：base64 只是原样搬运的载体  // T-109：base64 读也走三态（只认 ENOENT 是 notSeen）  readBase64Outcome: (path: string) => {
      const text = store.files.get(path)
      return text === undefined
        ? { status: 'notSeen' as const }
        : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
    },
  writeBase64File: (path: string, base64: string) => {
      store.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
      return true
    },
  // T-109：`removeFile` 现在返回 `{ ok } | { ok:false, reason }`，不再是 boolean  removeFile: (path: string) => {
      store.files.delete(path)
      return { ok: true as const }
    },
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { styleIndexWriter } = await import('@/cep/data/style-library-repo')

const USER = 'ROAM/SheJiZhuLi'
const COLOR_LIB = `${USER}/sj_kuColA.ini`
const GRADIENT_LIB = `${USER}/sj_kuGraA.ini`
const FONT_LIB = `${USER}/sj_kuFonA.json`
const STYLE_LIB = `${USER}/sj_kuStyA.ini`
const SWATCH_FILE = 'ROAM/FengZiSeBan/userColor.ini'

function seed(
  path: string,
  groups: Array<{ name: string; show: boolean; id?: string; list: unknown[] }>,
) {
  store.files.set(path, JSON.stringify(groups))
}

async function read(path: string): Promise<unknown> {
  return JSON.parse(store.files.get(path) ?? 'null')
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  hostEvents.listeners.clear()
  store.files.clear()

  await styleIndexWriter.write({
    index: 0,
    list: [
      {
        name: '默认仓库',
        color: 'sj_kuColA.ini',
        gradient: 'sj_kuGraA.ini',
        font: 'sj_kuFonA.json',
        style: 'sj_kuStyA.ini',
      },
    ],
  })

  seed(COLOR_LIB, [
    {
      name: '灰白',
      show: true,
      list: [{ name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } }],
    },
  ])
  seed(GRADIENT_LIB, [
    { name: '渐变默认分组', show: true, list: [{ name: '未命名', gradient: { angle: 90 } }] },
  ])
  seed(FONT_LIB, [
    {
      name: '等线字组',
      show: true,
      list: [{ name: '未命名', fonts: [{ family: '等线', weight: 'Regular' }] }],
    },
  ])
  seed(STYLE_LIB, [{ name: '样式默认分组', show: true, id: 'YS5B2C4C06B1029543', list: [] }])

  jsx.font.checkUseFont.mockResolvedValue({ ok: true, data: null })
  jsx.font.useFont.mockResolvedValue({ ok: true, data: null })
  jsx.style.useShapeFill.mockResolvedValue({ ok: true, data: null })
  jsx.style.setBorderColor.mockResolvedValue({ ok: true, data: null })
  jsx.style.changeStyleColor.mockResolvedValue({ ok: true, data: null })
  jsx.style.useStyleColor.mockResolvedValue({ ok: true, data: null })
  jsx.style.useGradient.mockResolvedValue({ ok: true, data: null })
  jsx.style.useStyle.mockResolvedValue({ ok: true, data: null })
})

describe('style.applyColor：修饰键路由（app.v4.js:50128-50163）', () => {
  it('ctrl → ys_useShapeFill，发磁盘上的原始项', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'ctrl' })

    expect(jsx.style.useShapeFill).toHaveBeenCalledWith({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
    expect(jsx.style.setBorderColor).not.toHaveBeenCalled()
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()
  })

  it('shift → ys_setBorderColor', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'shift' })

    expect(jsx.style.setBorderColor).toHaveBeenCalled()
    expect(jsx.style.useShapeFill).not.toHaveBeenCalled()
  })

  it('无修饰键 → ys_useStyleColor', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'none' })

    expect(jsx.style.useStyleColor).toHaveBeenCalled()
  })

  it('alt → cy_changeStyleColor（fire-and-forget，写回暂不做——UNVERIFIED）', async () => {
    jsx.style.changeStyleColor.mockResolvedValue(undefined)

    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'alt' })

    expect(jsx.style.changeStyleColor).toHaveBeenCalled()
  })

  it('alt 返回 -1 = 取消：不动库文件', async () => {
    jsx.style.changeStyleColor.mockResolvedValue({ ok: true, data: -1 })

    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'alt' })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[0]).toEqual({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
  })
})

describe('style.applyGradient / style.applyStyle', () => {
  it('渐变发 item.gradient，不是整个项（:50791）', async () => {
    await execute('style.applyGradient', { groupIndex: 0, itemIndex: 0 })

    expect(jsx.style.useGradient).toHaveBeenCalledWith({ angle: 90 })
  })

  it('图层样式发原始项 + groupId（:51509-51511）', async () => {
    seed(STYLE_LIB, [
      {
        name: '样式默认分组',
        show: true,
        id: 'YS5B2C4C06B1029543',
        list: [{ name: '描边', id: 'X1', layerId: 3 }],
      },
    ])

    await execute('style.applyStyle', { groupIndex: 0, itemIndex: 0 })

    expect(jsx.style.useStyle).toHaveBeenCalledWith(
      { name: '描边', id: 'X1', layerId: 3 },
      'YS5B2C4C06B1029543',
    )
  })
})

describe('三条"添加"命令', () => {
  it('颜色：ys_getForegroundColor 的返回值原样入库（:50193-50202）', async () => {
    jsx.style.getForegroundColor.mockResolvedValue({
      ok: true,
      data: { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } },
    })

    await execute('style.addColor', { groupIndex: 0 })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(2)
    expect(groups[0].list[1]).toEqual({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
  })

  it('颜色：null = 失败，不入库（:50196）', async () => {
    jsx.style.getForegroundColor.mockResolvedValue({ ok: true, data: null })

    await expect(execute('style.addColor', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })
    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(1)
  })

  it('渐变：包成 {name:"未命名", gradient:data} 入库（:50767-50771）', async () => {
    jsx.style.getGradientInfo.mockResolvedValue({ ok: true, data: { angle: 90 } })

    await execute('style.addGradient', { groupIndex: 0 })

    const groups = (await read(GRADIENT_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[1]).toEqual({ name: '未命名', gradient: { angle: 90 } })
  })

  it('渐变：false / err=1 / 无 data 都不入库', async () => {
    jsx.style.getGradientInfo.mockResolvedValue({ ok: true, data: false })
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    jsx.style.getGradientInfo.mockResolvedValue({ ok: false, code: 'JSX', reason: '没有渐变' })
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    jsx.style.getGradientInfo.mockResolvedValue({ ok: true, data: null })
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    const groups = (await read(GRADIENT_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(1)
  })

  it('样式：ys_AddStyle payload 带 groupId + envDir（写回暂不做——UNVERIFIED）', async () => {
    jsx.style.addStyle.mockResolvedValue(undefined)

    await execute('style.addStyle', { groupIndex: 0 })

    expect(jsx.style.addStyle).toHaveBeenCalledWith({
      delArr: [],
      groupId: 'YS5B2C4C06B1029543',
      envDir: '/SheJiZhuLi',
    })
  })

  it('样式：err=1 时报错且不入库', async () => {
    // `write` 契约：`jsxWrite` 在生产者层抛 ⇒ mock 也该 reject
    jsx.style.addStyle.mockRejectedValue(new CepError('JSX', '没有可保存的样式'))

    await expect(execute('style.addStyle', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })
    const groups = (await read(STYLE_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(0)
  })
})

// ---------- 字体库：应用 / 添加（原版 useFont :51187-51228、addFont :51230-51277）----------

describe('style.applyFont（原版 useFont：先 ys_checkUseFont 再 ys_useFont）', () => {
  it('发的是整项 JSON 经 Xv 编码后的文本，两步用同一个载荷', async () => {
    const item = { name: '未命名', fonts: [{ family: '等线', weight: 'Regular' }] }

    await expect(
      execute('style.applyFont', { groupIndex: 0, itemIndex: 0 }),
    ).resolves.toMatchObject({ ok: true })

    const payload = encodeText(JSON.stringify(item))
    expect(jsx.font.checkUseFont).toHaveBeenCalledWith(payload)
    expect(jsx.font.useFont).toHaveBeenCalledWith(payload)
    // 不许落到图层样式命令（这就是本轮修的 bug）
    expect(jsx.style.useStyle).not.toHaveBeenCalled()
  })

  it('check 返回 err=1 → 报错，且不调 ys_useFont（原版 :51205-51209 直接中止）', async () => {
    jsx.font.checkUseFont.mockRejectedValue(new CepError('JSX', '缺少字体：等线'))

    await expect(
      execute('style.applyFont', { groupIndex: 0, itemIndex: 0 }),
    ).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('缺少字体') })
    expect(jsx.font.useFont).not.toHaveBeenCalled()
  })
})

describe('style.addFont（原版 addFont：ys_getFontInfo 的 data 整份入库）', () => {
  it('data 原样写进字体库，不改键不补字段', async () => {
    const data = { name: '未命名', fonts: [{ family: '等线', weight: 'Regular' }] }
    jsx.font.getFontInfo.mockResolvedValue({ ok: true, data })

    await expect(execute('style.addFont', { groupIndex: 0 })).resolves.toEqual({ ok: true })

    const g = (await read(FONT_LIB)) as Array<{ list: unknown[] }>
    expect(g[0].list).toHaveLength(2)
    expect(g[0].list[1]).toEqual(data)
    // 绝不许写进样式库
    const styleLib = (await read(STYLE_LIB)) as Array<{ list: unknown[] }>
    expect(styleLib[0].list).toHaveLength(0)
  })

  it('err=1 / fonts 为空都不入库（原版 :51256-51262 两个分支）', async () => {
    jsx.font.getFontInfo.mockResolvedValue({ ok: false, code: 'JSX', reason: '没有文字层' })
    await expect(execute('style.addFont', { groupIndex: 0 })).resolves.toMatchObject({ ok: false })

    jsx.font.getFontInfo.mockResolvedValue({ ok: true, data: { fonts: [] } })
    await expect(execute('style.addFont', { groupIndex: 0 })).resolves.toMatchObject({ ok: false })

    const g = (await read(FONT_LIB)) as Array<{ list: unknown[] }>
    expect(g[0].list).toHaveLength(1)
  })

  it('false → 报错且不入库（有意偏离，原版 :51246 静默 return，见 D-23）', async () => {
    // 原版 `addFont`（app.v4.js:51243-51264）：`ys_getFontInfo` 返回 `false` 直接 `return`，
    // 不 toast、不写库。我方抛错 —— 有意偏离，理由见 docs/页面/06-样式.md 段 2 的偏离记录。
    // 两臂下 `data: false` = 解码器不认识（不是合法 `{fonts}` 形状）⇒ 失败臂 PARSE。
    jsx.font.getFontInfo.mockResolvedValue({ ok: true, data: false })

    // 实际文案是「读取字体属性失败：没有可添加的字体」（比 fallback 更具体），不是短的那句
    await expect(execute('style.addFont', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
      reason: '读取字体属性失败：没有可添加的字体',
    })

    const g = (await read(FONT_LIB)) as Array<{ list: unknown[] }>
    expect(g[0].list).toHaveLength(1)
  })
})

/** 官方判定"吸色完成"的那一支：`null._property === 'foregroundColor'`（`app.v4.js:69413`） */
const FOREGROUND_SETD = {
  eventID: 1936028772,
  eventData: { null: { _property: 'foregroundColor' } },
}

/** T-87 靶点⑰：除了「改前景色」，其它 setd 都不是吸色完成 */
const NON_PICK_SETD = [
  ['改背景色', { eventID: 1936028772, eventData: { null: { _property: 'backgroundColor' } } }],
  ['选了文字图层', { eventID: 1936028772, eventData: { to: { _obj: 'textStyle' } } }],
  ['单行选区', { eventID: 1936028772, eventData: { to: { _obj: 'singleRow' } } }],
  ['单列选区', { eventID: 1936028772, eventData: { to: { _obj: 'singleColumn' } } }],
  ['认不出的 setd', { eventID: 1936028772, eventData: { null: { _property: 'layerSection' } } }],
] as const
describe('style.pickColorToGroup（T-66：切吸色工具 + 等 PS 事件）', () => {
  it('吸色完成（setd）→ 读前景色并加进该组', async () => {
    jsx.style.setTool.mockResolvedValue({ ok: true, data: null })
    jsx.style.getForegroundColor.mockResolvedValue({
      ok: true,
      data: { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } },
    })

    const pending = execute('style.pickColorToGroup', { kind: 'color', groupIndex: 0 })

    await vi.waitFor(() => expect(hostEvents.listeners.has('setd')).toBe(true))
    expect(jsx.style.setTool).toHaveBeenCalledWith('eyedropperTool')

    hostEvents.listeners.get('setd')?.(FOREGROUND_SETD)
    await expect(pending).resolves.toMatchObject({ ok: true })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(2)
    expect(groups[0].list[1]).toEqual({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
    // 两个订阅都退掉，不留死监听
    expect(hostEvents.listeners.size).toBe(0)
  })

  it.each(NON_PICK_SETD)('%s 的 setd 不算吸色完成：继续等，不读前景色', async (_label, payload) => {
    jsx.style.setTool.mockResolvedValue({ ok: true, data: null })
    const pending = execute('style.pickColorToGroup', { kind: 'color', groupIndex: 0 })
    await vi.waitFor(() => expect(hostEvents.listeners.has('setd')).toBe(true))

    hostEvents.listeners.get('setd')?.(payload)
    // 让微任务跑完，确认还没结算
    await Promise.resolve()
    await Promise.resolve()
    expect(jsx.style.getForegroundColor).not.toHaveBeenCalled()

    // 之后真正吸色（前景色）才完成
    hostEvents.listeners.get('setd')?.(FOREGROUND_SETD)
    await expect(pending).resolves.toMatchObject({ ok: true })
    expect(jsx.style.getForegroundColor).toHaveBeenCalledTimes(1)
  })
  /**
   * TD-12-22：用户在 PS 里切走选区 = 主动放弃。它**不是失败**，所以结果是 `ok:'cancelled'`，
   * 页面（`useCommand`）据此不弹失败提示——以前它被写成 `PARSE`，用户点掉一次吸色会收到一条"故障"。
   */
  it('取消（selection）→ ok:cancelled（不是失败），不写库', async () => {
    const pending = execute('style.pickColorToGroup', { kind: 'color', groupIndex: 0 })

    await vi.waitFor(() => expect(hostEvents.listeners.has('selection')).toBe(true))
    hostEvents.listeners.get('selection')?.()

    await expect(pending).resolves.toEqual({ ok: 'cancelled' })
    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(1)
    expect(hostEvents.listeners.size).toBe(0)
  })

  it('事件不来 → 60s 后按超时失败，不永远挂着', async () => {
    vi.useFakeTimers()
    try {
      const pending = execute('style.pickColorToGroup', { kind: 'color', groupIndex: 0 })
      await vi.waitFor(() => expect(hostEvents.listeners.has('setd')).toBe(true))

      await vi.advanceTimersByTimeAsync(60_000)
      await expect(pending).resolves.toMatchObject({ ok: false })
      const result = await pending
      // TIMEOUT 的文案由 describeCepError 统一成这一句
      expect(result.ok === false && result.reason).toContain('没有响应')
    } finally {
      vi.useRealTimers()
    }
  })

  it('非颜色库直接拒绝，不切工具', async () => {
    await expect(
      execute('style.pickColorToGroup', { kind: 'font', groupIndex: 0 }),
    ).resolves.toMatchObject({ ok: false })
    expect(jsx.style.setTool).not.toHaveBeenCalled()
  })
})

// ---------- 第 3 段：分组 / 项的增删改 + 写库 ----------
type RawGroup = { name?: string; show?: boolean; id?: string; list?: unknown[] }

async function groups(path: string): Promise<RawGroup[]> {
  return (await read(path)) as RawGroup[]
}

describe('style.addGroup（原版 addGroup，app.v4.js:52437-52449）', () => {
  it('追加到末尾：{name, show, list:[]}（createGroupObject :52513-52521）', async () => {
    await expect(execute('style.addGroup', { kind: 'color', name: '  新组  ' })).resolves.toEqual({
      ok: true,
    })

    const g = await groups(COLOR_LIB)
    expect(g).toHaveLength(2)
    expect(g[1]).toEqual({ name: '新组', show: true, list: [] })
  })

  it('样式库的组带 id：YS + 16 位大写 hex（:53270-53278）', async () => {
    await execute('style.addGroup', { kind: 'style', name: '描边组' })

    const g = await groups(STYLE_LIB)
    expect(g[1].name).toBe('描边组')
    expect(g[1].id).toMatch(/^YS[0-9A-F]{16}$/)
  })

  it('afterIndex 有效时插到它后面（:52443-52447）', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.addGroup', { kind: 'color', name: 'C', afterIndex: 0 })

    expect((await groups(COLOR_LIB)).map((g) => g.name)).toEqual(['A', 'C', 'B'])
  })

  it('空名报错且不动文件', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(execute('style.addGroup', { kind: 'color', name: '   ' })).resolves.toMatchObject({
      ok: false,
    })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })

  it('库文件损坏（不是 JSON）→ 报错，不覆盖原文件', async () => {
    store.files.set(COLOR_LIB, '{坏掉的')

    const result = await execute('style.addGroup', { kind: 'color', name: 'X' })

    expect(result.ok).toBe(false)
    expect(store.files.get(COLOR_LIB)).toBe('{坏掉的')
  })
})

describe('style.renameGroup（原版 renameGroup :52456-52459）', () => {
  it('只改 name，id 与 list 原样保留', async () => {
    seed(STYLE_LIB, [
      { name: '旧名', show: true, id: 'YSAAAAAAAAAAAAAAAA', list: [{ name: 'x', id: 'i' }] },
    ])

    await expect(
      execute('style.renameGroup', { kind: 'style', groupIndex: 0, name: '新名' }),
    ).resolves.toEqual({ ok: true })

    expect(await groups(STYLE_LIB)).toEqual([
      { name: '新名', show: true, id: 'YSAAAAAAAAAAAAAAAA', list: [{ name: 'x', id: 'i' }] },
    ])
  })

  it('分组不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.renameGroup', { kind: 'color', groupIndex: 5, name: 'X' }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.deleteGroup（原版 deleteGroup :52451-52454）', () => {
  it('删掉指定组', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.deleteGroup', { kind: 'color', groupIndex: 0 })

    expect((await groups(COLOR_LIB)).map((g) => g.name)).toEqual(['B'])
  })

  it('删空后补「颜色默认分组」（this.text + "默认分组"）', async () => {
    await execute('style.deleteGroup', { kind: 'color', groupIndex: 0 })

    expect(await groups(COLOR_LIB)).toEqual([{ name: '颜色默认分组', show: true, list: [] }])
  })

  it('索引里没有当前仓库 → 报错（不静默写到别处）', async () => {
    await styleIndexWriter.write({ index: 0, list: [] })

    await expect(
      execute('style.deleteGroup', { kind: 'color', groupIndex: 0 }),
    ).resolves.toMatchObject({ ok: false })
  })
})

describe('style.toggleGroupShow（原版 changeGroupShowStatus :52415-52435）', () => {
  it('不传 only → 取反', async () => {
    seed(COLOR_LIB, [{ name: 'A', show: true, list: [] }])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 0 })

    expect((await groups(COLOR_LIB))[0].show).toBe(false)
  })

  it('only=true → 只显示这一组', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 1, only: true })

    expect((await groups(COLOR_LIB)).map((g) => g.show)).toEqual([false, true])
  })

  it('only=true 且本来只显示这一组 → 关掉它（showOnlyGroup 的边界，:52431）', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: false, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 1, only: true })

    expect((await groups(COLOR_LIB)).map((g) => g.show)).toEqual([false, false])
  })

  it('分组不存在 → 报错', async () => {
    await expect(
      execute('style.toggleGroupShow', { kind: 'color', groupIndex: 3 }),
    ).resolves.toMatchObject({ ok: false })
  })
})

describe('style.addItem（原版 addItem :52482-52489）', () => {
  it('原样 push 进 list，不补键', async () => {
    await expect(
      execute('style.addItem', {
        kind: 'color',
        groupIndex: 0,
        item: { name: '红', color: { hex: 'FF0000' } },
      }),
    ).resolves.toEqual({ ok: true })

    const g = await groups(COLOR_LIB)
    expect(g[0].list).toHaveLength(2)
    expect(g[0].list?.[1]).toEqual({ name: '红', color: { hex: 'FF0000' } })
  })

  it('分组不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.addItem', { kind: 'color', groupIndex: 9, item: { name: '红' } }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.renameItem（原版 renameItem :52496-52499）', () => {
  it('只改 name，其余键原样带走', async () => {
    seed(COLOR_LIB, [
      { name: '灰白', show: true, list: [{ name: '未命名', color: { hex: '302F34' } }] },
    ])

    await execute('style.renameItem', {
      kind: 'color',
      groupIndex: 0,
      itemIndex: 0,
      name: ' 主色 ',
    })

    expect((await groups(COLOR_LIB))[0].list?.[0]).toEqual({
      name: '主色',
      color: { hex: '302F34' },
    })
  })

  it('空名 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.renameItem', { kind: 'color', groupIndex: 0, itemIndex: 0, name: ' ' }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.deleteItem（原版 deleteItem :52477-52480）', () => {
  it('删掉指定项', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])

    await execute('style.deleteItem', { kind: 'color', groupIndex: 0, itemIndex: 0 })

    expect((await groups(COLOR_LIB))[0].list).toEqual([{ name: 'b', color: { hex: '222222' } }])
  })

  it('项不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.deleteItem', { kind: 'color', groupIndex: 0, itemIndex: 9 }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.reorderItem（原版只有拖拽 :50040-50070，这里挪一格）', () => {
  it('上移一格', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])

    await execute('style.reorderItem', {
      kind: 'color',
      groupIndex: 0,
      itemIndex: 1,
      direction: 'up',
    })

    const list = (await groups(COLOR_LIB))[0].list as Array<{ name: string }>
    expect(list.map((item) => item.name)).toEqual(['b', 'a'])
  })

  it('已在第一项还上移 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.reorderItem', {
        kind: 'color',
        groupIndex: 0,
        itemIndex: 0,
        direction: 'up',
      }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.sendToSwatch（原版 :50349-50355）', () => {
  it('把 [item] 写成色板文件全文（整份替换，不是追加），旧内容进 .bak', async () => {
    const previous = JSON.stringify([{ name: '旧色', color: { hex: '000000' } }])
    store.files.set(SWATCH_FILE, previous)

    await expect(
      execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 0 }),
    ).resolves.toEqual({ ok: true })

    expect(JSON.parse(store.files.get(SWATCH_FILE) ?? 'null')).toEqual([
      { name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } },
    ])
    expect(store.files.get(`${SWATCH_FILE}.bak`)).toBe(previous)
  })

  it('项不存在 → 报错，色板文件不动', async () => {
    const previous = JSON.stringify([{ name: '旧色', color: { hex: '000000' } }])
    store.files.set(SWATCH_FILE, previous)

    await expect(
      execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 7 }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(SWATCH_FILE)).toBe(previous)
  })
})

describe('style.appendItemToSwatch（原版 :50356-50364）', () => {
  it('读回 seBan 数组后 push 该项，旧内容保留', async () => {
    store.files.set(SWATCH_FILE, JSON.stringify([{ name: '旧色', color: { hex: '000000' } }]))

    await expect(
      execute('style.appendItemToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 0 }),
    ).resolves.toEqual({ ok: true })

    expect(JSON.parse(store.files.get(SWATCH_FILE) ?? 'null')).toEqual([
      { name: '旧色', color: { hex: '000000' } },
      { name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } },
    ])
  })
})

describe('style.sendGroupToSwatch（原版 :50260-50268）', () => {
  it('整组 list 写进 seBan：整份替换，不是追加', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])
    store.files.set(SWATCH_FILE, JSON.stringify([{ name: '旧色', color: { hex: '000000' } }]))

    await expect(
      execute('style.sendGroupToSwatch', { kind: 'color', groupIndex: 0 }),
    ).resolves.toEqual({ ok: true })

    // 旧色被整份替换掉
    expect(JSON.parse(store.files.get(SWATCH_FILE) ?? 'null')).toEqual([
      { name: 'a', color: { hex: '111111' } },
      { name: 'b', color: { hex: '222222' } },
    ])
  })
})

describe('style.appendGroupToSwatch（原版 :50269-50290）', () => {
  it('读回 seBan 后逐项 push 该组 list', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])
    store.files.set(SWATCH_FILE, JSON.stringify([{ name: '旧色', color: { hex: '000000' } }]))

    await expect(
      execute('style.appendGroupToSwatch', { kind: 'color', groupIndex: 0 }),
    ).resolves.toEqual({ ok: true })

    expect(JSON.parse(store.files.get(SWATCH_FILE) ?? 'null')).toEqual([
      { name: '旧色', color: { hex: '000000' } },
      { name: 'a', color: { hex: '111111' } },
      { name: 'b', color: { hex: '222222' } },
    ])
  })
})

describe('发送到色板后通知色板面板（原版 sendMessageToSeBan，:50216-50218 / :52917）', () => {
  it('四条发送/追加命令写完文件都发一次 GengXin', async () => {
    seed(COLOR_LIB, [{ name: '灰白', show: true, list: [{ name: 'a', color: { hex: '111111' } }] }])
    appEvents.sent.length = 0

    await execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 0 })
    await execute('style.appendItemToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 0 })
    await execute('style.sendGroupToSwatch', { kind: 'color', groupIndex: 0 })
    await execute('style.appendGroupToSwatch', { kind: 'color', groupIndex: 0 })

    expect(appEvents.sent).toEqual([
      { channel: 'com.fengzi.event.seban', data: 'GengXin' },
      { channel: 'com.fengzi.event.seban', data: 'GengXin' },
      { channel: 'com.fengzi.event.seban', data: 'GengXin' },
      { channel: 'com.fengzi.event.seban', data: 'GengXin' },
    ])
  })

  it('写失败不发 GengXin：文件没变，不该惊动另一个进程', async () => {
    appEvents.sent.length = 0

    await expect(
      execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 99 }),
    ).resolves.toMatchObject({ ok: false })

    expect(appEvents.sent).toEqual([])
  })
})

describe('style.appendGroup（原版 addGroupItem，:52470-52475）', () => {
  it('整份 push 到当前库末尾，字段原样保留（不补 id）', async () => {
    const group = {
      name: '客户色',
      show: true,
      list: [{ name: '未命名', color: { hex: 'FF0000' } }],
    }

    await expect(execute('style.appendGroup', { kind: 'color', group })).resolves.toEqual({
      ok: true,
    })

    const groups = (await read(COLOR_LIB)) as unknown[]
    expect(groups[1]).toEqual(group)
  })

  it('样式库的组也不补 id（官方 addGroupItem 不走 createGroupObject）', async () => {
    const group = { name: '客户样式', show: true, list: [] }

    await expect(execute('style.appendGroup', { kind: 'style', group })).resolves.toEqual({
      ok: true,
    })

    const groups = (await read(STYLE_LIB)) as Array<{ name: string; id?: string }>
    expect(groups.map((g) => g.name)).toEqual(['样式默认分组', '客户样式'])
    // 关键：没有 id —— 说明没拿 `createKuGroup`（会补 `YS<guid>`）凑
    expect(groups[1].id).toBeUndefined()
  })
})

// ---------- 第 5 段：仓库（只动索引 sj_kuStoreInfo.ini）----------

/** 两条仓库的索引（beforeEach 只写了一条） */
async function seedTwoWarehouses() {
  await styleIndexWriter.write({
    index: 0,
    list: [
      { name: '默认仓库', color: 'sj_kuColA.ini', gradient: 'sj_kuGraA.ini' },
      { name: '客户A', color: 'sj_kuColB.ini', gradient: 'sj_kuGraB.ini' },
    ],
  })
}

describe('style.selectWarehouse（原版 select，:53365-53372）', () => {
  it('写索引 index；越界归 0（含 == list.length 这条原版漏判）', async () => {
    await seedTwoWarehouses()

    await expect(execute('style.selectWarehouse', { index: 1 })).resolves.toEqual({ ok: true })
    expect(readValue(await styleIndexWriter.read()).index).toBe(1)

    await expect(execute('style.selectWarehouse', { index: 2 })).resolves.toEqual({ ok: true })
    expect(readValue(await styleIndexWriter.read()).index).toBe(0)
  })
})

describe('style.addWarehouse（原版 add / P_，:53357-53363）', () => {
  it('追加一条「未命名分组」，四个库文件名各自生成', async () => {
    await expect(execute('style.addWarehouse')).resolves.toEqual({ ok: true })

    const { list } = readValue(await styleIndexWriter.read())
    expect(list).toHaveLength(2)
    expect(list[1].name).toBe('未命名分组')
    expect(list[1].color).toMatch(/^sj_kuCol[0-9A-F]{16}\.json$/)
    expect(list[1].style).toMatch(/^sj_kuSty[0-9A-F]{16}\.json$/)
  })
})

describe('style.renameWarehouse（原版 rename，:53324-53327）', () => {
  it('空名 → ok:false，索引不变（有意偏离：原版不校验）', async () => {
    const result = await execute('style.renameWarehouse', { index: 0, name: '  ' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('仓库名不能为空')
    expect(readValue(await styleIndexWriter.read()).list[0].name).toBe('默认仓库')
  })

  it('正常改名写进索引', async () => {
    await expect(execute('style.renameWarehouse', { index: 0, name: '客户B' })).resolves.toEqual({
      ok: true,
    })
    expect(readValue(await styleIndexWriter.read()).list[0].name).toBe('客户B')
  })
})

describe('style.deleteWarehouse（原版 delete，:53329-53356）', () => {
  it('只剩一个仓库 → ok:false「最少保留一个分组哦」，索引不变', async () => {
    const result = await execute('style.deleteWarehouse', { index: 0 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('最少保留一个分组哦')
    expect(readValue(await styleIndexWriter.read()).list).toHaveLength(1)
  })

  it('两个仓库时删掉一个：索引少一条，库文件移进 .deleted- 目录（不硬删）', async () => {
    await seedTwoWarehouses()
    store.files.set(`${USER}/sj_kuColA.ini`, '[]')

    await expect(execute('style.deleteWarehouse', { index: 0 })).resolves.toEqual({ ok: true })

    expect(readValue(await styleIndexWriter.read()).list.map((w) => w.name)).toEqual(['客户A'])
    expect(store.files.has(`${USER}/sj_kuColA.ini`)).toBe(false)
    const recycled = [...store.files.keys()].filter((path) => path.includes('/.deleted-'))
    expect(recycled).toContainEqual(expect.stringMatching(/\/\.deleted-\d+\/sj_kuColA\.ini$/))
  })
})
