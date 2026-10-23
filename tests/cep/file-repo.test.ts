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
  // 路径形参只为对齐 `writeTextFileAtomic(absPath, text)` 的签名，用例不按路径分流
  writeTextFileAtomic: vi.fn((_path: string, text: string) => {
    disk.text = text
    return true
  }),
}))

vi.mock('@/cep/fs', () => fs)

/** 开发者通道：坏文件必须 `log.error`（用户能「打开日志」查到），不许静默 warn/无声 */
const logger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({ log: logger }))

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

/**
 * T-99-2：读边界的 `normalize`。
 *
 * 钉的是三件事：① 形状不认识 → `degraded` + fallback，坏数据一个字段都不进业务；
 * ② 文件不存在 ≠ 文件坏了（前者 `degraded` 为空）；③ `degraded` 时 `update` 拒绝写、磁盘不变。
 */
describe('fileRepo normalize（读边界归一）', () => {
  /** 只认 `{ items: string[] }`；别的一律 null（= 形状不认识） */
  const normalize = (raw: unknown): { items: string[] } | null => {
    if (!raw || typeof raw !== 'object') return null
    const items = (raw as { items?: unknown }).items
    if (!Array.isArray(items)) return null
    return { items: items.filter((item): item is string => typeof item === 'string') }
  }

  const make = () =>
    fileRepo(
      () => '/tmp/panel.json',
      () => ({ items: [] as string[] }),
      { normalize },
    )

  it('正常文件逐值读回，degraded 为空', async () => {
    disk.text = '{"items":["a","b"],"extra":1}'

    const read = await make().read()

    expect(read.value.items).toEqual(['a', 'b'])
    expect(read.degraded).toBeUndefined()
  })

  it('形状不认识时 degraded 有值，业务只拿到 fallback 的空列表', async () => {
    disk.text = '{"items":"不是数组"}'

    const read = await make().read()

    expect(read.degraded).toBe('内容结构不认识')
    expect(read.value.items).toEqual([])
  })

  it('"坏"必须留痕：degraded 带原因 + log.error 带路径（不是静默降级）', async () => {
    disk.text = '{"items":"不是数组"}'

    await make().read()

    expect(logger.error).toHaveBeenCalledWith(
      'repo',
      expect.stringContaining('/tmp/panel.json 内容结构不认识'),
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('非法 JSON 与结构不认识是两个不同原因', async () => {
    disk.text = '{坏文件'

    const read = await make().read()

    expect(read.degraded).toBe('内容不是合法 JSON')
    expect(read.value.items).toEqual([])
  })

  it('文件不存在不算 degraded（"读到空"与"文件坏了"可分）', async () => {
    disk.text = null

    const read = await make().read()

    expect(read.degraded).toBeUndefined()
    expect(read.value.items).toEqual([])
  })

  it('结构不认识时 update 拒绝写，磁盘一个字节都不变', async () => {
    disk.text = '{"items":"不是数组"}'

    await expect(make().update((value) => ({ items: [...value.items, 'x'] }))).rejects.toThrow(
      '拒绝覆盖写',
    )
    expect(disk.text).toBe('{"items":"不是数组"}')
    expect(fs.writeTextFileAtomic).not.toHaveBeenCalled()
  })

  it('不传 normalize 时保持旧行为（解析结果直接当 T）', async () => {
    disk.text = '{"items":"不是数组"}'

    const read = await fileRepo(
      () => '/tmp/panel.json',
      () => ({ items: [] as string[] }),
    ).read()

    // 旧行为把形状错误的文件原样交出去，正是这刀要拆掉的那份断言（剩余仓库见台账 T-99-2）
    expect(read.degraded).toBeUndefined()
    expect(read.value.items).toBe('不是数组')
  })
})
