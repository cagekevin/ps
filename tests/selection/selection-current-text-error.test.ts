import { beforeEach, describe, expect, it, vi } from 'vitest'

const jsx = vi.hoisted(() => ({
  font: {
    getFontSimpleInfo: vi.fn(),
  },
}))

vi.mock('@/cep/jsx', () => ({ jsx }))
vi.mock('@/cep/ps', () => ({ initJsx: vi.fn(async () => undefined) }))

const { refreshTextInfo, textInfoError } = await import('@/selection/current-text')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('refreshTextInfo', () => {
  it('空选区 jsx 抛错时不 reject，只记录错误', async () => {
    jsx.font.getFontSimpleInfo.mockRejectedValue(new Error('没有文字图层'))

    await expect(refreshTextInfo()).resolves.toBeNull()
    expect(textInfoError.value).toContain('没有文字图层')
  })
})
