import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'
import { createPinia, setActivePinia } from 'pinia'
import { readValue } from '../support/repo-read'

const font = vi.hoisted(() => ({
  initSystemList: vi.fn(),
  setFont: vi.fn(),
  getTypeUnits: vi.fn(),
  getFontSimpleInfo: vi.fn(),
  getCurrentFontInfo: vi.fn(),
  getCurrentText: vi.fn(),
  getFontInfo: vi.fn(),
  setNumberSize: vi.fn(),
  setHierarchySize: vi.fn(),
  setLeading: vi.fn(),
  setTracking: vi.fn(),
  setColor: vi.fn(),
  setFontName: vi.fn(),
  setAllCaps: vi.fn(),
  setFontVision: vi.fn(),
  setFauxItalic: vi.fn(),
  setFauxBold: vi.fn(),
  setJustified: vi.fn(),
  setTextAlignment: vi.fn(),
  setHorizontalCenters: vi.fn(),
  setVerticalCenter: vi.fn(),
  setTextUpDownAlign: vi.fn(),
  setBackgroundAlign: vi.fn(),
  alignHorizontal: vi.fn(),
  distributeByPitch: vi.fn(),
  changeTextBranchMerge: vi.fn(),
  textBranchMerge: vi.fn(),
  createButton: vi.fn(),
  checkUseFont: vi.fn(),
  useFont: vi.fn(),
  switchFontDirection: vi.fn(),
  setTranslateText: vi.fn(),
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/cep/jsx', () => ({ jsx: { font } }))
vi.mock('@/cep/data/font-list', () => ({ getFontList: vi.fn() }))
vi.mock('@/cep/http', () => ({ jsonp: vi.fn() }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/selection/current-text', () => ({
  refreshTextInfo: vi.fn(),
  applyTextPatch: vi.fn(),
  normalizeTextColor: vi.fn(() => null),
  textInfoRef: { value: null },
  typeUnitsRef: { value: 'TypeUnits.POINTS' },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { jsonp } = await import('@/cep/http')
const { getFontList } = await import('@/cep/data/font-list')
const { translateCounterWriter } = await import('@/cep/data/font-extra')
const { __resetFontClipboardForTest } = await import('@/domain/font-set-clipboard')
const { decodeText } = await import('@/domain/translate')
const { useFontMissingStore } = await import('@/stores/font-missing')
const { setMissingFontPort, resetMissingFontPort } = await import('@/commands/runtime')
const { fontHistoryWriter } = await import('@/cep/data/font-extra')

const keeps = {
  scriptFamily: true,
  color: true,
  opacity: true,
  size: true,
  leading: true,
  tracking: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetFontClipboardForTest()
  // 缺字体提示已搬到 store：这里建一个 pinia，并接上与 main.ts 同形状的端口
  setActivePinia(createPinia())
  resetMissingFontPort()
  setMissingFontPort({ signal: (name) => useFontMissingStore().signal(name) })
  useFontMissingStore().clear()
  for (const fn of Object.values(font)) fn.mockResolvedValue({ ok: true, data: null })
  vi.mocked(getFontList).mockResolvedValue([])
})

describe('fontSet.align', () => {
  it('水平 0-2 只传一个参数，3 走居中分布', async () => {
    await execute('fontSet.align', { axis: 'h', index: 1 })
    expect(font.setTextAlignment).toHaveBeenCalledWith(1)

    await execute('fontSet.align', { axis: 'h', index: 3 })
    expect(font.setHorizontalCenters).toHaveBeenCalled()
  })

  it('垂直 3 走 zt_verticalCenter', async () => {
    await execute('fontSet.align', { axis: 'v', index: 3 })
    expect(font.setVerticalCenter).toHaveBeenCalled()
  })

  /**
   * 枚举外的 axis **不许猜默认行为**。
   * 以前 `axis === 'bg-h' ? 3 : 4` 让任何怪值都走"与背景垂直"并报成功——用户点了别的对齐，
   * 文档被按 bg-v 改了，界面还说成功。
   */
  it('枚举外 axis → PARSE，理由列出合法值，且一次 jsx 都不调', async () => {
    vi.clearAllMocks()

    const result = await execute('fontSet.align', { axis: 'diagonal', index: 0 })

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    if (result.ok === false) {
      expect(result.reason).toContain('diagonal')
      expect(result.reason).toContain('h / v / bg-h / bg-v')
    }
    expect(font.setBackgroundAlign).not.toHaveBeenCalled()
    expect(font.setTextAlignment).not.toHaveBeenCalled()
  })

  it('缺 axis 也拒绝（不是当成某个默认方向）', async () => {
    const result = await execute('fontSet.align', { index: 0 })

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    expect(font.setBackgroundAlign).not.toHaveBeenCalled()
  })

  it('与背景对齐固定传 3 / 4（无自由面板）', async () => {
    await execute('fontSet.align', { axis: 'bg-h', index: 0 })
    expect(font.setBackgroundAlign).toHaveBeenCalledWith(3)

    await execute('fontSet.align', { axis: 'bg-v', index: 0 })
    expect(font.setBackgroundAlign).toHaveBeenCalledWith(4)
  })
})

describe('fontSet.createButton 配置缺失（TD-12-25 后半）', () => {
  it('没有 config → PARSE 说清缺什么，不是英文 TypeError', async () => {
    const result = await execute('fontSet.createButton', {})

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    if (result.ok === false) {
      expect(result.reason).toContain('生成按钮缺少配置')
      expect(result.reason).not.toContain('Cannot read')
    }
    expect(font.createButton).not.toHaveBeenCalled()
  })

  it('config 缺字段 → 点名缺哪个字段，不调 jsx', async () => {
    const result = await execute('fontSet.createButton', {
      config: { type: 'wrong', isLine: true, padding: '10' },
    })

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    if (result.ok === false) expect(result.reason).toContain('type')
    expect(font.createButton).not.toHaveBeenCalled()
  })

  it('配置齐全照常执行', async () => {
    const result = await execute('fontSet.createButton', {
      config: { type: 1, isLine: false, padding: '10,20' },
    })

    expect(result).toMatchObject({ ok: true })
    expect(font.createButton).toHaveBeenCalledTimes(1)
  })
})

describe('fontSet.quickFont：平行数组不等长不许落盘（TD-12-27）', () => {
  /**
   * 以前：`hjm` 比 `zz` 短 → `sortQuickFont` 产出 `undefined` → JSON 写进用户的
   * `sj_fontSet.json`（undefined 变 null）→ 报错要等到几天后点「应用」才出现。
   * 现在：`update` 的 mutator 里抛 PARSE ⇒ 仓库存盘在 mutator 之后 ⇒ **压根没写**。
   */
  it('加不进去（PARSE 点名家族名），且快选文件一个字节都没动', async () => {
    const { quickFontWriter } = await import('@/cep/data/font-extra')
    const before = JSON.stringify(readValue(await quickFontWriter.read()))

    vi.mocked(getFontList).mockResolvedValue([
      {
        family: '坏字体',
        weights: ['Regular', 'Bold'],
        names: ['坏字体'], // ← 少一格
        postScriptNames: ['Bad-Regular', 'Bad-Bold'],
        star: 0,
      },
    ])
    font.getCurrentFontInfo.mockResolvedValue({ ok: true, data: { family: '坏字体' } })

    const result = await execute('fontSet.quickFont', { action: 'add' })

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    if (result.ok === false) {
      expect(result.reason).toContain('坏字体')
      expect(result.reason).toContain('已拒绝写入快选')
    }
    const after = JSON.stringify(readValue(await quickFontWriter.read()))
    expect(after).toBe(before)
  })
})

describe('fontSet.fontName 最近使用', () => {
  it('家族应用成功后写入最近列表，重复项提前', async () => {
    await fontHistoryWriter.write(['旧字体', 'MiSans'])
    font.setFontName.mockResolvedValue(undefined)

    await execute('fontSet.fontName', {
      kind: 'family',
      postScriptName: 'MiSans-Regular',
      name: 'MiSans Regular',
      weight: 'Regular',
      family: 'MiSans',
    })

    expect(readValue(await fontHistoryWriter.read()).slice(0, 2)).toEqual(['MiSans', '旧字体'])
  })
})

describe('fontSet.fontName 字体缺失', () => {
  it('code=1 时置位下载提示，不按普通失败 toast', async () => {
    // `write` 契约：`jsxWrite` 在生产者层抛 `CepError`（带 `hostCode`）⇒ mock 也该 reject
    font.setFontName.mockRejectedValue(new CepError('JSX', '字体缺失', 1))

    const result = await execute('fontSet.fontName', {
      kind: 'family',
      postScriptName: 'MissingPS',
      name: 'Missing Font',
      weight: 'Regular',
    })

    expect(result).toMatchObject({ ok: false, code: 'FONT_MISSING' })
    expect(useFontMissingStore().missingFont).toBe('Missing Font')
  })
})

describe('fontSet.split', () => {
  it('第一次探测失败时不执行第二次 jsx', async () => {
    font.changeTextBranchMerge.mockRejectedValue(new CepError('JSX', '请选择文本'))

    const result = await execute('fontSet.split', { mode: 1 })

    expect(result).toMatchObject({ ok: false, reason: '请选择文本' })
    expect(font.textBranchMerge).not.toHaveBeenCalled()
  })

  it('成功时两次调用都带同一 mode', async () => {
    await execute('fontSet.split', { mode: 3 })

    expect(font.changeTextBranchMerge).toHaveBeenCalledWith(3)
    expect(font.textBranchMerge).toHaveBeenCalledWith(3)
  })
})

describe('复制 / 粘贴文字属性', () => {
  it('没有复制过时直接失败，不调 jsx', async () => {
    const result = await execute('fontSet.pasteFont', { keeps })

    expect(result).toMatchObject({ ok: false, reason: '请先复制字体样式' })
    expect(font.useFont).not.toHaveBeenCalled()
  })

  it('勾掉的字段被写成 null，且不改剪贴板原件', async () => {
    font.getFontInfo.mockResolvedValue({
      ok: true,
      data: { fonts: [{ color: { r: 1, g: 2, b: 3 }, size: 12 }] },
    })
    await execute('fontSet.copyFont')

    await execute('fontSet.pasteFont', { keeps: { ...keeps, color: false } })

    const first = decodeText(vi.mocked(font.useFont).mock.calls[0][0] as string)
    expect(JSON.parse(first).fonts[0]).toEqual({ color: null, size: 12 })

    // 第二次粘贴读到的是原剪贴板，第一次的 null 不能污染它
    await execute('fontSet.pasteFont', { keeps })
    const second = decodeText(vi.mocked(font.useFont).mock.calls[1][0] as string)
    expect(JSON.parse(second).fonts[0].color).toEqual({ r: 1, g: 2, b: 3 })
  })
})

describe('fontSet.translate', () => {
  it('成功后写回 dst 并把每日计数 +1', async () => {
    font.getCurrentText.mockResolvedValue({ ok: true, data: [{ text: '设计' }] })
    vi.mocked(jsonp).mockResolvedValue({ trans_result: [{ dst: 'design' }] })

    const result = await execute('fontSet.translate', { from: 'zh', to: 'en', replace: true })

    expect(result.ok).toBe(true)
    const list = vi.mocked(font.setTranslateText).mock.calls[0][0] as Array<{ dst: string }>
    expect(decodeText(list[0].dst)).toBe('design')
    expect(font.setTranslateText).toHaveBeenCalledWith(expect.any(Array), true)

    const counter = await translateCounterWriter.read()
    expect(readValue(counter).num).toBe(1)
  })

  it('超过 1000 字不发起请求', async () => {
    font.getCurrentText.mockResolvedValue({
      ok: true,
      data: [{ text: 'x'.repeat(1001) }],
    })

    const result = await execute('fontSet.translate', { from: 'zh', to: 'en', replace: true })

    expect(result).toMatchObject({ ok: false })
    expect(jsonp).not.toHaveBeenCalled()
  })
})
