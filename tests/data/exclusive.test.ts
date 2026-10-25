import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `exclusive.ts` 的**行为证据**。
 *
 * 它是这轮唯一一个**新增机制**（不是改形状），正确性完全靠三条断言：
 *   1. 域被占时，第二次进入**必须抛**（不是排队、不是静默并行）
 *   2. 任务抛错/失败后，域**必须被释放**（否则一次失败就把功能永久锁死）
 *   3. 不同域**互不阻塞**（按文件族分域的全部意义）
 *
 * 第 4 条（`importActionArchive` 进行中再触发）是用户点名的场景：
 * 导入中间有真 `await`（读用户选的文件），第二次触发就是从这个窗口插进来的。
 */
const gate = vi.hoisted(() => {
  let release: (() => void) | null = null
  return {
    /** 挂起下一次 `readExternalText`，直到 `release()` */
    wait: () =>
      new Promise<void>((resolve) => {
        release = resolve
      }),
    release: () => {
      release?.()
      release = null
    },
    reset: () => {
      release = null
    },
  }
})

vi.mock('@/cep/fs-read', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/fs-read')>()
  return {
    ...actual,
    // 只替换「读用户对话框选的文件」这一个：它是导入里唯一的真 await，
    // 也是并发窗口所在。其余读原语保持真实实现。
    readExternalText: async () => {
      await gate.wait()
      return { status: 'ok' as const, text: '' }
    },
  }
})

const { runExclusive, runExclusiveAsync } = await import('@/cep/data/exclusive')
const { importActionArchive } = await import('@/cep/data/action-archive')

beforeEach(() => gate.reset())
afterEach(() => gate.reset())

describe('同步域（runExclusive）', () => {
  it('域被占时第二次进入抛「还没完成」，不是排队也不是并行', () => {
    let inner: unknown = null
    runExclusive('ku-files', '样式库删除', () => {
      try {
        runExclusive('ku-files', '样式库导入', () => undefined)
      } catch (e) {
        inner = e
      }
    })

    expect(inner).toBeInstanceOf(Error)
    expect((inner as Error).message).toContain('样式库导入还没完成')
  })

  it('任务抛错后域被释放（一次失败不会把功能永久锁死）', () => {
    expect(() =>
      runExclusive('ku-files', '样式库删除', () => {
        throw new Error('搬文件失败')
      }),
    ).toThrow('搬文件失败')

    // 再进一次必须成功 —— 这是 `finally` 的存在理由
    expect(runExclusive('ku-files', '样式库删除', () => 'ok')).toBe('ok')
  })

  it('正常完成后域被释放', () => {
    runExclusive('ku-files', '样式库删除', () => undefined)
    expect(runExclusive('ku-files', '样式库导入', () => 'ok')).toBe('ok')
  })

  it('不同域互不阻塞（按文件族分域的意义）', () => {
    const result = runExclusive('ku-files', '样式库删除', () =>
      runExclusive('action-files', '动作库删除', () => 'both'),
    )
    expect(result).toBe('both')
  })
})

describe('异步域（runExclusiveAsync）', () => {
  it('第一个还在 await 时，第二个立刻被拒', async () => {
    let releaseFirst!: () => void
    const firstRunning = runExclusiveAsync('action-files', '动作库导入', async () => {
      await new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      return 'first'
    })

    await expect(runExclusiveAsync('action-files', '动作库导入', async () => 'second')).rejects.toThrow(
      /动作库导入还没完成/,
    )

    releaseFirst()
    await expect(firstRunning).resolves.toBe('first')
  })

  it('任务 reject 后域被释放', async () => {
    await expect(
      runExclusiveAsync('action-files', '动作库导入', async () => {
        throw new Error('解析失败')
      }),
    ).rejects.toThrow('解析失败')

    await expect(runExclusiveAsync('action-files', '动作库导入', async () => 'ok')).resolves.toBe('ok')
  })
})

describe('真实入口：importActionArchive', () => {
  it('导入进行中再触发一次 → 第二次立刻被拒，不是排队', async () => {
    // 第一轮挂在 `readExternalText` 上（就是那个真 await 的窗口）
    const first = importActionArchive(false, '/fake/a.dzx')
    first.catch(() => undefined) // 放行后它会因空内容失败，别让它变成 unhandled rejection
    await Promise.resolve() // 让第一轮跑到 await

    await expect(importActionArchive(false, '/fake/b.dzx')).rejects.toThrow(/还没完成/)

    gate.release()
    // 第一轮自己失败（空文件解不出东西），但**失败原因不是互斥** —— 说明它真的跑完了
    await expect(first).rejects.toThrow()
  })
})
