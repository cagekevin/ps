import { beforeEach, describe, expect, it, vi } from 'vitest'
import { actionIndexRepo } from '@/cep/data/actions'
import { actionLibraryEntry } from '@/cep/cloud/entries/action-library'

const fsMock = vi.hoisted(() => ({
  readTextOutcome: vi.fn(),
  writeTextFileAtomic: vi.fn(() => true),
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
  fsMock.writeTextFileAtomic.mockReturnValue(true)
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
