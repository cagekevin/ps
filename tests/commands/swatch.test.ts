import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 色板面板 7 条命令（`commands/swatch.ts`）。
 *
 * 覆盖三件事：
 * 1. **每条命令的落点对得上官方 `sf.js`**（哪个文件、哪个 jsx、哪条文案）；
 * 2. **去重 / 裁剪的语义**：自定义色命中 hex 不加；最近色调小上限保最新（有意偏离官方，见 repo 注释）；
 * 3. **补不到的地方必须可见失败**：按钮 4 / 6 依赖色板面板自带的 `jsx/main.jsx`，
 *    本扩展的 jsxbin 里没有 → 命令抛带原因的错误，绝不静默无效（也不置灰）。
 *
 * 全部走内存 fs，不碰真实 `%APPDATA%`。
 */
const fsMock = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextOutcome: async (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFileAtomic: (path: string, text: string) => {
      fsMock.files.set(path, text)
      return true
    },
  writeTextFile: (path: string, text: string) => {
      fsMock.files.set(path, text)
    },
  readBase64Outcome: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined
        ? { status: 'notSeen' as const }
        : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
    },
  writeBase64File: (path: string, base64: string) => {
      fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
      return true
    },
  removeFile: (path: string) => {
      fsMock.files.delete(path)
      return { ok: true as const }
    },
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

const jsx = vi.hoisted(() => ({
  style: {
    getForegroundColor: vi.fn(),
    useStyleColor: vi.fn(),
    setForegroundColor: vi.fn(),
    setBorderColor: vi.fn(),
  },
  legacy: { call: vi.fn() },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

/** app event 通道：色板 → 主面板（`com.fengzi.event.seban`） */
const appEvents = vi.hoisted(() => ({
  sent: [] as Array<{ channel: string; data: unknown }>,
  handlers: new Map<string, (data: unknown) => void>(),
}))
vi.mock('@/cep/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/events')>()
  return {
    ...actual,
    sendAppEvent: (channel: string, data: unknown) => {
      appEvents.sent.push({ channel, data })
      return true
    },
    onAppEvent: (channel: string, handler: (data: unknown) => void) => {
      appEvents.handlers.set(channel, handler)
      return () => appEvents.handlers.delete(channel)
    },
  }
})

const openUrl = vi.hoisted(() => ({ openUrlInDefaultBrowser: vi.fn(), openUrl: vi.fn() }))
vi.mock('@/cep/open-url', () => openUrl)

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { styleIndexWriter } = await import('@/cep/data/style-library-repo')

const USER = 'ROAM/SheJiZhuLi'
const COLOR_LIB = `${USER}/sj_kuColA.ini`
const CUSTOM = 'ROAM/FengZiSeBan/userColor.ini'
const RECENT = 'ROAM/FengZiSeBan/vecently.ini'
const LIMIT = 'ROAM/FengZiSeBan/zuiJinShuLiang.txt'

/** 官方 `sb_ZhuanHuanYanSeDuiXiang` 的形状（`main.jsx:287-298`） */
const RED = { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } }
const BLUE = { name: '未命名', color: { hex: '0000FF', c: 100, m: 100, y: 0, k: 0 } }

function json(path: string): unknown {
  return JSON.parse(fsMock.files.get(path) ?? 'null')
}

beforeEach(async () => {
  vi.clearAllMocks()
  fsMock.files.clear()

  await styleIndexWriter.write({
    index: 0,
    list: [{ name: '默认仓库', color: 'sj_kuColA.ini' }],
  })
  fsMock.files.set(COLOR_LIB, JSON.stringify([{ name: '灰白', show: true, list: [] }]))

  jsx.style.getForegroundColor.mockResolvedValue({ ok: true, data: RED })
  jsx.style.useStyleColor.mockResolvedValue({ ok: true, data: null })
  jsx.style.setForegroundColor.mockResolvedValue({ ok: true, data: null })
  jsx.style.setBorderColor.mockResolvedValue({ ok: true, data: null })
  jsx.legacy.call.mockResolvedValue({ ok: true, data: null })

  appEvents.sent.length = 0
  appEvents.handlers.clear()

  // 智能填色开关落在 sj_set.json：每条用例都从"缺键 = 官方默认开"开始，防用例间互串
  const { legacySettingsWriter } = await import('@/cep/data/legacy-settings')
  await legacySettingsWriter.write({})
})

describe('按钮 1：seban.addForegroundColor（原版 TianJia，sf.js:377-382）', () => {
  it('读前景色 → 追加到 userColor.ini（不碰库文件）', async () => {
    await expect(execute('seban.addForegroundColor')).resolves.toEqual({ ok: true })

    expect(json(CUSTOM)).toEqual([RED])
    // 库文件不动
    expect(json(COLOR_LIB)).toEqual([{ name: '灰白', show: true, list: [] }])
  })

  it('命中 hex 不重复添加，且**报错而不是静默**（官方只闪色块，闪色块是 UI）', async () => {
    fsMock.files.set(CUSTOM, JSON.stringify([RED]))

    const result = await execute('seban.addForegroundColor')

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('已经有这个颜色')
    expect(json(CUSTOM)).toEqual([RED])
  })

  it('jsx 读不到前景色（null）→ ok:false，色板不动', async () => {
    jsx.style.getForegroundColor.mockResolvedValue({ ok: true, data: null })

    await expect(execute('seban.addForegroundColor')).resolves.toMatchObject({ ok: false })
    expect(fsMock.files.has(CUSTOM)).toBe(false)
  })
})

describe('按钮 2：seban.openAuthorSite（原版 GuanYu，sf.js:394-396）', () => {
  it('走系统浏览器打开 pszhuli.com（title 写"站酷"，URL 照抄不改）', async () => {
    await expect(execute('seban.openAuthorSite')).resolves.toEqual({ ok: true })
    expect(openUrl.openUrlInDefaultBrowser).toHaveBeenCalledWith('http://pszhuli.com')
  })
})

describe('按钮 3：seban.setRecentLimit（原版 SheZhi，sf.js:398-423）', () => {
  it('写数量文件，并把最近色裁到新上限——**保最新**（有意偏离官方，见 repo 注释）', async () => {
    const items = ['A', 'B', 'C', 'D', 'E'].map((hex) => ({ name: '未命名', color: { hex } }))
    fsMock.files.set(RECENT, JSON.stringify(items))

    await expect(execute('seban.setRecentLimit', { limit: 3 })).resolves.toEqual({ ok: true })

    expect(fsMock.files.get(LIMIT)).toBe('3')
    const kept = json(RECENT) as Array<{ color: { hex: string } }>
    expect(kept.map((item) => item.color.hex)).toEqual(['C', 'D', 'E'])
  })

  it('0 合法：清空最近色', async () => {
    fsMock.files.set(RECENT, JSON.stringify([{ name: '未命名', color: { hex: 'AABBCC' } }]))

    await expect(execute('seban.setRecentLimit', { limit: 0 })).resolves.toEqual({ ok: true })

    expect(fsMock.files.get(LIMIT)).toBe('0')
    expect(json(RECENT)).toEqual([])
  })

  it('越界 → 官方文案原样抛；数量没变，色板不动', async () => {
    const items = JSON.stringify([{ name: '未命名', color: { hex: 'AABBCC' } }])
    fsMock.files.set(RECENT, items)

    const tooBig = await execute('seban.setRecentLimit', { limit: 16 })
    expect(tooBig.ok).toBe(false)
    expect(tooBig.ok === false && tooBig.reason).toBe('最近使用记录不允许少于0或者多于15个颜色')

    const negative = await execute('seban.setRecentLimit', { limit: -1 })
    expect(negative.ok === false && negative.reason).toBe('最近使用记录不允许少于0或者多于15个颜色')

    expect(fsMock.files.has(LIMIT)).toBe(false)
    expect(fsMock.files.get(RECENT)).toBe(items)
  })

  it('不是整数 → "请输入数字"（官方 parseInt 后 isNaN 那条）', async () => {
    const result = await execute('seban.setRecentLimit', { limit: 2.5 })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('请输入数字')
  })
})

describe('按钮 5：seban.sendToAssistant（原版 faSongDaoZhuLi，sf.js:426-460）', () => {
  it('把自定义色整份包成 {name, show, list} 追加进当前库（落点 = style.appendGroup）', async () => {
    fsMock.files.set(CUSTOM, JSON.stringify([RED, BLUE]))

    await expect(
      execute('seban.sendToAssistant', { name: '  客户色  ', kind: 'color' }),
    ).resolves.toEqual({ ok: true })

    const groups = json(COLOR_LIB) as Array<{ name: string; show?: boolean; list: unknown[] }>
    expect(groups.map((group) => group.name)).toEqual(['灰白', '客户色'])
    expect(groups[1]).toEqual({ name: '客户色', show: true, list: [RED, BLUE] })
  })

  it('组名为空 → ok:false，库文件不动', async () => {
    const before = fsMock.files.get(COLOR_LIB)

    const result = await execute('seban.sendToAssistant', { name: '   ', kind: 'color' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('组名不能为空')
    expect(fsMock.files.get(COLOR_LIB)).toBe(before)
  })

  it('不写任何盘上文件以外的东西：自定义色文件一个字节都不变（官方这段写盘代码是注释掉的）', async () => {
    fsMock.files.set(CUSTOM, JSON.stringify([RED]))

    await execute('seban.sendToAssistant', { name: '客户色', kind: 'color' })

    expect(fsMock.files.get(CUSTOM)).toBe(JSON.stringify([RED]))
  })
})

describe('按钮 7：seban.swapWireframeFill（原版 DiaoHuanXingZhuangZhuanTai，sf.js:478-480）', () => {
  it('本地执行 cy_swapWireframeFill（不发事件：官方主面板也监听那个频道，两边都做会抵消）', async () => {
    await expect(execute('seban.swapWireframeFill')).resolves.toEqual({ ok: true })
    expect(jsx.legacy.call).toHaveBeenCalledWith('cy_swapWireframeFill', [], '填充线框互换')
  })

  it('没有选区 → 被 requires 拦下，不调 jsx', async () => {
    selection.hasSelection = false
    try {
      await expect(execute('seban.swapWireframeFill')).resolves.toMatchObject({ ok: false })
      expect(jsx.legacy.call).not.toHaveBeenCalled()
    } finally {
      selection.hasSelection = true
    }
  })
})

/**
 * 按钮 4 / 6：`sb_cy_HuoQuYanSe` / `sb_SheZhiXingZhuang` 在色板面板自带的 `jsx/main.jsx` 里，
 * 本扩展的 `lib/all.decrypted.js` 没有 → 必须**可见失败**（报错说清原因），不许置灰、不许静默。
 */
describe('按钮 4 / 6：依赖色板面板自带 jsx 的两条，补不到就可见失败', () => {
  it('seban.addLayerColor 报错并指向 jsx/main.jsx', async () => {
    const result = await execute('seban.addLayerColor')

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('sb_cy_HuoQuYanSe')
    expect(result.ok === false && result.reason).toContain('jsx/main.jsx')
    // 失败不能有副作用
    expect(fsMock.files.has(CUSTOM)).toBe(false)
  })

  it('seban.setShapeFill 报错并指向 jsx/main.jsx', async () => {
    const result = await execute('seban.setShapeFill', { target: 'fill' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('sb_SheZhiXingZhuang')
    expect(result.ok === false && result.reason).toContain('jsx/main.jsx')
  })
})

/**
 * 联动（用户 2026-10-24 定：只有这两条）。
 *
 * 分工：**色板只发事件、不执行**；主面板收到后按智能填色开关执行。
 * 官方 `sf.js` 发 `{type, data}` → `app.v4.js:17878` 的 `handleSeBanEvent` 收。
 */
describe('联动 1：色板侧只发事件（左键 setColor / 右键 setWireframeColor）', () => {
  it('左键发 setColor，且**不**调任何填色 jsx（执行在主面板）', async () => {
    await expect(execute('seban.sendColor', { item: RED })).resolves.toEqual({ ok: true })

    expect(appEvents.sent).toEqual([
      { channel: 'com.fengzi.event.seban', data: { type: 'setColor', data: RED } },
    ])
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()
    expect(jsx.style.setForegroundColor).not.toHaveBeenCalled()
  })

  it('右键发 setWireframeColor', async () => {
    await expect(execute('seban.sendWireframeColor', { item: BLUE })).resolves.toEqual({ ok: true })

    expect(appEvents.sent).toEqual([
      { channel: 'com.fengzi.event.seban', data: { type: 'setWireframeColor', data: BLUE } },
    ])
    expect(jsx.style.setBorderColor).not.toHaveBeenCalled()
  })

  it('项里没有 color → 报错且不发事件（不能让主面板收到脏数据）', async () => {
    const result = await execute('seban.sendColor', { item: { name: '未命名' } })

    expect(result.ok).toBe(false)
    expect(appEvents.sent).toEqual([])
  })
})

describe('联动 2：主面板侧执行（开关在 /commonUse，不在色板）', () => {
  it('智能填色**开**（缺键按开，官方默认 :65784）→ useStyleColor 且补 isFill:true', async () => {
    await expect(execute('seban.applyColor', { item: RED })).resolves.toEqual({ ok: true })

    expect(jsx.style.useStyleColor).toHaveBeenCalledWith({ ...RED, isFill: true })
    expect(jsx.style.setForegroundColor).not.toHaveBeenCalled()
  })

  it('智能填色**关**（sj_set.json 显式 false）→ 只设前景色，不动图层', async () => {
    // 走仓库写入而不是直写文件：`dataRepo()` 决定实现（内存 / 磁盘），直写文件在测试里读不到
    const { legacySettingsWriter } = await import('@/cep/data/legacy-settings')
    await legacySettingsWriter.write({ cyAutoFillColor: false })

    await expect(execute('seban.applyColor', { item: RED })).resolves.toEqual({ ok: true })

    expect(jsx.style.setForegroundColor).toHaveBeenCalledWith(RED)
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()
  })

  it('右键 → setBorderColor，**不补** isFill（官方 :17902-17906 只传项）', async () => {
    await expect(execute('seban.applyWireframeColor', { item: BLUE })).resolves.toEqual({
      ok: true,
    })

    expect(jsx.style.setBorderColor).toHaveBeenCalledWith(BLUE)
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()
  })
})

describe('接收端 bindSeBanReceiver（官方 handleSeBanEvent，:17878-17906）', () => {
  it('收到 setColor → 执行 applyColor；"GengXin" 是自己的广播，忽略', async () => {
    const { bindSeBanReceiver } = await import('@/commands/swatch')
    bindSeBanReceiver()

    const handler = appEvents.handlers.get('com.fengzi.event.seban')
    expect(handler).toBeTruthy()

    // 不是事件方向的消息（主面板发给色板的刷新信号）→ 不执行
    handler?.('GengXin')
    handler?.({ type: 'unknown', data: RED })
    await Promise.resolve()
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()

    // 真正的点击事件 → 走上色
    handler?.({ type: 'setColor', data: RED })
    await vi.waitFor(() => expect(jsx.style.useStyleColor).toHaveBeenCalled())
    expect(jsx.style.useStyleColor).toHaveBeenCalledWith({ ...RED, isFill: true })
  })
})
