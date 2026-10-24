import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * D-26 / D-42 的验证：**双进程场景在单测里怎么模拟**（可复用，后面遇到同类问题照这个来）
 *
 * 真实场景：主面板（`index.html`）与独立面板（`index.html?panel=freePanel`）是两个 JS 上下文，
 * 各自一份 `fileRepo` 实例、各自一条 `queue`，共用 `%APPDATA%\SheJiZhuLi\` 下的同一份 JSON。
 * 队列只在实例内串行，管不到对方 —— last-write-wins 丢更新就是这么来的。
 *
 * 模拟三件套：
 * 1. 把 `@/cep/fs` 接到**真实 node:fs**，落在 `fs.mkdtempSync()` 的临时目录。
 *    内存 Map 模拟不出文件名冲突、rename 原子性（D-42 的文件损坏就是这么漏掉的）。
 * 2. 建**两个** repo 实例指向同一路径 = 两条互不可见的队列，这正是跨进程的失效前提。
 *    同一个实例内部有队列串行，永远测不出这个 bug。
 * 3. 竞态用**钩子**制造，不用 sleep：`disk.onRead` 在"读到旧值之后、返回之前"让对手写一次，
 *    于是"A 读旧 → B 写 → A 写"这个顺序是确定性的，跑 100 次结果一样。
 *
 * 红→绿：本文件第 1、3 条用例在 CAS（D-26）之前的实现上必须失败。验证方法见交付报告。
 */
const disk = vi.hoisted(() => ({
  dir: '',
  /** 每次 `readTextSmart` 读完（还没返回给调用方）时执行，用来让"另一个进程"插一脚 */
  onRead: null as null | (() => void),
  /**
   * 每次读都在**微任务**边界让出一次，逼两个实例在各次 await 之间交错。
   * 只能用微任务，不能用 setTimeout：真实 `readTextSmart` 的读是同步的、只在一个 microtask 上
   * 落地，所以「比对 → rename」这一段本来就是不可被打断的临界区。用定时器把这段窗口人为
   * 撑到毫秒级，测出来的就不是本实现的窗口，而是 mock 的窗口。
   */
  yieldEveryRead: false,
  failRead: false,
}))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  // 同步读：CAS 比对走这条（async 读会多一个 microtask 边界，正好是上一次丢更新的位置）
  readTextSync: (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null),
  readTextSmart: async (p: string) => {
    if (disk.failRead) throw new Error('EBUSY')
    const text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
    disk.onRead?.()
    if (disk.yieldEveryRead) await Promise.resolve()
    return text
  },
  // T-105：写路径走三态读。`onRead` 钩子与微任务让步照旧接在这里，跨进程竞态用例才拦得住
  readTextOutcome: async (p: string) => {
    if (disk.failRead) return { status: 'error' as const, reason: 'EBUSY' }
    if (!fs.existsSync(p)) return { status: 'notSeen' as const }
    const text = fs.readFileSync(p, 'utf8')
    disk.onRead?.()
    if (disk.yieldEveryRead) await Promise.resolve()
    return { status: 'ok' as const, text }
  },
  writeTextFile: (p: string, text: string) => {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, text, 'utf8')
  },
  // 和真实 writeTextFileAtomic 同语义：写本进程专属 tmp 再 rename（D-42）
  writeTextFileAtomic: (p: string, text: string) => {
    const tmp = `${p}.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`
    try {
      fs.writeFileSync(tmp, text, 'utf8')
      fs.renameSync(tmp, p)
      return true
    } catch {
      return false
    }
  },
}))

const { fileRepo } = await import('@/cep/data/file-repo')

interface Doc {
  list: string[]
}

const FILE = () => path.join(disk.dir, 'sj_appFreePanel.json')

function read(): Doc {
  return JSON.parse(fs.readFileSync(FILE(), 'utf8')) as Doc
}

/** 直接落盘 = 模拟"另一个进程"的写，不经过本进程的 repo */
function writeFromOtherProcess(value: Doc): void {
  fs.writeFileSync(FILE(), JSON.stringify(value), 'utf8')
}

function createRepo(opts: { retries?: number } = {}) {
  return fileRepo<Doc>(
    () => FILE(),
    () => ({ list: [] }),
    opts,
  )
}

beforeEach(() => {
  disk.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-repo-'))
  disk.onRead = null
  disk.yieldEveryRead = false
  disk.failRead = false
  writeFromOtherProcess({ list: [] })
})

afterAll(() => {
  fs.rmSync(disk.dir, { recursive: true, force: true })
})

describe('跨进程写（D-26 CAS）', () => {
  it('对方在「读完、写之前」改了文件：两边更新都保留', async () => {
    const repo = createRepo()

    // 第一次读之后，独立面板写入一次（只插一次，之后正常）
    let fired = false
    disk.onRead = () => {
      if (fired) return
      fired = true
      writeFromOtherProcess({ list: ['独立面板'] })
    }

    await repo.update((value) => {
      value.list.push('主面板')
    })

    expect(fired).toBe(true)
    expect(read()).toEqual({ list: ['独立面板', '主面板'] })
  })

  it('对方一直改：重试 3 次后抛 IO，且不把对方内容覆盖掉', async () => {
    const repo = createRepo({ retries: 2 })

    let round = 0
    disk.onRead = () => {
      round += 1
      writeFromOtherProcess({ list: [`对方-${round}`] })
    }

    await expect(
      repo.update((value) => {
        value.list.push('主面板')
      }),
    ).rejects.toThrow('写入已放弃')

    const final = read()
    expect(final.list).toHaveLength(1)
    expect(final.list[0]).toMatch(/^对方-/)
  })

  it('两个实例（两条队列）交替各写 20 次，一条都不丢', async () => {
    disk.yieldEveryRead = true
    const a = createRepo()
    const b = createRepo()

    const tasks: Promise<unknown>[] = []
    for (let index = 0; index < 20; index++) {
      tasks.push(
        a.update((value) => {
          value.list.push(`A${index}`)
        }),
      )
      tasks.push(
        b.update((value) => {
          value.list.push(`B${index}`)
        }),
      )
    }
    await Promise.all(tasks)

    const list = read().list
    expect(list).toHaveLength(40)
    expect(new Set(list).size).toBe(40)
  })

  it('单个实例内部仍然严格串行（队列没被 CAS 破坏）', async () => {
    const repo = createRepo()
    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        repo.update((value) => {
          value.list.push(`f${index}`)
        }),
      ),
    )
    expect(read().list).toHaveLength(10)
  })
})

describe('degraded 时拒绝覆盖写（D-42）', () => {
  it('内容不是合法 JSON：update 抛错，原文件一个字节都不动', async () => {
    fs.writeFileSync(FILE(), '{oops', 'utf8')
    const repo = createRepo()

    await expect(
      repo.update((value) => {
        value.list.push('写不进去')
      }),
    ).rejects.toThrow('拒绝覆盖写')

    expect(fs.readFileSync(FILE(), 'utf8')).toBe('{oops')
    expect(fs.existsSync(`${FILE()}.bak`)).toBe(false)
  })

  it('读取失败：update 同样拒绝写，不拿默认值覆盖', async () => {
    writeFromOtherProcess({ list: ['真实数据'] })
    const repo = createRepo()
    disk.failRead = true

    await expect(
      repo.update((value) => {
        value.list.push('写不进去')
      }),
    ).rejects.toThrow('拒绝覆盖写')

    disk.failRead = false
    expect(read()).toEqual({ list: ['真实数据'] })
  })

  it('read 仍然报坏因，由 UI 提示（读这条路径不许被改动牵连）', async () => {
    fs.writeFileSync(FILE(), '{oops', 'utf8')
    const result = await createRepo().read()
    expect(result.reason).toBeTruthy()
    // 旧断言是「读到 fallback `{ list: [] }`」；4a96f63 之后坏读没有 value，
    // 同一个意图变成「业务拿不到值」
    expect(result).not.toHaveProperty('value')
  })
})
