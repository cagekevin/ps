import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRecord } from '@/utils/guards'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * 仓库层的四条硬约束（ADR-14 / ADR-15）：
 * 读失败带 degraded、写失败必须抛、同一文件串行、写前备份。
 */
import { installFakeFs } from '../helpers/fake-fs'

/**
 * 仓库层的四条硬约束（ADR-14 / ADR-15）：
 * 读失败带 degraded、写失败必须抛、同一文件串行、写前备份。
 *
 * **假的是操作系统**（`installFakeFs()` 装到 `window.require("fs")`），不是 `@/cep/fs` ——
 * 写原语在 `src/cep/disk-write.ts`，mock `@/cep/fs` 拦不住它，还会逼生产代码把原语留在 fs.ts。
 */
const disk = installFakeFs()

import { dataRepo } from '@/cep/data/data-repo'
import { fileRepo } from '@/cep/data/file-repo'
import { readValue } from '../support/repo-read'

/** `memoryRepo` 已收进 `dataRepo` 且不再导出（唯一入口）：内存分支靠 `hasCep() === false` 走到 */
const env = vi.hoisted(() => ({ cep: true }))
vi.mock('@/cep/transport', () => ({
  hasCep: () => env.cep,
  // jsx 兜底的"文件不存在"哨兵：必须带 `ERR:` 前缀，否则会被当成读到的正文（T-105）
  evalScriptRaw: async () => `${ERR_PREFIX}文件不存在: `,
}))

interface Row {
  name: string
  star?: number
}

const PATH = '/user/sj_ztglStar.ini'

beforeEach(() => {
  disk.install()
  disk.files.clear()
  disk.failWrite = false
  disk.failRead = false
  disk.failReadAfter = 0
  // 默认走文件实现；内存分支的用例自己把它关掉
  env.cep = true
})

/** decode 必填（TD-03-5）：只认 `Row[]`，条目必须有字符串 name */
function decodeRows(raw: unknown): { value: Row[] } | null {
  if (!Array.isArray(raw)) return null
  const rows = raw.filter((x): x is Row => isRecord(x) && typeof x.name === 'string')
  return rows.length === raw.length ? { value: rows } : null
}

function createRepo() {
  return fileRepo<Row[]>(
    () => PATH,
    () => [],
    decodeRows,
  )
}

describe('fileRepo 读', () => {
  it('文件不存在时返回 fallback，且不算 degraded（首次使用是正常状态）', async () => {
    const read = await createRepo().read()
    const value = readValue(read)
    const degraded = read.reason
    expect(value).toEqual([])
    expect(degraded).toBeUndefined()
  })

  it('内容损坏时报坏因、不交出 fallback（坏读没有 value）', async () => {
    disk.files.set(PATH, '{oops')
    const read = await createRepo().read()
    const degraded = read.reason
    // 旧断言是 `value` 等于 fallback `[]`；4a96f63 的 src/cep/data/types.ts 把 `value`
    // 从失败臂上删了，同一个意图变成「业务根本拿不到值」
    expect(read).not.toHaveProperty('value')
    expect(degraded).toBeTruthy()
  })

  it('合法 JSON 原样返回', async () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'MiSans', star: 3 }]))
    const read = await createRepo().read()
    const value = readValue(read)
    const degraded = read.reason
    expect(value).toEqual([{ name: 'MiSans', star: 3 }])
    expect(degraded).toBeUndefined()
  })
})

describe('fileRepo 写', () => {
  it('写失败必须抛，不许吞掉', async () => {
    disk.failWrite = true
    await expect(createRepo().write([{ name: 'A' }])).rejects.toThrow()
  })

  /**
   * TD-09-24：CAS 比对**读不到**原文时不许当"没人改过"。
   *
   * 旧实现 `readTextSync(target) === expected`：读不到给 `null`，`expected` 也是 `null`
   * （读的那一刻文件还不存在）时 `null === null` 判 'same'，并发守卫恒真 ——
   * 别的面板刚建的文件就被覆盖。现在读不到 → `unknown` → **不写、抛**。
   */
  it('CAS 比对读不到原文 → 不写、抛（不把"读不到"当"没改过"）', async () => {
    const original = JSON.stringify([{ name: 'A', star: 1 }])
    disk.files.set(PATH, original)
    // 读入口正常（读得到内容），但落盘前的**同步比对读**失败 —— 正是权限错时的真实组合
    disk.failReadAfter = 1

    await expect(
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).rejects.toThrow('比对读不到原文')
    expect(disk.files.get(PATH)).toBe(original)
  })

  it('写之前把原文备份成 .bak', async () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'A', star: 1 }]))
    await createRepo().update((list) => {
      list.push({ name: 'B', star: 2 })
    })
    expect(disk.files.get(`${PATH}.bak`)).toBe(JSON.stringify([{ name: 'A', star: 1 }]))
  })

  it('内容损坏时 update 拒绝写，原文件不动（D-42）', async () => {
    disk.files.set(PATH, '{oops')
    await expect(
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).rejects.toThrow('拒绝覆盖写')
    expect(disk.files.get(PATH)).toBe('{oops')
  })

  it('读取失败时 update 拒绝写，不拿默认值覆盖（D-42）', async () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'A' }]))
    disk.failRead = true
    await expect(
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).rejects.toThrow('拒绝覆盖写')
    expect(disk.files.get(PATH)).toBe(JSON.stringify([{ name: 'A' }]))
  })

  it('首次写不生成 .bak（没有原文可备份）', async () => {
    await createRepo().write([{ name: 'A' }])
    expect(disk.files.has(`${PATH}.bak`)).toBe(false)
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
    const value = readValue(await repo.read())
    expect(value).toHaveLength(10)
    expect(new Set(value.map((row) => row.name)).size).toBe(10)
  })

  it('前一次写失败不影响后续（队列不中断）', async () => {
    const repo = createRepo()
    disk.failWrite = true
    await expect(repo.write([{ name: 'bad' }])).rejects.toThrow()

    disk.failWrite = false
    await repo.write([{ name: 'ok' }])
    const value = readValue(await repo.read())
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

describe('memoryRepo（经唯一构造器 + 无 CEP）', () => {
  beforeEach(() => {
    env.cep = false
  })

  it('update 串行且可读回', async () => {
    const repo = dataRepo<Row[]>(
      () => '/mem/rows.json',
      () => [],
      decodeRows,
    )
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        repo.update((list) => {
          list.push({ name: `m${index}` })
        }),
      ),
    )
    const value = readValue(await repo.read())
    expect(value).toHaveLength(5)
  })

  it('写成功触发 onChange', async () => {
    const repo = dataRepo<Row[]>(
      () => '/mem/rows.json',
      () => [],
      decodeRows,
    )
    const seen: Row[][] = []
    repo.onChange((value) => seen.push(value))
    await repo.write([{ name: 'A' }])
    expect(seen).toEqual([[{ name: 'A' }]])
  })
})
