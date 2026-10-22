import { beforeEach, describe, expect, it, vi } from 'vitest'

/** 磁盘上的原文；`readTextSmart`（异步读）与 `readTextFile`（CAS 比对用的同步读）读的是同一份 */
const disk = vi.hoisted(() => ({ text: null as string | null }))

const fs = vi.hoisted(() => ({
  hasNode: () => true,
  readTextSmart: vi.fn(async () => disk.text),
  readTextFile: vi.fn(() => disk.text),
  writeTextFile: vi.fn((path: string, text: string) => {
    // .bak 之外的目标文件写成功后也算磁盘内容变了，但这两个用例不依赖细节
    if (!path.endsWith('.bak')) disk.text = text
  }),
  writeTextFileAtomic: vi.fn((path: string, text: string) => {
    disk.text = text
    return true
  }),
}))

vi.mock('@/cep/fs', () => fs)

const { fileRepo } = await import('@/cep/data/file-repo')

beforeEach(() => {
  vi.clearAllMocks()
  disk.text = null
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
    disk.text = '{}'
    const repo = fileRepo(
      () => '/tmp/config.json',
      () => ({}),
      { requireExisting: true },
    )

    await repo.update((value) => Object.assign(value, { a: 1 }))

    expect(fs.writeTextFileAtomic).toHaveBeenCalledWith('/tmp/config.json', '{"a":1}')
  })

  it('CAS 比对走同步读 readTextFile，不走 async 的 readTextSmart', async () => {
    disk.text = '{}'
    const repo = fileRepo(
      () => '/tmp/config.json',
      () => ({}),
    )

    await repo.update((value) => Object.assign(value, { a: 1 }))

    expect(fs.readTextFile).toHaveBeenCalledWith('/tmp/config.json')
  })
})
