// 契约测试，非实机：文件读写全部 mock，全程零网络
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type WriteOutcome } from '@/cep/disk-write'

/**
 * 云同步台账（T-114）。
 *
 * 这一版的核心断言只有一条：**"读不到"与"没有"必须分得开**。
 * 以前两者都是 `null`，下游据此报 `hasLedger:false` / `rev:0`，设置页显示
 * "本地还没有同步记录，先点「从云端拉取」"——用户可能点「上传」把云端覆盖掉。
 */
const fsMock = vi.hoisted(() => ({
  /** 磁盘状态：`ok` 用 `text`，`notSeen` / `error` 走它自己的 status */
  read: { status: 'ok' as 'ok' | 'notSeen' | 'error', text: '', reason: '' },
  writeTextFile: vi.fn<(absPath: string, text: string) => void>(),
  writeTextFileAtomic: vi.fn<(absPath: string, text: string) => WriteOutcome>(() => ({
    status: 'ok',
  })),
}))

vi.mock('@/cep/fs-read', () => ({
  const actual = await importOriginal<typeof import('@/cep/fs')>()
    return {
      ...actual,
      userDir: () => '/user',
      readTextOutcome: async () => {
        if (fsMock.read.status === 'error') {
          return { status: 'error' as const, reason: fsMock.read.reason }
        }
        if (fsMock.read.status === 'notSeen') return { status: 'notSeen' as const }
        return { status: 'ok' as const, text: fsMock.read.text }
      },
      writeTextFile: fsMock.writeTextFile,
      writeTextFileAtomic: fsMock.writeTextFileAtomic,
    },
}))

const fetchGuard = vi.fn(() => {
  throw new Error('契约测试，非实机：禁止真实网络请求')
})

const { readCloudLedger, writeCloudLedger } = await import('@/cep/cloud/ledger')

/** 磁盘上有一份合法台账 */
function setDisk(text: string): void {
  fsMock.read.status = 'ok'
  fsMock.read.text = text
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchGuard)
  fetchGuard.mockClear()
  fsMock.read = { status: 'notSeen', text: '', reason: '' }
  fsMock.writeTextFileAtomic.mockReset().mockReturnValue({ status: 'ok' as const })
  fsMock.writeTextFile.mockReset()
})

afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

describe('云同步台账（per-unit 指纹）', () => {
  it('老台账（只有 localHash）仍然可读，units 缺省', async () => {
    setDisk(JSON.stringify({ rev: 3, syncedAt: 100, localHash: 'h' }))

    expect(await readCloudLedger()).toEqual({
      status: 'ok',
      ledger: { rev: 3, syncedAt: 100, localHash: 'h' },
    })
  })

  it('新台账读回 per-unit 指纹', async () => {
    setDisk(
      JSON.stringify({
        rev: 4,
        syncedAt: 200,
        localHash: 'h',
        units: { 'font.tags': 'a', 'font.hierarchy': 'b' },
      }),
    )

    expect(await readCloudLedger()).toEqual({
      status: 'ok',
      ledger: {
        rev: 4,
        syncedAt: 200,
        localHash: 'h',
        units: { 'font.tags': 'a', 'font.hierarchy': 'b' },
      },
    })
  })

  it('脏 units（非对象 / 空值）当作没有依据，不猜', async () => {
    for (const units of [[], 'x', null, { 'font.tags': 1 }, {}]) {
      setDisk(JSON.stringify({ rev: 1, localHash: 'h', units }))
      expect(await readCloudLedger()).toEqual({
        status: 'ok',
        ledger: { rev: 1, syncedAt: 0, localHash: 'h' },
      })
    }
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

/**
 * 判据 A：**"读不到"与"没有"必须分得开**（T-114）。
 *
 * 这两条是本次修 bug 的核心断言：`EPERM` 曾经也返回 `null`，于是坏台账被读成
 * "从来没有同步过"，`decideUpload` 判成 `cloud-newer`，用户一确认就把云端覆盖了。
 */
describe('台账三态：读不到 ≠ 没有（T-114）', () => {
  it('文件不在（ENOENT）→ none：这才是"首次使用"', async () => {
    fsMock.read.status = 'notSeen'

    expect(await readCloudLedger()).toEqual({ status: 'none' })
  })

  it('文件在、但读不到（EPERM）→ broken，不许是 none', async () => {
    fsMock.read.status = 'error'
    fsMock.read.reason = 'EPERM: operation not permitted'

    const read = await readCloudLedger()

    expect(read.status).toBe('broken')
    expect(read.status === 'broken' ? read.reason : '').toContain('EPERM')
  })

  it('不是合法 JSON → broken（不是 none：文件在，只是内容坏了）', async () => {
    setDisk('{坏台账')

    expect(await readCloudLedger()).toMatchObject({ status: 'broken' })
  })

  it('缺 localHash → broken（不是 none：有文件却认不出"上次同步到哪"）', async () => {
    setDisk(JSON.stringify({ rev: 1 }))

    expect(await readCloudLedger()).toMatchObject({ status: 'broken' })
  })
})
