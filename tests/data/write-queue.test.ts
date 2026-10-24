import { describe, expect, it } from 'vitest'
import { runQueued } from '@/cep/data/write-queue'

/**
 * TD-09-18：数据层只有一条写链。
 *
 * 以前三套 `enqueue`：`swatch-repo`（导出的那条）、`file-repo` 的实例级队列、
 * `action-archive` 自己一条。前两条互不相干，第三条连前缀都没对齐 —— 于是
 * 「导入 .dzx 写 N 个库文件 + 索引」与「面板里改动作库」可以交错，后写的覆盖先写的。
 * 现在四处都用 `runQueued`，下面钉住它的两个语义。
 */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

describe('runQueued：一条链', () => {
  it('两个任务不交错（后一个必须等前一个结束）', async () => {
    const log: string[] = []

    const a = runQueued(async () => {
      log.push('a:start')
      await sleep(10)
      log.push('a:end')
    })
    const b = runQueued(async () => {
      log.push('b:start')
      await sleep(1)
      log.push('b:end')
    })

    await Promise.all([a, b])
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })

  it('前一个失败不阻塞后一个（和 transport 的队列同一约定）', async () => {
    const badge: string[] = []

    await expect(
      runQueued(async () => {
        throw new Error('前一个炸了')
      }),
    ).rejects.toThrow('前一个炸了')

    const result = await runQueued(async () => {
      badge.push('后一个照跑')
      return 42
    })

    expect(result).toBe(42)
    expect(badge).toEqual(['后一个照跑'])
  })

  it('跨"模块"也是同一条链：并发排队的任务严格按排入顺序完成', async () => {
    const done: number[] = []
    await Promise.all(
      [0, 1, 2, 3].map((index) =>
        runQueued(async () => {
          await sleep(4 - index)
          done.push(index)
        }),
      ),
    )
    expect(done).toEqual([0, 1, 2, 3])
  })
})
