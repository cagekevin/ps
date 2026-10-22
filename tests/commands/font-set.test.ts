import { beforeEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@/cep/ps', () => ({ getFontList: vi.fn() }))
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
const { getFontList } = await import('@/cep/ps')
const { translateCounterRepo } = await import('@/cep/data/font-extra')
const { __resetFontClipboardForTest } = await import('@/domain/font-set-clipboard')
const { decodeText } = await import('@/domain/translate')
const { clearMissingFont, missingFont } = await import('@/domain/font-missing')
const { fontHistoryRepo } = await import('@/cep/data/font-extra')

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
  clearMissingFont()
  for (const fn of Object.values(font)) fn.mockResolvedValue(null)
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

  it('与背景对齐固定传 3 / 4（无自由面板）', async () => {
    await execute('fontSet.align', { axis: 'bg-h', index: 0 })
    expect(font.setBackgroundAlign).toHaveBeenCalledWith(3)

    await execute('fontSet.align', { axis: 'bg-v', index: 0 })
    expect(font.setBackgroundAlign).toHaveBeenCalledWith(4)
  })
})

describe('fontSet.fontName 最近使用', () => {
  it('家族应用成功后写入最近列表，重复项提前', async () => {
    await fontHistoryRepo.write(['旧字体', 'MiSans'])
    font.setFontName.mockResolvedValue(null)

    await execute('fontSet.fontName', {
      kind: 'family',
      postScriptName: 'MiSans-Regular',
      name: 'MiSans Regular',
      weight: 'Regular',
      family: 'MiSans',
    })

    expect((await fontHistoryRepo.read()).value.slice(0, 2)).toEqual(['MiSans', '旧字体'])
  })
})

describe('fontSet.fontName 字体缺失', () => {
  it('code=1 时置位下载提示，不按普通失败 toast', async () => {
    font.setFontName.mockResolvedValue({ err: 1, code: 1, msg: '字体缺失' })

    const result = await execute('fontSet.fontName', {
      kind: 'family',
      postScriptName: 'MissingPS',
      name: 'Missing Font',
      weight: 'Regular',
    })

    expect(result).toMatchObject({ ok: false, code: 'FONT_MISSING' })
    expect(missingFont.value).toBe('Missing Font')
  })
})

describe('fontSet.split', () => {
  it('第一次探测失败时不执行第二次 jsx', async () => {
    font.changeTextBranchMerge.mockResolvedValue({ err: 1, msg: '请选择文本' })

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
      err: 0,
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
    font.getCurrentText.mockResolvedValue({ err: 0, data: [{ text: '设计' }] })
    vi.mocked(jsonp).mockResolvedValue({ trans_result: [{ dst: 'design' }] })

    const result = await execute('fontSet.translate', { from: 'zh', to: 'en', replace: true })

    expect(result.ok).toBe(true)
    const list = vi.mocked(font.setTranslateText).mock.calls[0][0] as Array<{ dst: string }>
    expect(decodeText(list[0].dst)).toBe('design')
    expect(font.setTranslateText).toHaveBeenCalledWith(expect.any(Array), true)

    const counter = await translateCounterRepo.read()
    expect(counter.value.num).toBe(1)
  })

  it('超过 1000 字不发起请求', async () => {
    font.getCurrentText.mockResolvedValue({
      err: 0,
      data: [{ text: 'x'.repeat(1001) }],
    })

    const result = await execute('fontSet.translate', { from: 'zh', to: 'en', replace: true })

    expect(result).toMatchObject({ ok: false })
    expect(jsonp).not.toHaveBeenCalled()
  })
})
