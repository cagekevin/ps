import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-13-9：选区快照不许把「读失败」折成「没有选中」。
 *
 * `0` 是「非文字图层」的合法编码，`false` 是「没选中」的合法值——
 * 两者都是**结论**，不能同时兼任「读不懂」的代表。这里逐条钉住区间边界：
 * 读成功才产出快照，读不懂一律 `PARSE` 抛给调用方（再由 registry 带给用户）。
 */

const jsx = vi.hoisted(() => ({
  layer: {
    isSelectLayer: vi.fn(),
    getTypeNumber: vi.fn(),
  },
}))

vi.mock('@/cep/jsx', () => ({ jsx }))

const { getLayerState } = await import('@/cep/ps')

beforeEach(() => {
  jsx.layer.isSelectLayer.mockReset()
  jsx.layer.getTypeNumber.mockReset()
})

describe('getLayerState', () => {
  it('布尔 + 有限数 → 正常快照', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: true })
    jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: 2 })

    await expect(getLayerState()).resolves.toEqual({ hasSelection: true, typeNumber: 2 })
  })

  it('字符串形态也认（jsxCall 原样返回字符串时）', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: 'false' })
    jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: '7' })

    await expect(getLayerState()).resolves.toEqual({ hasSelection: false, typeNumber: 7 })
  })

  it('类型号读不懂时抛 PARSE，不产 typeNumber=0（0 是合法的「非文字图层」）', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: true })
    // 宿主返回了但解码不认识（`undefined` 不是合法类型号）⇒ 失败臂 PARSE
    jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: undefined })

    await expect(getLayerState()).rejects.toMatchObject({ code: 'PARSE' })
    await expect(getLayerState()).rejects.toThrow('Layer_getTypeNumber')
  })

  it('空串 / 非数字 / NaN 都不当 0', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: true })
    for (const bad of ['', '  ', 'abc', Number.NaN, null, { a: 1 }]) {
      jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: bad })
      await expect(getLayerState()).rejects.toMatchObject({ code: 'PARSE' })
    }
  })

  it('有没有选中读不懂时抛 PARSE，不产 hasSelection=false', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: undefined })
    jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: 2 })

    await expect(getLayerState()).rejects.toMatchObject({ code: 'PARSE' })
    await expect(getLayerState()).rejects.toThrow('Layer_isSelectLayer')
  })

  it('失败路径不产出「没选中」形状的快照（旧实现会返回 {false, 0}）', async () => {
    jsx.layer.isSelectLayer.mockResolvedValue({ ok: true, data: undefined })
    jsx.layer.getTypeNumber.mockResolvedValue({ ok: true, data: undefined })

    await expect(getLayerState()).rejects.toBeInstanceOf(Error)
    // 旧实现返回 { hasSelection: false, typeNumber: 0 }，与「真的没选中」同值
    await expect(getLayerState()).rejects.not.toEqual({ hasSelection: false, typeNumber: 0 })
  })
})
