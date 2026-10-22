import { beforeEach, describe, expect, it, vi } from 'vitest'

const fs = vi.hoisted(() => ({
  userDir: () => '/user',
  readBase64File: vi.fn(),
  writeBase64File: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  removeFile: vi.fn(),
}))

const data = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  selectActionFile: vi.fn(),
}))

vi.mock('@/cep/fs', () => fs)
vi.mock('@/cep/data/actions', () => ({
  actionIndexRepo: { read: data.read, write: data.write },
  currentWarehouseFile: (index: { list: Array<{ fileName: string }> }) => index.list[0].fileName,
  selectActionFile: data.selectActionFile,
}))

const { exportActionArchive, importActionArchive } = await import('@/cep/data/action-archive')

function archive(fileName = 'sj_dz_old.json'): string {
  return JSON.stringify({
    arrFileData: [{ name: fileName, data: 'YmFzZTY0' }],
    store: {
      index: 0,
      list: [{ name: '导入仓库', fileName }],
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  fs.writeBase64File.mockReturnValue(true)
  data.write.mockResolvedValue(undefined)
  data.read.mockResolvedValue({
    value: { index: 0, list: [{ name: '当前仓库', fileName: 'sj_dz_current.json' }] },
  })
})

describe('action-archive', () => {
  it('替换：先写文件，再写索引，最后清理旧文件', async () => {
    fs.readTextFile.mockReturnValue(archive())

    await importActionArchive(false, '/tmp/import.dzx')

    const newName = fs.writeBase64File.mock.calls[0][0].replace('/user/', '')
    expect(newName).not.toBe('sj_dz_current.json')
    expect(data.write).toHaveBeenCalledWith({
      index: 0,
      list: [{ name: '导入仓库', fileName: newName }],
    })
    expect(fs.removeFile).toHaveBeenCalledWith('/user/sj_dz_current.json')
    expect(data.selectActionFile).toHaveBeenCalledWith(newName)
  })

  it('替换：写文件失败时不写索引、不删旧文件', async () => {
    fs.readTextFile.mockReturnValue(archive())
    fs.writeBase64File.mockReturnValue(false)

    await expect(importActionArchive(false, '/tmp/import.dzx')).rejects.toThrow('写入仓库失败')

    expect(data.write).not.toHaveBeenCalled()
    expect(fs.removeFile).not.toHaveBeenCalled()
  })

  it('追加：保留当前索引并追加新仓库', async () => {
    fs.readTextFile.mockReturnValue(archive())

    await importActionArchive(true, '/tmp/import.dzx')

    const next = data.write.mock.calls[0][0]
    expect(next.list).toHaveLength(2)
    expect(next.list[0].fileName).toBe('sj_dz_current.json')
    expect(next.index).toBe(1)
    expect(fs.removeFile).not.toHaveBeenCalled()
  })

  it('导出当前只读取当前仓库文件', async () => {
    fs.readBase64File.mockReturnValue('YmFzZTY0')

    await exportActionArchive(true, '/tmp/export.dzx')

    expect(fs.readBase64File).toHaveBeenCalledTimes(1)
    expect(fs.readBase64File).toHaveBeenCalledWith('/user/sj_dz_current.json')
    expect(fs.writeTextFile).toHaveBeenCalledWith('/tmp/export.dzx', expect.any(String))
  })
})
