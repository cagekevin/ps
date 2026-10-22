// 契约测试，非实机：文件读写全部 mock，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fsMock = vi.hoisted(() => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  writeTextFileAtomic: vi.fn(() => true),
}))

vi.mock('@/cep/fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/fs')>()
  return {
    ...actual,
    userDir: () => '/user',
    ...fsMock,
  }
})

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const { readCloudLedger, writeCloudLedger } = await import('@/cep/cloud/ledger')

beforeEach(() => {
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  fsMock.readTextFile.mockReset()
  fsMock.writeTextFileAtomic.mockReset().mockReturnValue(true)
  fsMock.writeTextFile.mockReset()
})

afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

describe('云同步台账（per-unit 指纹）', () => {
  it('老台账（只有 localHash）仍然可读，units 缺省', () => {
    fsMock.readTextFile.mockReturnValue(JSON.stringify({ rev: 3, syncedAt: 100, localHash: 'h' }))

    expect(readCloudLedger()).toEqual({ rev: 3, syncedAt: 100, localHash: 'h' })
  })

  it('新台账读回 per-unit 指纹', () => {
    fsMock.readTextFile.mockReturnValue(
      JSON.stringify({
        rev: 4,
        syncedAt: 200,
        localHash: 'h',
        units: { 'font.tags': 'a', 'font.hierarchy': 'b' },
      }),
    )

    expect(readCloudLedger()).toEqual({
      rev: 4,
      syncedAt: 200,
      localHash: 'h',
      units: { 'font.tags': 'a', 'font.hierarchy': 'b' },
    })
  })

  it('脏 units（非对象 / 空值）当作没有依据，不猜', () => {
    for (const units of [[], 'x', null, { 'font.tags': 1 }, {}]) {
      fsMock.readTextFile.mockReturnValue(JSON.stringify({ rev: 1, localHash: 'h', units }))
      expect(readCloudLedger()).toEqual({ rev: 1, syncedAt: 0, localHash: 'h' })
    }
  })

  it('没有 localHash 视为没有台账', () => {
    fsMock.readTextFile.mockReturnValue(JSON.stringify({ rev: 1 }))
    expect(readCloudLedger()).toBeNull()
  })

  it('写入时把 units 一起落盘', () => {
    writeCloudLedger({ rev: 5, syncedAt: 1, localHash: 'h', units: { 'action.library': 'z' } })

    const written = JSON.parse(String(fsMock.writeTextFileAtomic.mock.calls[0][1])) as unknown
    expect(written).toEqual({
      rev: 5,
      syncedAt: 1,
      localHash: 'h',
      units: { 'action.library': 'z' },
    })
  })
})
