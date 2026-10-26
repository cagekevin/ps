import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasNode } from '@/cep/node'
import { isRecord } from '@/utils/guards'
import { decodeList } from '@/utils/decode'
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

afterEach(() => {
  disk.uninstall()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

beforeEach(() => {
  disk.install()
  disk.files.clear()
  disk.failWrite = false
  disk.failRead = false
  disk.failReadAfter = 0
  // 默认走文件实现；内存分支的用例自己把它关掉
  env.cep = true
})

/** decode 必填：只认 `Row[]`，条目必须有字符串 name；坏形状要说出原因，不能返 `null` */
function isRow(raw: unknown): raw is Row {
  return isRecord(raw) && typeof raw.name === 'string'
}

function decodeRows(raw: unknown) {
  return decodeList(raw, isRow)
}

function createRepo() {
  return fileRepo<Row[]>(
    () => PATH,
    () => [],
    decodeRows,
  )
}

describe('fileRepo 读', () => {
  it('文件不存在时返回 fallback，且不算 degraded（首次使用是正常状态）', () => {
    const read = createRepo().read()
    const value = readValue(read)
    const degraded = read.reason
    expect(value).toEqual([])
    expect(degraded).toBeUndefined()
  })

  it('内容损坏时报坏因、不交出 fallback（坏读没有 value）', () => {
    disk.files.set(PATH, '{oops')
    const read = createRepo().read()
    const degraded = read.reason
    // 旧断言是 `value` 等于 fallback `[]`；4a96f63 的 src/cep/data/types.ts 把 `value`
    // 从失败臂上删了，同一个意图变成「业务根本拿不到值」
    expect(read).not.toHaveProperty('value')
    expect(degraded).toBeTruthy()
  })

  it('合法 JSON 原样返回', () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'MiSans', star: 3 }]))
    const read = createRepo().read()
    const value = readValue(read)
    const degraded = read.reason
    expect(value).toEqual([{ name: 'MiSans', star: 3 }])
    expect(degraded).toBeUndefined()
  })
})

/** 这些用例只测落盘/通知，不涉及并发 ⇒ 显式声明不比（`cas` 现在必填） */
const SKIP = { mode: 'skip', why: '用例：只测写盘与通知，不涉及并发' } as const

describe('fileRepo 写', () => {
  it('写失败必须抛，不许吞掉', () => {
    disk.failWrite = true
    expect(() => createRepo().replace([{ name: 'A' }], SKIP)).toThrow(
      expect.objectContaining({ code: 'IO' }),
    )
  })

  /**
   * CAS 比对**读不到**原文时不许当"没人改过"。
   *
   * 旧实现 `readTextSync(target) === expected`：读不到给 `null`，`expected` 也是 `null`
   * （读的那一刻文件还不存在）时 `null === null` 判 'same'，并发守卫恒真 ——
   * 别的面板刚建的文件就被覆盖。现在读不到 → `unknown` → **不写、抛**。
   */
  it('CAS 比对读不到原文 → 不写、抛（不把"读不到"当"没改过"）', () => {
    const original = JSON.stringify([{ name: 'A', star: 1 }])
    disk.files.set(PATH, original)
    // 读入口正常（读得到内容），但落盘前的**同步比对读**失败 —— 正是权限错时的真实组合
    disk.failReadAfter = 1

    expect(() =>
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).toThrow('比对读不到原文')
    expect(disk.files.get(PATH)).toBe(original)
  })

  it('写之前把原文备份成 .bak', () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'A', star: 1 }]))
    createRepo().update((list) => {
      list.push({ name: 'B', star: 2 })
    })
    expect(disk.files.get(`${PATH}.bak`)).toBe(JSON.stringify([{ name: 'A', star: 1 }]))
  })

  it('内容损坏时 update 拒绝写，原文件不动（D-42）', () => {
    disk.files.set(PATH, '{oops')
    expect(() =>
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).toThrow('拒绝覆盖写')
    expect(disk.files.get(PATH)).toBe('{oops')
  })

  it('读取失败时 update 拒绝写，不拿默认值覆盖（D-42）', () => {
    disk.files.set(PATH, JSON.stringify([{ name: 'A' }]))
    disk.failRead = true
    expect(() =>
      createRepo().update((list) => {
        list.push({ name: 'B' })
      }),
    ).toThrow('拒绝覆盖写')
    expect(disk.files.get(PATH)).toBe(JSON.stringify([{ name: 'A' }]))
  })

  it('首次写不生成 .bak（没有原文可备份）', () => {
    createRepo().replace([{ name: 'A' }], SKIP)
    expect(disk.files.has(`${PATH}.bak`)).toBe(false)
  })

  /**
   * T2：`Repo.write` 与 `Repo.overwrite` 合并成 `replace(value, cas)` 后，
   * 「只在新装机时写种子」这件事终于有结构保证 —— 传 `expected: null` 就是
   * 「这个路径上应当没有文件」，文件已被别的面板/用户写出来就抛 `CONFLICT`，不覆盖。
   *
   * 旧 `Repo.write` 没有这个能力：它恒 `previous: null`、恒不比对，种子会盖掉用户数据。
   */
  it('replace 传「必须不存在」：文件已存在 → 抛 CONFLICT，用户数据不被种子覆盖', () => {
    const userData = [{ name: '用户自己存的' }]
    disk.files.set(PATH, JSON.stringify(userData))

    let code = ''
    try {
      createRepo().replace([{ name: '种子' }], { mode: 'compare', expected: null })
    } catch (e) {
      code = (e as { code?: string }).code ?? ''
    }

    expect(code).toBe('CONFLICT')
    expect(JSON.parse(disk.read(PATH)!)).toEqual(userData)
  })
})

describe('fileRepo 连续调用', () => {
  it('连续 10 次 update 不丢更新（读改写是不可打断的同步段）', () => {
    const repo = createRepo()
    for (let index = 0; index < 10; index++) {
      repo.update((list) => {
        list.push({ name: `f${index}`, star: 1 })
      })
    }
    const value = readValue(repo.read())
    expect(value).toHaveLength(10)
    expect(new Set(value.map((row) => row.name)).size).toBe(10)
  })

  it('前一次写失败不影响后续', () => {
    const repo = createRepo()
    disk.failWrite = true
    expect(() => repo.replace([{ name: 'bad' }], SKIP)).toThrow(
      expect.objectContaining({ code: 'IO' }),
    )

    disk.failWrite = false
    repo.replace([{ name: 'ok' }], SKIP)
    const value = readValue(repo.read())
    expect(value).toEqual([{ name: 'ok' }])
  })
})

describe('fileRepo onChange', () => {
  it('写成功后通知，取消订阅后不再通知', () => {
    const repo = createRepo()
    const seen: Row[][] = []
    const off = repo.onChange((value) => seen.push(value))

    repo.replace([{ name: 'A' }], SKIP)
    expect(seen).toHaveLength(1)

    off()
    repo.replace([{ name: 'B' }], SKIP)
    expect(seen).toHaveLength(1)
  })

  it('读不触发通知', () => {
    const repo = createRepo()
    const seen: Row[][] = []
    repo.onChange((value) => seen.push(value))
    repo.read()
    expect(seen).toHaveLength(0)
  })
})

describe('memoryRepo（经唯一构造器 + 无 CEP）', () => {
  beforeEach(() => {
    env.cep = false
  })

  it('update 连续执行且可读回', () => {
    const repo = dataRepo<Row[]>(
      () => '/mem/rows.json',
      () => [],
      decodeRows,
    )
    for (let index = 0; index < 5; index++) {
      repo.update((list) => {
        list.push({ name: `m${index}` })
      })
    }
    const value = readValue(repo.read())
    expect(value).toHaveLength(5)
  })

  it('写成功触发 onChange', () => {
    const repo = dataRepo<Row[]>(
      () => '/mem/rows.json',
      () => [],
      decodeRows,
    )
    const seen: Row[][] = []
    repo.onChange((value) => seen.push(value))
    repo.replace([{ name: 'A' }], SKIP)
    expect(seen).toEqual([[{ name: 'A' }]])
  })
})
