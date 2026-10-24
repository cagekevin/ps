import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WriteOutcome } from '@/cep/fs'
import { actionIndexRepo } from '@/cep/data/actions'
import { actionLibraryEntry } from '@/cep/cloud/entries/action-library'

const fsMock = vi.hoisted(() => ({
  readTextOutcome: vi.fn(),
  writeTextFileAtomic: vi.fn<(p: string, text: string) => WriteOutcome>(() => ({ status: 'ok' })),
  writeTextFile: vi.fn(),
}))

vi.mock('@/cep/fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/fs')>()
  return {
    ...actual,
    userDir: () => '/user',
    ...fsMock,
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await actionIndexRepo.write({
    index: 0,
    list: [{ name: '默认仓库', fileName: 'sj_dz_test.json' }],
  })
  fsMock.readTextOutcome.mockResolvedValue({ status: 'ok', text: '[]' })
  fsMock.writeTextFileAtomic.mockReturnValue({ status: 'ok' as const })
})

describe('action.library 云同步', () => {
  it('索引和所有仓库文件一起读', async () => {
    const payload = await actionLibraryEntry.read()
    expect(payload.files.map((file) => file.path)).toEqual([
      '/sj_dzStoreInfo.json',
      '/sj_dz_test.json',
    ])
  })

  it('缺仓库文件时明确失败', async () => {
    fsMock.readTextOutcome.mockResolvedValue({ status: 'notSeen' })
    await expect(actionLibraryEntry.read()).rejects.toThrow('不存在')
  })

  /**
   * T-116：**"读不到"与"不存在"必须分开报**。
   *
   * 两者都中止上传（动作相同），但用户该做的事不同：文件不在 = 索引指向了已删的仓库，
   * 去重建；读不到 = 关掉占用它的程序再试。以前都说"不存在"，后者会让用户白折腾。
   */
  it('仓库文件读不到（EPERM）→ 报"读不到"，不是"不存在"', async () => {
    fsMock.readTextOutcome.mockResolvedValue({
      status: 'error',
      reason: 'EPERM: operation not permitted',
    })

    const failed = actionLibraryEntry.read()
    await expect(failed).rejects.toThrow('读不到')
    await expect(failed).rejects.toThrow('EPERM')
    await expect(failed).rejects.not.toThrow('不存在')
  })

  it('写回先写仓库文件，再写索引', async () => {
    const payload = await actionLibraryEntry.read()
    const changed = payload.files.map((file) =>
      file.path === '/sj_dz_test.json'
        ? {
            ...file,
            content: {
              kind: 'inline' as const,
              data: '[{"groupName":"新分组","show":true,"list":[]}]',
              encoding: 'json' as const,
            },
          }
        : file,
    )

    const result = await actionLibraryEntry.write({ ...payload, files: changed })

    expect(result.ok).toBe(true)
    expect(fsMock.writeTextFileAtomic).toHaveBeenCalledWith(
      '/user/sj_dz_test.json',
      '[{"groupName":"新分组","show":true,"list":[]}]',
    )
  })
})
