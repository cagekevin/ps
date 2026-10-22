import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FontItem } from '@/cep/types'

/**
 * 写 PS 文档的能力只在命令里（`ps.ts` 已不保留写函数）。
 * 这里验三件事：参数顺序、`err:1` 必须失败、缺 PostScript 名时不调 jsx。
 */
const jsx = vi.hoisted(() => ({
  font: { initSystemList: vi.fn(), setFont: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/cep/jsx', () => ({ jsx }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/data', () => ({ starsRepo: {}, tagsRepo: {} }))
vi.mock('@/cep/data/settings', () => ({ settingsSnapshot: () => ({}) }))

await import('@/commands')
const { execute } = await import('@/commands/registry')

const font: FontItem = {
  family: 'MiSans',
  weights: ['Regular', 'Bold'],
  names: ['MiSans', 'MiSans Bold'],
  postScriptNames: ['MiSans-Regular', 'MiSans-Bold'],
}

beforeEach(() => {
  vi.clearAllMocks()
  jsx.font.setFont.mockResolvedValue(null)
})

describe('font.apply', () => {
  it('按 hjm / mz / zz 顺序传参', async () => {
    await expect(execute('font.apply', { font, variantIndex: 1 })).resolves.toEqual({ ok: true })
    expect(jsx.font.setFont).toHaveBeenCalledWith('MiSans-Bold', 'MiSans Bold', 'Bold')
  })

  it('jsx 返回 err:1 时必须失败（否则界面会显示成功）', async () => {
    jsx.font.setFont.mockResolvedValue({ err: 1, msg: '字体未安装' })

    const result = await execute('font.apply', { font, variantIndex: 0 })

    expect(result).toMatchObject({ ok: false, reason: '字体未安装', code: 'JSX' })
  })

  it('缺少 PostScript 名时直接失败，不调 jsx', async () => {
    const broken: FontItem = { ...font, postScriptNames: [] }

    const result = await execute('font.apply', { font: broken, variantIndex: 0 })

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    expect(jsx.font.setFont).not.toHaveBeenCalled()
  })
})
