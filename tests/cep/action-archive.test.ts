import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TextRead } from '@/cep/fs'
import type { ActionWarehouseIndex } from '@/domain/action'
import type { Repo, RepoRead } from '@/cep/data/types'

const fs = vi.hoisted(() => ({
  userDir: () => '/user',
  // T-109：base64 读也是三态（`{ status:'ok', base64 }` / `notSeen` / `error`）
  readBase64Outcome: vi.fn(),
  writeBase64File: vi.fn(),
  // T-107：业务读走 `readTextOutcome`（唯一读入口）；用例只设 `readTextSync` 的返回值。
  // 1a：`readTextSync` 现在是三态（`TextRead`），这里原样转发，不再把 error 压成 notSeen。
  readTextSync: vi.fn<(p: string) => TextRead>(() => ({ status: 'notSeen' })),
  readTextOutcome: vi.fn(async (p: string) => fs.readTextSync(p)),
  writeTextFile: vi.fn(),
  removeFile: vi.fn(() => ({ ok: true as const })),
}))

// `vi.hoisted` 里不能用运行时值（先于 import 执行），所以类型写在 `vi.fn<>()` 上，靠 `import type` 擦除。
// 不写类型参数的 `vi.fn()` 参数是 `any`：旧形状 `{ value, degraded }` 编译不报、运行时静默走失败分支。
const data = vi.hoisted(() => ({
  read: vi.fn<Repo<ActionWarehouseIndex>['read']>(),
  write: vi.fn(),
  selectActionFile: vi.fn(),
}))

vi.mock('@/cep/fs', () => fs)
vi.mock('@/cep/data/actions', () => ({
  // 导入/导出事务在全局写锁内读→写索引 → 走 readInLock / writeInLock（TD-09-18 / TD-09-30）
  actionIndexRepo: {
    read: data.read,
    readInLock: data.read,
    write: data.write,
    writeInLock: data.write,
  },
  currentWarehouseFile: (index: { list: Array<{ fileName: string }> }) => index.list[0].fileName,
  selectActionFile: data.selectActionFile,
}))

const { archiveDefaultName, exportActionArchive, importActionArchive } =
  await import('@/cep/data/action-archive')

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
  fs.writeBase64File.mockReturnValue({ status: 'ok' as const })
  data.write.mockResolvedValue(undefined)
  data.read.mockResolvedValue({
    ok: true,
    value: { index: 0, list: [{ name: '当前仓库', fileName: 'sj_dz_current.json' }] },
  })
})

describe('action-archive', () => {
  it('替换：先写文件，再写索引，最后清理旧文件', async () => {
    fs.readTextSync.mockReturnValue({ status: 'ok' as const, text: archive() })

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
    fs.readTextSync.mockReturnValue({ status: 'ok' as const, text: archive() })
    fs.writeBase64File.mockReturnValue({ status: 'error' as const, reason: 'EPERM: 模拟写失败' })

    await expect(importActionArchive(false, '/tmp/import.dzx')).rejects.toThrow('写入仓库失败')

    expect(data.write).not.toHaveBeenCalled()
    expect(fs.removeFile).not.toHaveBeenCalled()
  })

  it('追加：保留当前索引并追加新仓库', async () => {
    fs.readTextSync.mockReturnValue({ status: 'ok' as const, text: archive() })

    await importActionArchive(true, '/tmp/import.dzx')

    const next = data.write.mock.calls[0][0]
    expect(next.list).toHaveLength(2)
    expect(next.list[0].fileName).toBe('sj_dz_current.json')
    expect(next.index).toBe(1)
    expect(fs.removeFile).not.toHaveBeenCalled()
  })

  it('导出当前只读取当前仓库文件', async () => {
    fs.readBase64Outcome.mockReturnValue({ status: 'ok', base64: 'YmFzZTY0' })

    await exportActionArchive(true, '/tmp/export.dzx')

    expect(fs.readBase64Outcome).toHaveBeenCalledTimes(1)
    expect(fs.readBase64Outcome).toHaveBeenCalledWith('/user/sj_dz_current.json')
    expect(fs.writeTextFile).toHaveBeenCalledWith('/tmp/export.dzx', expect.any(String))
  })
})

/**
 * T-99-4：坏索引时导入不许写盘。
 *
 * 坏索引的 `value` 是 fallback `DEFAULT_INDEX`（一条「默认仓库」），拿它算 `next.list` 再
 * `write(next)` 就把用户真实仓库列表顶掉了：文件还在磁盘上，索引不再指向它们。
 * 这三条钉的是"中止在任何写之前"，以及文案说的是"文件坏了"而不是"你没有仓库"。
 */
describe('action-archive · 坏索引（T-99-4）', () => {
  const broken: RepoRead<ActionWarehouseIndex> = {
    ok: false,
    reason: '内容不是合法 JSON',
    // 坏读臂必带默认值（T-102）。这里**故意**不用生产者那份 `defaultActionIndex()`（本文件的
    // `@/cep/data/actions` 是 mock 掉的）：空 list 与真实默认值不同，万一被测代码读了它，断言会变。
    fallback: { index: 0, list: [] },
  }

  it('导入（替换）：抛错且一个字节都不写，也不删任何文件', async () => {
    fs.readTextSync.mockReturnValue({ status: 'ok' as const, text: archive() })
    data.read.mockResolvedValue(broken)

    await expect(importActionArchive(false, '/tmp/import.dzx')).rejects.toThrow(
      '动作库索引文件损坏（内容不是合法 JSON），导入已中止：磁盘上的仓库文件没动',
    )

    expect(fs.writeBase64File).not.toHaveBeenCalled()
    expect(data.write).not.toHaveBeenCalled()
    expect(fs.removeFile).not.toHaveBeenCalled()
    expect(data.selectActionFile).not.toHaveBeenCalled()
  })

  it('导入（追加）：同样不写盘（否则 fallback 的「默认仓库」会被写进索引）', async () => {
    fs.readTextSync.mockReturnValue({ status: 'ok' as const, text: archive() })
    data.read.mockResolvedValue(broken)

    await expect(importActionArchive(true, '/tmp/import.dzx')).rejects.toThrow('导入已中止')

    expect(fs.writeBase64File).not.toHaveBeenCalled()
    expect(data.write).not.toHaveBeenCalled()
    expect(data.selectActionFile).not.toHaveBeenCalled()
  })

  it('导出：中止，不读仓库文件、不生成 .dzx', async () => {
    data.read.mockResolvedValue(broken)

    await expect(exportActionArchive(true, '/tmp/export.dzx')).rejects.toThrow('导出已中止')
    await expect(archiveDefaultName(true)).rejects.toThrow('导出已中止')

    expect(fs.readBase64Outcome).not.toHaveBeenCalled()
    expect(fs.writeTextFile).not.toHaveBeenCalled()
  })
})
