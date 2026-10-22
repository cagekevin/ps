import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLOR_COUNT,
  DEFAULT_TARGET_WIDTH,
  extractImageColors,
  extractPalette,
  quantizeColors,
  resolveTargetSize,
  type CanvasContext2DLike,
  type RgbaImage,
} from '@/domain/image-color'

/** 造一幅图：按 rowColors 逐行铺，每行重复 width 次 */
function makeImage(rowColors: Array<[number, number, number, number]>, width = 10): RgbaImage {
  const height = rowColors.length
  const data = new Uint8ClampedArray(width * height * 4)
  rowColors.forEach(([r, g, b, a], y) => {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  })
  return { data, width, height }
}

/**
 * 造"常见色"图：每种颜色铺 `rowsPerColor` 行。
 *
 * 原版 `eS` 按像素数 50 分箱，且两箱的合并容差分别是 50 / 100 ——
 * 每色至少 3 行 × 20 列 = 60 像素才进"常见"箱（容差 50），
 * 颜色两两至少有一个通道差 85 才不会被容差并掉。所以行宽固定 20、
 * 每色 3 行，这样才测得出"12 条互不相并的颜色"。 */
const WIDE = 20
function makeCommonColors(colors: Array<[number, number, number, number]>): RgbaImage {
  const rows: Array<[number, number, number, number]> = []
  for (const color of colors) {
    for (let i = 0; i < 3; i++) rows.push(color)
  }
  return makeImage(rows, WIDE)
}

/** 12 种两两不相近的颜色（取自 {0,85,170,255}^3，任意两种至少一通道差 85） */
const TWELVE: Array<[number, number, number, number]> = [
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255],
  [255, 255, 0, 255],
  [255, 0, 255, 255],
  [0, 255, 255, 255],
  [85, 0, 0, 255],
  [0, 85, 0, 255],
  [0, 0, 85, 255],
  [170, 0, 0, 255],
  [0, 170, 0, 255],
  [0, 0, 170, 255],
]

/** 统计某 hex 在结果里的占比 */
function numOf(colors: Array<{ hex: string; num: number }>, hex: string): number | undefined {
  return colors.find((c) => c.hex === hex)?.num
}

describe('quantizeColors：计数与占比（原版 eS）', () => {
  it('四种颜色各 25% 时占比为 0.25 且合计 1', () => {
    const image = makeImage([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 0, 255],
    ])
    const colors = quantizeColors(image)
    expect(colors).toHaveLength(4)
    expect(colors.map((c) => c.num)).toEqual([0.25, 0.25, 0.25, 0.25])
    expect(colors.map((c) => c.hex).sort()).toEqual(['#0000ff', '#00ff00', '#ff0000', '#ffff00'])
  })

  it('颜色占比不同时，占比等于像素数比例（红色 50% / 蓝色 50%）', () => {
    const image = makeImage([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
      [0, 0, 255, 255],
    ])
    const colors = quantizeColors(image)
    expect(numOf(colors, '#ff0000')).toBeCloseTo(0.5, 10)
    expect(numOf(colors, '#0000ff')).toBeCloseTo(0.5, 10)
  })

  it('常见色排在前、稀有色排在后（原版 common.concat(rare)）', () => {
    // 红 120 像素 / 绿 80 像素 / 蓝 20 像素：红绿进常见箱（按像素数降序），蓝进稀有箱
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 6; i++) rows.push([255, 0, 0, 255])
    for (let i = 0; i < 4; i++) rows.push([0, 255, 0, 255])
    rows.push([0, 0, 255, 255])
    rows.push([0, 0, 255, 255])
    expect(quantizeColors(makeImage(rows, WIDE)).map((c) => c.hex)).toEqual([
      '#ff0000',
      '#00ff00',
      '#0000ff',
    ])
  })

  it('同色不同 alpha 是两个键：透明像素被原版 Z_ 写成白色（不"修"）', () => {
    const image = makeImage([
      [255, 0, 0, 255],
      [255, 0, 0, 0],
    ])
    const colors = quantizeColors(image)
    expect(colors.map((c) => c.hex).sort()).toEqual(['#ff0000', '#ffffff'])
  })

  it('hex 为 #rrggbb 小写六位格式', () => {
    const image = makeImage([[1, 2, 3, 255]])
    for (const color of quantizeColors(image)) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('空输入（0×0 图）返回空数组，不抛错', () => {
    expect(quantizeColors({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toEqual([])
  })

  it('data 长度不是 4 的倍数时忽略余下字节，不产出残缺键', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 9, 9])
    const colors = quantizeColors({ data, width: 1, height: 1 })
    expect(colors).toEqual([{ hex: '#ff0000', num: 1 }])
  })

  it('单色输入只返回一条', () => {
    const image = makeImage([[128, 128, 128, 255]])
    expect(quantizeColors(image)).toEqual([{ hex: '#808080', num: 1 }])
  })

  it('相近颜色按容差合并：三通道差 ≤50 视为同色', () => {
    const image = makeImage([
      [200, 200, 200, 255],
      [230, 230, 230, 255],
      [20, 20, 20, 255],
    ])
    const colors = quantizeColors(image)
    expect(colors).toHaveLength(2)
    const white = colors.find((c) => c.hex === '#c8c8c8')
    expect(white).toBeDefined()
    expect(numOf(colors, '#c8c8c8')).toBeCloseTo(2 / 3, 10)
    expect(numOf(colors, '#141414')).toBeCloseTo(1 / 3, 10)
  })

  it('互不相近的 12 色全部保留（容差 50 不会误并）', () => {
    const colors = quantizeColors(makeCommonColors(TWELVE))
    expect(colors).toHaveLength(12)
    expect(new Set(colors.map((c) => c.hex)).size).toBe(12)
  })
})

describe('extractPalette：截断与百分比（原版 nS 后半段）', () => {
  it('count 超过实际颜色数时不报错，返回全部', () => {
    const image = makeImage([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
    ])
    const palette = extractPalette(image, { count: DEFAULT_COLOR_COUNT })
    expect(palette).toHaveLength(2)
  })

  it('count = 10（原版 getImgHex 的固定值）在 12 色图上截到 10 条', () => {
    const palette = extractPalette(makeCommonColors(TWELVE), { count: DEFAULT_COLOR_COUNT })
    expect(palette).toHaveLength(DEFAULT_COLOR_COUNT)
  })

  it('不传 count 不截断，返回量化出的全部颜色', () => {
    expect(extractPalette(makeCommonColors(TWELVE))).toHaveLength(12)
  })

  it('百分比按截断后的合计重新归一，不是整幅图的占比', () => {
    // 红 120 / 绿 80 / 蓝 60 像素；截到 2 色后按 200 重算，而不是按 260
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 6; i++) rows.push([255, 0, 0, 255])
    for (let i = 0; i < 4; i++) rows.push([0, 255, 0, 255])
    for (let i = 0; i < 3; i++) rows.push([0, 0, 255, 255])
    const image = makeImage(rows, WIDE)
    expect(extractPalette(image, { count: 2 }).map((c) => [c.hex, c.num])).toEqual([
      ['#ff0000', 60],
      ['#00ff00', 40],
    ])
    expect(extractPalette(image).map((c) => [c.hex, c.num])).toEqual([
      ['#ff0000', 46],
      ['#00ff00', 31],
      ['#0000ff', 23],
    ])
  })

  it('占比一律 ≥ 8% 且为整数（原版 54550-54552）', () => {
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 9; i++) rows.push([255, 0, 0, 255])
    rows.push([0, 0, 255, 255])
    const palette = extractPalette(makeImage(rows))
    expect(palette).toHaveLength(2)
    for (const color of palette) {
      expect(color.num).toBeGreaterThanOrEqual(8)
      expect(Number.isInteger(color.num)).toBe(true)
    }
    expect(numOf(palette, '#ff0000')).toBe(90)
    expect(numOf(palette, '#0000ff')).toBe(10)
  })

  it('极小占比被抬到 8%（原版 54550-54552）', () => {
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 99; i++) rows.push([255, 0, 0, 255])
    rows.push([0, 255, 0, 255])
    const palette = extractPalette(makeImage(rows))
    expect(numOf(palette, '#00ff00')).toBe(8)
  })

  it('结果按占比降序', () => {
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 5; i++) rows.push([255, 0, 0, 255])
    for (let i = 0; i < 3; i++) rows.push([0, 255, 0, 255])
    for (let i = 0; i < 2; i++) rows.push([0, 0, 255, 255])
    const nums = extractPalette(makeImage(rows)).map((c) => c.num)
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i - 1]).toBeGreaterThanOrEqual(nums[i])
    }
  })

  it('空输入返回空数组（原版走 "解析图片失败" 提示，不崩）', () => {
    expect(extractPalette({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toEqual([])
  })

  it('单色输入返回该色且占比 100', () => {
    const palette = extractPalette(makeImage([[12, 34, 56, 255]]))
    expect(palette).toEqual([{ hex: '#0c2238', num: 100 }])
  })
})

describe('resolveTargetSize：目标尺寸数学（原版 54510-54520）', () => {
  it('targetWidth 350 时定宽 350、高度按原比例换算', () => {
    expect(resolveTargetSize(700, 200, DEFAULT_TARGET_WIDTH)).toEqual({
      width: 350,
      height: 100,
    })
  })

  it('targetWidth <= 1 按比例缩放（0.5 → 减半）', () => {
    expect(resolveTargetSize(300, 120, 0.5)).toEqual({ width: 150, height: 60 })
  })

  it('非正尺寸抛错，不静默产出 Infinity 尺寸', () => {
    expect(() => resolveTargetSize(0, 100, 350)).toThrow(/尺寸非法/)
    expect(() => resolveTargetSize(100, 0, 350)).toThrow(/尺寸非法/)
    expect(() => resolveTargetSize(100, 100, 0)).toThrow(/尺寸非法/)
  })
})

describe('canvas 缝：缺注入必须抛错（不静默回退）', () => {
  it('image 源不给 createCanvas 时报错', async () => {
    await expect(
      extractImageColors({ kind: 'image', image: { width: 10, height: 10 } }),
    ).rejects.toThrow(/createCanvas/)
  })

  it('dataUrl 源不给 decode / createCanvas 时报错', async () => {
    await expect(
      extractImageColors({ kind: 'dataUrl', dataUrl: 'data:image/png;base64,xx' }),
    ).rejects.toThrow(/decode/)
  })

  it('canvas 拿不到 2d 上下文时报错（jsdom 无 canvas 包时正是这条）', async () => {
    await expect(
      extractImageColors(
        { kind: 'image', image: { width: 10, height: 10 } },
        { createCanvas: (w, h) => ({ width: w, height: h, getContext: () => null }) },
      ),
    ).rejects.toThrow(/2d 上下文/)
  })

  it('注入 canvas 时取色走完整链路（像素来源是注入的，不依赖 jsdom 真实 canvas）', async () => {
    const rows: Array<[number, number, number, number]> = []
    for (let i = 0; i < 8; i++) rows.push([255, 0, 0, 255])
    for (let i = 0; i < 2; i++) rows.push([0, 0, 255, 255])
    const source = makeImage(rows)

    const ctx: CanvasContext2DLike = {
      clearRect: () => {},
      drawImage: () => {},
      getImageData: () => source,
    }
    const colors = await extractImageColors(
      { kind: 'image', image: { width: source.width, height: source.height } },
      {
        createCanvas: (w, h) => ({ width: w, height: h, getContext: () => ctx }),
        count: 10,
      },
    )
    expect(colors.map((c) => c.hex).sort()).toEqual(['#0000ff', '#ff0000'])
    expect(numOf(colors, '#ff0000')).toBe(80)
    expect(numOf(colors, '#0000ff')).toBe(20)
  })

  it('dataUrl 源：先注入 decode 再注入 canvas，两步都走', async () => {
    const source = makeImage([[1, 2, 3, 255]])
    let seenUrl = ''
    const colors = await extractImageColors(
      { kind: 'dataUrl', dataUrl: 'data:image/png;base64,AA' },
      {
        decode: (url) => {
          seenUrl = url
          return { width: source.width, height: source.height }
        },
        createCanvas: (w, h) => ({
          width: w,
          height: h,
          getContext: () => ({
            clearRect: () => {},
            drawImage: () => {},
            getImageData: () => source,
          }),
        }),
      },
    )
    expect(seenUrl).toBe('data:image/png;base64,AA')
    expect(colors).toEqual([{ hex: '#010203', num: 100 }])
  })
})
