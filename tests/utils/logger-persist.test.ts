import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 「失败发生过」必须在**面板关掉重开之后**还查得到（本轮验收核心）。
 *
 * 旧实现只有 200 条内存环形缓冲：PS 一关全没，用户报"刚才出错了"谁也拿不到证据。
 * 这里用**假 sink**（内存数组）证明 logger 的契约本身：
 * 写入 → 模块实例被丢掉（= 面板重开）→ 新实例 `attachLogSink` 读回 → `dump()` 仍能看到那条。
 * 真实落盘（真 fs）在 `tests/cep/log-file.test.ts`。
 */
function makeSink() {
  const lines: string[] = []
  return {
    lines,
    load: () => [...lines],
    append: (line: string) => {
      lines.push(line)
    },
  }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.resetModules()
})

describe('logger · 落盘口契约', () => {
  it('写入后重开（新模块实例）仍能 dump 到那条历史', async () => {
    const sink = makeSink()

    const first = await import('@/utils/logger')
    first.attachLogSink(sink)
    first.log.error('settings', '偏好文件读不到，本次不保存偏好', { reason: 'EACCES' })

    // 面板重开：内存全没，只剩盘上那份
    vi.resetModules()
    const second = await import('@/utils/logger')
    second.attachLogSink(sink)

    const dumped = second.log.dump()
    expect(dumped).toContain('偏好文件读不到')
    expect(dumped).toContain('EACCES')
  })

  it('新实例的内存是空的，dump 出来的就是"上次会话的历史"（不是本次现场）', async () => {
    const sink = makeSink()
    const first = await import('@/utils/logger')
    first.attachLogSink(sink)
    first.log.warn('style', '旧文件读不到，跳过回收')

    vi.resetModules()
    const second = await import('@/utils/logger')
    second.attachLogSink(sink)

    // 本次会话还没写任何东西，dump 里出现的只能是历史
    expect(second.log.dump()).toContain('旧文件读不到')
    second.log.info('logger', '本次第一条')
    expect(second.log.dump().split('\n')).toHaveLength(2)
  })

  it('落盘口 append 抛错 → 业务调用不受影响，且内存里有一条"落盘失败"', async () => {
    const broken = {
      load: () => [],
      append: () => {
        throw new Error('ENOSPC: no space left on device')
      },
    }

    const mod = await import('@/utils/logger')
    mod.attachLogSink(broken)

    // 不许抛：日志是观测设施，不能反噬业务
    expect(() => mod.log.error('repo', '写入失败')).not.toThrow()

    const dumped = mod.log.dump()
    expect(dumped).toContain('写入失败')
    expect(dumped).toContain('日志落盘失败')
    expect(dumped).toContain('ENOSPC')
  })

  it('落盘口 load 抛错 → 也算落盘失败（读不到历史同样是观测缺口）', async () => {
    const mod = await import('@/utils/logger')
    mod.attachLogSink({
      load: () => {
        throw new Error('sj_v5_log.txt 读不到：EACCES')
      },
      append: () => {},
    })

    const dumped = mod.log.dump()
    expect(dumped).toContain('日志落盘失败')
    expect(dumped).toContain('EACCES')
  })

  it('落盘失败只喊一次（掉线时不把日志自己刷满）', async () => {
    const mod = await import('@/utils/logger')
    mod.attachLogSink({
      load: () => [],
      append: () => {
        throw new Error('EPERM')
      },
    })

    for (let i = 0; i < 5; i += 1) mod.log.warn('repo', `第 ${i} 条`)

    const failures = mod.log
      .dump()
      .split('\n')
      .filter((line) => line.includes('日志落盘失败'))
    expect(failures).toHaveLength(1)
  })
})
