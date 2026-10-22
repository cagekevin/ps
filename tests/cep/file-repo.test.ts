import { beforeEach, describe, expect, it, vi } from 'vitest'

const fs = vi.hoisted(() => ({
  readTextSmart: vi.fn(),
  writeTextFile: vi.fn(),
  writeTextFileAtomic: vi.fn(),
}))

vi.mock('@/cep/fs', () => fs)

const { fileRepo } = await import('@/cep/data/file-repo')

beforeEach(() => {
  vi.clearAllMocks()
  fs.readTextSmart.mockResolvedValue(null)
  fs.writeTextFileAtomic.mockReturnValue(true)
})

describe('fileRepo requireExisting', () => {
  it('文件不存在时 update 拒绝写', async () => {
    const repo = fileRepo(
      () => '/tmp/config.json',
      () => ({}),
      { requireExisting: true },
    )

    await expect(repo.update((value) => Object.assign(value, { a: 1 }))).rejects.toThrow(
      '不存在，拒绝写入',
    )
    expect(fs.writeTextFileAtomic).not.toHaveBeenCalled()
    expect(fs.writeTextFile).not.toHaveBeenCalled()
  })

  it('文件存在时 update 正常写', async () => {
    fs.readTextSmart.mockResolvedValue('{}')
    const repo = fileRepo(
      () => '/tmp/config.json',
      () => ({}),
      { requireExisting: true },
    )

    await repo.update((value) => Object.assign(value, { a: 1 }))

    expect(fs.writeTextFileAtomic).toHaveBeenCalledWith('/tmp/config.json', '{"a":1}')
  })
})
