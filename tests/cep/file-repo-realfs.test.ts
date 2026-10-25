import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { decodeList } from '@/utils/decode'

/**
 * 真机装法下的 `fileRepo` —— 原子写与全局写链**有牙**的凭证。
 *
 * 为什么必须单开一个文件：jsdom 下 `hasCep()` 为 `false` → `dataRepo()` 选 `memoryRepo`，
 * 而 `memoryRepo` 自己就是同步赋值（没有 tmp、没有 rename、没有 `runQueued`）。
 * 于是"原子写被删""排队被删"在旧用例里**都不会红** —— 被测对象早被换掉了。
 * 这里装真 `window.require`（node:fs）+ 真 `window.__adobe_cep__` → `hasCep()`=true
 * → `dataRepo()` 走 `fileRepo`，测的是真代码 + 真磁盘 + 真全局写链。
 *
 * 三条测试点（对应两处 P0 数据完整性保证，删掉实现必红 —— 探针结论见本轮报告）：
 * 1. `dataRepo` 在真机装法下选的就是 `fileRepo`：写入真落盘。
 * 2. **原子**：写一半失败时目标文件仍是**旧内容**（非原子直写会把它截成半截 JSON）。
 * 3. **排队**：并发 10 次 `update` 全部落地、不抛错（不排队 = 丢更新 / 重试耗尽）。
 * 4. 坏文件不覆盖：读到的不是真数据时 `update` 必须抛（不许拿 fallback 盖掉用户文件）。
 */
const realRequire = createRequire(import.meta.url)

let dir = ''
let target = ''

/** 注入点：让下一次 `writeFileSync` **写一半就炸**（模拟磁盘满 / 进程被杀的真实形态） */
const behavior = { halfWrite: false }

/**
 * 磁盘 I/O 事件流（`读:文件名` / `写:文件名`）。排队判据靠它：
 * 「全局一条链」的可观测含义 = 一个仓库的读-改-写整段不与另一个仓库的交错。
 */
const io: string[] = []

/** 走真 node:fs，但把读写包一层，记录 I/O 顺序 + 好在中间制造"写一半" */
const wrappedFs = {
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => fs.mkdirSync(p, opts),
  writeFileSync: (p: string, data: string) => {
    io.push(`写:${path.basename(p)}`)
    if (behavior.halfWrite) {
      // Node 直写目标时是"先截断再写"：真实故障留下的就是半截文件
      fs.writeFileSync(p, String(data).slice(0, Math.floor(String(data).length / 2)), 'utf8')
      throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' })
    }
    fs.writeFileSync(p, data, 'utf8')
  },
  renameSync: (from: string, to: string) => fs.renameSync(from, to),
  unlinkSync: (p: string) => fs.unlinkSync(p),
  readFileSync: (p: string, enc?: BufferEncoding) => {
    io.push(`读:${path.basename(p)}`)
    return fs.readFileSync(p, enc)
  },
}

function installRealEnv(): void {
  const w = window as unknown as {
    require?: (id: string) => unknown
    __adobe_cep__?: { evalScript?: (script: string, cb?: (res: string) => void) => void }
  }
  // 断言理由：`window.require` / `__adobe_cep__` 由 CEP 运行时注入，测试里手工补上真实现
  w.require = (id: string) => (id === 'fs' ? wrappedFs : realRequire(id))
  // 真机上文件不存在时 `readTextOutcome` 会再问一次 jsx `File`（fs.ts:493）；
  // 让假桥对"文件不存在"回 notSeen（`ERR:` + `文件不存在: `），否则该分支永不回包 → 挂。
  w.__adobe_cep__ = {
    evalScript: (_script: string, cb?: (res: string) => void) => cb?.(`ERR:文件不存在: fake`),
  }
}

// `dataRepo` 的实现是**首次调用**时才求值（T-113），所以顶层 import 安全：
// 只要在第一次 `repo.read()` / `repo.write()` 之前把环境装好即可。
const { dataRepo } = await import('@/cep/data/data-repo')

/** decode 必填：只认数字数组；坏形状由 `decodeList` 说原因（不返 `null`） */
function decodeNumberList(raw: unknown) {
  return decodeList(raw, (item): item is number => typeof item === 'number')
}

/** 每个用例一份新的 `dataRepo()` 实例（实例自带缓存，不能跨用例共用） */
function makeRepo() {
  return dataRepo<number[]>(
    () => target,
    () => [],
    decodeNumberList,
  )
}

function readTarget(): string {
  return fs.readFileSync(target, 'utf8')
}

beforeEach(() => {
  installRealEnv()
  behavior.halfWrite = false
  io.length = 0
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-file-repo-realfs-'))
  target = path.join(dir, 'sj_probe.json')
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  delete (window as unknown as { require?: unknown }).require
  delete (window as unknown as { __adobe_cep__?: unknown }).__adobe_cep__
})

describe('fileRepo（真机装法：真 node:fs + 真 __adobe_cep__）', () => {
  it('pick 在 hasCep 为真时选的是 fileRepo：write 真落盘', async () => {
    const repo = makeRepo()

    await repo.write([1, 2, 3])

    // memoryRepo 也能"写成功"，但它不会碰磁盘 —— 这条只有真走 fileRepo 才成立
    expect(readTarget()).toBe('[1,2,3]')
    // 原子写不留 tmp
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  }, 5000)

  it('原子写：写一半失败时目标文件仍是旧内容，且不留 tmp', async () => {
    const repo = makeRepo()
    await repo.write([1])
    const before = readTarget()

    behavior.halfWrite = true
    // `Repo<T>` 已全同步 ⇒ 失败是**同步抛**，`await expect(...).rejects` 接不到
    // （抛在 `expect` 被调用之前）。判据不变：写失败必须抛、目标文件必须还是旧内容。
    expect(() => repo.write([2, 3, 4])).toThrow()

    // 非原子直写会在抛错前把目标截成半截 —— 半截 JSON 会让整库读不回来
    expect(readTarget()).toBe(before)
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  }, 5000)

  it('排队：并发 10 次 update 全部落地，不丢更新也不抛错', async () => {
    const repo = makeRepo()
    await repo.write([])

    await Promise.all(Array.from({ length: 10 }, (_, i) => repo.update((value) => [...value, i])))

    const final = JSON.parse(readTarget()) as number[]
    expect(final).toHaveLength(10)
    expect([...final].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  }, 10000)

  it('全局一条链：两个仓库的读-改-写不许交错（排队）', async () => {
    const pathA = path.join(dir, 'sj_probe_a.json')
    const pathB = path.join(dir, 'sj_probe_b.json')
    const a = dataRepo<number[]>(
      () => pathA,
      () => [],
      decodeNumberList,
    )
    const b = dataRepo<number[]>(
      () => pathB,
      () => [],
      decodeNumberList,
    )

    await Promise.all([a.update((value) => [...value, 1]), b.update((value) => [...value, 2])])

    expect(JSON.parse(fs.readFileSync(pathA, 'utf8'))).toEqual([1])
    expect(JSON.parse(fs.readFileSync(pathB, 'utf8'))).toEqual([2])

    // 排队 = 一个任务的读-改-写**整段独占**：A 的整段必须先于（或整段晚于）B 的整段。
    // 不排队时两个 update 的读会都发生在各自的写之前 → 两段交错（跨文件事务就是这么被写坏的）。
    const idx = (name: string): number[] =>
      io.reduce<number[]>((acc, e, i) => (e.endsWith(`:${name}`) ? [...acc, i] : acc), [])
    const idxA = idx('sj_probe_a.json')
    const idxB = idx('sj_probe_b.json')
    expect(idxA.length).toBeGreaterThan(0)
    expect(idxB.length).toBeGreaterThan(0)
    const grouped = idxA[idxA.length - 1] < idxB[0] || idxB[idxB.length - 1] < idxA[0]
    // 把事件流一起带上：红了要能一眼看出交错在哪一段
    expect({ io, grouped }).toEqual({ io, grouped: true })
  }, 10000)

  it('坏文件不当"首次使用"：update 抛错且不覆盖原文', async () => {
    const repo = makeRepo()
    fs.writeFileSync(target, '{ 半截', 'utf8')

    // 同上：`update` 同步抛。判据不变：坏原文不许被当成"首次使用"覆盖掉（D-42）。
    expect(() => repo.update((value) => [...value, 1])).toThrow()

    expect(readTarget()).toBe('{ 半截')
  }, 5000)

  it('update 真落盘并留下上一版的 .bak', async () => {
    const repo = makeRepo()
    await repo.write([1])
    const before = readTarget()

    await repo.update((value) => [...value, 2])

    expect(readTarget()).toBe('[1,2]')
    expect(fs.readFileSync(`${target}.bak`, 'utf8')).toBe(before)
  }, 5000)
})
