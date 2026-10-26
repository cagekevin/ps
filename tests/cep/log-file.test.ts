import { createRequire } from 'node:module'
import { installHostRequire, removeHostRequire } from '../helpers/host-stub'
import { hasNode } from '@/cep/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 日志落盘的真实链路（真 `cep/log-file.ts` + 真 `logger` + 内存里的假 `node:fs`）。
 *
 * 这一条对应本轮验收：**注入一条真实失败 → 原语 → 语义层 → 落点 → 能查到**。
 * 用假 fs 而不是真磁盘，是因为要能注入 EACCES/ENOSPC，且要断言"文件里到底写了什么"。
 */
const realRequire = createRequire(import.meta.url)

const disk = {
  files: new Map<string, string>(),
  /** 非空 = 写这个路径时抛这个错误码 */
  writeError: '',
  /** 非空 = 读这个路径时抛这个错误码（读不到上一会话历史同样是观测缺口） */
  readError: '',
  writes: 0,
}

function fakeFs() {
  return {
    mkdirSync: () => {},
    writeFileSync: (p: string, data: string) => {
      if (disk.writeError) {
        throw Object.assign(new Error(`${disk.writeError}: 模拟写失败`), { code: disk.writeError })
      }
      disk.writes += 1
      disk.files.set(p, String(data))
    },
    renameSync: (from: string, to: string) => {
      const data = disk.files.get(from)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      disk.files.set(to, data)
      disk.files.delete(from)
    },
    unlinkSync: (p: string) => {
      disk.files.delete(p)
    },
    readFileSync: (p: string) => {
      if (disk.readError) {
        throw Object.assign(new Error(`${disk.readError}: 模拟读失败`), { code: disk.readError })
      }
      const data = disk.files.get(p)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return data
    },
    existsSync: (p: string) => disk.files.has(p),
  }
}

function installRequire() {
  installHostRequire((id: string) => (id === 'fs' ? fakeFs() : realRequire(id)))
}

/** 真路径由 `userDir()` 算（jsdom 下没有 APPDATA，会落到 homedir），所以动态取 */
const { userDir } = await import('@/cep/paths')
const logPath = () => `${userDir()}/sj_v5_log.txt`
const readLog = () => disk.files.get(logPath()) ?? ''

beforeEach(() => {
  disk.files.clear()
  disk.writeError = ''
  disk.readError = ''
  disk.writes = 0
  installRequire()
  vi.useFakeTimers()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  removeHostRequire()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
  vi.resetModules()
})

/**
 * 建"面板启动"：新 logger 模块实例 + 落盘口（读同一个假盘）。
 *
 * 落盘口是**反向注册**的：`@/cep/log-file` 导入时在模块顶层自己注册进 logger
 * （不再由外面拼装）。所以这里导入即生效 —— 走的正是生产那条路。
 */
async function boot() {
  const logger = await import('@/utils/logger')
  // 落盘实现**不需要被调用**：logger 在自己模块顶层就装好了（import 即装）
  await import('@/cep/log-file')
  return { logger }
}

describe('日志落盘 · 关掉重开还查得到', () => {
  it('真实失败走通全程：log.error → 文件 → 重开后 dump 得到', async () => {
    const first = await boot()
    first.logger.log.error('settings', '偏好文件读不到，本次不保存偏好', { reason: 'EACCES' })
    vi.advanceTimersByTime(500)
    expect(readLog()).toContain('偏好文件读不到')

    // 面板重开
    vi.resetModules()
    const second = await boot()
    expect(second.logger.log.dump()).toContain('偏好文件读不到')
    expect(second.logger.log.dump()).toContain('EACCES')
  })

  it('读不到上一会话历史（load 抛错）→ 也算落盘失败，不静默', async () => {
    disk.readError = 'EACCES'
    const { logger } = await boot()

    // 读历史失败也要喊出来（"关掉重开查不到"同样是观测缺口）
    const dumped = logger.log.dump()
    expect(dumped).toContain('日志落盘失败')
    expect(dumped).toContain('EACCES')
  })

  it('落盘失败只喊一次（掉线时不把日志自己刷满）', async () => {
    disk.writeError = 'ENOSPC'
    const { logger } = await boot()

    // 真实时序：append 只是入队，真正的写在**节流窗口**后 flush ⇒ 失败在那时才现形
    for (let i = 0; i < 5; i += 1) logger.log.warn('repo', `第 ${i} 条`)
    vi.advanceTimersByTime(500)

    const failures = logger.log
      .dump()
      .split('\n')
      .filter((line) => line.includes('日志落盘失败'))
    expect(failures).toHaveLength(1)

    // 再来一轮失败：仍然只应该有一条（否则掉线时日志自己会被刷满）
    logger.log.warn('repo', '又一条')
    vi.advanceTimersByTime(500)
    const again = logger.log
      .dump()
      .split('\n')
      .filter((line) => line.includes('日志落盘失败'))
    expect(again).toHaveLength(1)
  })

  it('新实例的内存是空的，dump 出来的就是"上次会话的历史"（不是本次现场）', async () => {
    const first = await boot()
    first.logger.log.warn('style', '旧文件读不到，跳过回收')
    vi.advanceTimersByTime(500)

    // 面板重开：新模块实例 ⇒ 内存空，盘上那条还在
    vi.resetModules()
    const second = await boot()
    expect(second.logger.log.dump()).toContain('旧文件读不到')
    // 本次会话还没写任何东西 ⇒ dump 里只有历史那一行
    expect(second.logger.log.dump().split('\n')).toHaveLength(1)

    // 写一条新的 ⇒ 历史 + 本次现场
    second.logger.log.info('logger', '本次第一条')
    expect(second.logger.log.dump().split('\n')).toHaveLength(2)
  })

  it('落盘失败不反噬业务，且日志里有一条"落盘失败"（不许静默）', async () => {
    disk.writeError = 'ENOSPC'
    const { logger } = await boot()

    expect(() => logger.log.error('repo', '写入失败')).not.toThrow()
    vi.advanceTimersByTime(500)

    // 落盘失败被记成一条**日志**（含原因 ENOSPC），不是只在磁盘边角里失败
    expect(logger.log.dump()).toContain('日志落盘失败')
    expect(logger.log.dump()).toContain('ENOSPC')
    // 业务那条也还在（内存里）
    expect(logger.log.dump()).toContain('写入失败')
  })

  it('上限：超过 400 行只留最近的，且 error 不被 warn 挤掉', async () => {
    const { logger } = await boot()

    logger.log.error('repo', '第一条错误')
    for (let i = 0; i < 450; i += 1) logger.log.info('repo', `第 ${i} 条`)
    logger.log.error('repo', '最后一条错误')
    vi.advanceTimersByTime(500)

    const lines = readLog().trimEnd().split('\n')
    expect(lines.length).toBeLessThanOrEqual(400 + 2)
    // 最近的都在
    expect(readLog()).toContain('最后一条错误')
    expect(readLog()).toContain('第 449 条')
    // 最早的 info 被挤掉了
    expect(readLog()).not.toContain('第 0 条服务') // 防误判：本条只断言下面这条
    expect(readLog()).not.toContain('] 第 0 条')
    // 第一条 error 活下来（error 是用户报障唯一能用的证据）
    expect(readLog()).toContain('第一条错误')
  })

  it('文件被外部写大过（超过 400 行）→ load 只把最近 400 行读回内存', async () => {
    disk.files.set(
      logPath(),
      Array.from({ length: 600 }, (_, i) => `00:00:00.000 INFO [repo] 历史 ${i}`).join('\n'),
    )

    const { logger } = await boot()
    const dumped = logger.log.dump().split('\n')
    expect(dumped).toHaveLength(400)
    expect(dumped[dumped.length - 1]).toContain('历史 599')
    expect(dumped[0]).toContain('历史 200')
  })

  it('写成功前不落盘（节流），一次 flush 只写一次文件', async () => {
    const { logger } = await boot()
    logger.log.info('repo', 'a')
    logger.log.info('repo', 'b')

    expect(disk.writes).toBe(0)
    vi.advanceTimersByTime(500)
    expect(disk.writes).toBe(1)
    expect(readLog()).toContain('a')
    expect(readLog()).toContain('b')
  })
})
