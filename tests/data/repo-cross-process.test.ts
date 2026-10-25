import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRecord } from '@/utils/guards'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

/**
 * 跨进程写（D-26 CAS）+ 坏读拒绝覆盖（D-42）的**行为证据**。
 *
 * ── 为什么 mock 打在 `@/cep/node` 这一层 ──────────────────────────────────────
 * 上一版 mock 的是 `@/cep/fs-read`，而那一层的 API 已经全部换过
 * （`readTextSmart` / `writeTextFileAtomic` 都没了，现在是 `readTextSync` / `writeDiskSync`）。
 * 打在最底层 `nodeRequire` 上，`fs-read` 与 `disk-write` **都用真实实现**，
 * 落的是 `mkdtemp` 出来的真文件 —— 内存 Map 模拟不出 rename 原子性。
 *
 * ── 竞态怎么制造（关键）────────────────────────────────────────────────────────
 * `Repo.update` 现在是**同步段**：读 → mutator → 落盘，中间没有 `await`，
 * 所以**进程内不可能有第二个写插进来**。要模拟"另一个面板在中间写了一次"，
 * 唯一的入口是 **mutator 自己**：它在「读完之后、落盘之前」执行，
 * 在里面直写文件 = 精确复现"A 读旧 → B 写 → A 落盘"。
 * 这比 `onRead` 钩子更确定：不依赖任何 mock 的调用顺序。
 *
 * ── 红→绿怎么验 ─────────────────────────────────────────────────────────────
 * 把 `file-repo.ts` 里 `if (!(e instanceof CepError && e.code === 'CONFLICT')) throw e`
 * 那行改成无条件 `throw e`，第 1 条用例必须变红（冲突直接抛，不再重跑 mutator）。
 * 验证方法与结论见交付说明。
 */
vi.mock('@/cep/node', () => ({
  hasNode: () => true,
  nodeRequire: (id: string) =>
    id === 'fs' ? fs : id === 'path' ? path : id === 'buffer' ? { Buffer } : undefined,
  toPosix: (p: string) => p,
}))

const { fileRepo } = await import('@/cep/data/file-repo')

interface Doc {
  list: string[]
}

const disk = { dir: '' }
const FILE = () => path.join(disk.dir, 'sj_appFreePanel.json')

function read(): Doc {
  return JSON.parse(fs.readFileSync(FILE(), 'utf8')) as Doc
}

/** 直接落盘 = 模拟"另一个进程"的写，不经过本进程的 repo */
function writeFromOtherProcess(value: Doc): void {
  fs.writeFileSync(FILE(), JSON.stringify(value), 'utf8')
}

/** decode 必填：只认 `{ list: string[] }`；坏形状要说出原因，不能返 `null` *
function decodeDoc(raw: unknown): Decoded<Doc> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  const rawList = raw.list
  if (!Array.isArray(rawList)) return shapeFail('list', 'array', rawList)
  const list = rawList.filter((x): x is string => typeof x === 'string')
  return list.length === rawList.length
    ? { value: { list } }
    : { fail: 'badItem', count: rawList.length }
}

function createRepo(opts: { retries?: number } = {}) {
  return fileRepo<Doc>(
    () => FILE(),
    () => ({ list: [] }),
    decodeDoc,
    opts,
  )
}

beforeEach(() => {
  disk.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-repo-'))
  writeFromOtherProcess({ list: [] })
})

afterAll(() => {
  fs.rmSync(disk.dir, { recursive: true, force: true })
})

describe('跨进程写（D-26 CAS 重试）', () => {
  it('对方在「读完、落盘之前」改了文件：重跑 mutator，两边更新都保留', () => {
    const repo = createRepo()

    // 只插一次：第一轮 mutator 里"另一个面板"写一次，之后正常
    let fired = false
    repo.update((value) => {
      if (!fired) {
        fired = true
        writeFromOtherProcess({ list: ['独立面板'] })
      }
      value.list.push('主面板')
    })

    expect(fired).toBe(true)
    // 第一轮：读到 [] → 对方写 ['独立面板'] → CAS 冲突 → 重跑
    // 第二轮：读到 ['独立面板'] → 追加 → 落盘成功
    expect(read()).toEqual({ list: ['独立面板', '主面板'] })
  })

  it('对方一直改：重试次数用完抛 CONFLICT，且不把对方内容覆盖掉', () => {
    const repo = createRepo({ retries: 2 })

    let round = 0
    expect(() =>
      repo.update((value) => {
        round += 1
        writeFromOtherProcess({ list: [`对方-${round}`] })
        value.list.push('主面板')
      }),
    ).toThrow(/CONFLICT|其他面板/)

    // 重试 2 次 ⇒ mutator 跑 3 轮（首轮 + 2 次重试）
    expect(round).toBe(3)
    const final = read()
    expect(final.list).toHaveLength(1)
    expect(final.list[0]).toMatch(/^对方-/)
  })

  it('单实例连写 10 次：一次都不丢（同步段串行）', () => {
    const repo = createRepo()
    for (let index = 0; index < 10; index++) {
      repo.update((value) => {
        value.list.push(`f${index}`)
      })
    }
    expect(read().list).toHaveLength(10)
  })
})

describe('坏读拒绝覆盖写（D-42）', () => {
  it('内容不是合法 JSON：update 抛错，原文件一个字节都不动、不写 .bak', () => {
    fs.writeFileSync(FILE(), '{oops', 'utf8')
    const repo = createRepo()

    expect(() =>
      repo.update((value) => {
        value.list.push('写不进去')
      }),
    ).toThrow()

    expect(fs.readFileSync(FILE(), 'utf8')).toBe('{oops')
    expect(fs.existsSync(`${FILE()}.bak`)).toBe(false)
  })

  it('read 报坏因，且业务拿不到 value（坏读不是空数据）', () => {
    fs.writeFileSync(FILE(), '{oops', 'utf8')
    const result = createRepo().read()

    expect(result.ok).toBe(false)
    expect(result).not.toHaveProperty('value')
  })
})
