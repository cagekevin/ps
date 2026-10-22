import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 仓库层的四条硬约束（ADR-14 / ADR-15）：
 * 读失败带 degraded、写失败必须抛、同一文件串行、写前备份。
 */
const state = vi.hoisted(() => ({
  files: new Map<string, string>(),
  failWrite: false,
}))

vi.mock('@/cep/fs', () => ({
  readTextSmart: async (path: string) => state.files.get(path) ?? null,
  writeTextFile: (path: string, text: string) => {
    if (state.failWrite) throw new Error('NO_NODE')
    state.files.set(path, text)
  },
  writeTextFileAtomic: (path: string, text: string) => {
    if (state.failWrite) return false
    state.files.set(path, text)
    return true
  },
}))

import { fileRepo } from '@/cep/data/file-repo'
import { memoryRepo } from '@/cep/data/memory-repo'

interface Row {
  name: string
  star?: number
}

const PATH = '/user/sj_ztglStar.ini'

beforeEach(() => {
  state.files.clear()
  state.failWrite = false
})

function createRepo() {
  return fileRepo<Row[]>(
    () => PATH,
    () => [],
  )
}

describe('fileRepo 读', () => {
  it('文件不存在时返回 fallback，且不算 degraded（首次使用是正常状态）', async () => {
    const { value, degraded } = await createRepo().read()
    expect(value).toEqual([])
    expect(degraded).toBeUndefined()
  })

  it('内容损坏时返回 fallback 并带 degraded', async () => {
    state.files.set(PATH, '{oops')
    const { value, degraded } = await createRepo().read()
    expect(value).toEqual([])
    expect(degraded).toBeTruthy()
  })

  it('合法 JSON 原样返回', async () => {
    state.files.set(PATH, JSON.stringify([{ name: 'MiSans', star: 3 }]))
    const { value, degraded } = await createRepo().read()
    expect(value).toEqual([{ name: 'MiSans', star: 3 }])
    expect(degraded).toBeUndefined()
  })
})

describe('fileRepo 写', () => {
  it('写失败必须抛，不许吞掉', async () => {
    state.failWrite = true
    await expect(createRepo().write([{ name: 'A' }])).rejects.toThrow()
  })

  it('写之前把原文备份成 .bak', async () => {
    state.files.set(PATH, JSON.stringify([{ name: 'A', star: 1 }]))
    await createRepo().update((list) => {
      list.push({ name: 'B', star: 2 })
    })
    expect(state.files.get(`${PATH}.bak`)).toBe(JSON.stringify([{ name: 'A', star: 1 }]))
  })

  it('首次写不生成 .bak（没有原文可备份）', async () => {
    await createRepo().write([{ name: 'A' }])
    expect(state.files.has(`${PATH}.bak`)).toBe(false)
  })
})

describe('fileRepo 并发', () => {
  it('并发 10 次 update 不丢更新（每个文件一条串行队列）', async () => {
    const repo = createRepo()
    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        repo.update((list) => {
          list.push({ name: `f${index}`, star: 1 })
        }),
      ),
    )
    const { value } = await repo.read()
    expect(value).toHaveLength(10)
    expect(new Set(value.map((row) => row.name)).size).toBe(10)
  })

  it('前一次写失败不影响后续（队列不中断）', async () => {
    const repo = createRepo()
    state.failWrite = true
    await expect(repo.write([{ name: 'bad' }])).rejects.toThrow()

    state.failWrite = false
    await repo.write([{ name: 'ok' }])
    const { value } = await repo.read()
    expect(value).toEqual([{ name: 'ok' }])
  })
})

describe('fileRepo onChange', () => {
  it('写成功后通知，取消订阅后不再通知', async () => {
    const repo = createRepo()
    const seen: Row[][] = []
    const off = repo.onChange((value) => seen.push(value))

    await repo.write([{ name: 'A' }])
    expect(seen).toHaveLength(1)

    off()
    await repo.write([{ name: 'B' }])
    expect(seen).toHaveLength(1)
  })

  it('读不触发通知', async () => {
    const repo = createRepo()
    const seen: Row[][] = []
    repo.onChange((value) => seen.push(value))
    await repo.read()
    expect(seen).toHaveLength(0)
  })
})

describe('memoryRepo', () => {
  it('update 串行且可读回', async () => {
    const repo = memoryRepo<Row[]>(() => [])
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        repo.update((list) => {
          list.push({ name: `m${index}` })
        }),
      ),
    )
    const { value } = await repo.read()
    expect(value).toHaveLength(5)
  })

  it('写成功触发 onChange', async () => {
    const repo = memoryRepo<Row[]>(() => [])
    const seen: Row[][] = []
    repo.onChange((value) => seen.push(value))
    await repo.write([{ name: 'A' }])
    expect(seen).toEqual([[{ name: 'A' }]])
  })
})
