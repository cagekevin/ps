import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-11-7：离线不算失败（ADR-21：闸门 skip 不消耗退避），但**必须可观测**。
 *
 * 三条一起钉住，缺一条这条债就没还完：
 * ① 不消耗退避（skip 不改 attempts、不排退避重试）；
 * ② 留一条可查痕迹（脏 unit 记 pending + 日志里一句"没发请求、不消耗退避"）；
 * ③ 不弹 toast —— 后台行为默认不打断用户（`src/cloud`、`src/cep/cloud` 都不 import feedback，
 *    本用例把 feedback 换成 spy 之后仍然零调用，等于把这个"不许"变成机器判据）。
 *
 * 顺带钉住旧 bug：sweep（脏集为空）遇离线时，旧 `finally` 条件
 * `dirty.size > 0 || retryAt > now` 为假 → 这一轮跳过之后再也不会重试。
 */

const pending = vi.hoisted(() => ({
  record: vi.fn(),
  list: vi.fn(() => []),
  clear: vi.fn(),
}))

const feedback = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), ok: vi.fn() }))

vi.mock('@/cep/cloud/entries', () => ({ cloudEntries: [] }))
vi.mock('@/cep/cloud/config', () => ({
  // 名字跟生产者对齐（TD-11-10 正名）：mock 少一个导出会让被测代码拿到 undefined
  isCloudUrlUsable: () => true,
  isAutoSyncEnabled: () => true,
}))
vi.mock('@/cep/cloud/ledger', () => ({
  readCloudLedger: async () => ({ status: 'ok', ledger: { rev: 1, syncedAt: 1, localHash: 'h' } }),
  writeCloudLedger: () => {},
}))
vi.mock('@/cep/cloud/pending', () => ({
  recordPendingChanges: pending.record,
  readPendingChanges: pending.list,
  clearPendingChanges: pending.clear,
}))
vi.mock('@/cep/cloud/transport', () => ({
  pushSnapshot: async () => {},
  pullSnapshot: async () => ({ status: 'empty' as const }),
}))
// 不弹 toast 的判据：整条云同步链没有 feedback 的入口。接了就会被这里记到。
vi.mock('@/stores/feedback', () => ({ useFeedbackStore: () => feedback }))

const MAX_WAIT = 5 * 60_000
const DEBOUNCE = 60_000

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

beforeEach(() => {
  vi.resetModules()
  pending.record.mockClear()
  vi.clearAllMocks()
})

/**
 * 每个用例都拿**同一个**模块实例里的 logger 与队列。
 *
 * `vi.resetModules()` 之后，静态 import 的 `log` 与 setup 里那份就不是一个对象了——
 * 之前踩过：断言读到空 dump，红得莫名其妙（假证据）。
 */
async function boot() {
  const logger = await import('@/utils/logger')
  logger.__resetLoggerForTest()
  const setup = await import('@/cep/cloud/setup')
  return { log: logger.log, queue: setup.cloudSyncQueue }
}

afterEach(() => {
  setOnline(true)
})

describe('离线走闸门', () => {
  it('脏 unit 留痕（pending 带 CLOUD_OFFLINE）且不消耗退避', async () => {
    vi.useFakeTimers()
    setOnline(false)
    const { log, queue } = await boot()

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(DEBOUNCE)

    expect(pending.record).toHaveBeenCalledWith(['font.tags'], 'network', 'CLOUD_OFFLINE')
    expect(queue.attempts()).toBe(0) // 没发请求 ⇒ 不吃退避额度
    expect(log.dump()).toContain('CLOUD_OFFLINE')
    expect(log.dump()).toContain('不消耗退避')

    // 不弹 toast：后台行为不打断用户
    expect(feedback.error).not.toHaveBeenCalled()
    expect(feedback.warn).not.toHaveBeenCalled()

    queue.stop()
    vi.useRealTimers()
  })

  it('sweep（脏集为空）离线后仍会再试：不是跳过一次就彻底静默', async () => {
    vi.useFakeTimers()
    setOnline(false)
    const { log, queue } = await boot()

    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)
    expect(log.dump()).toContain('CLOUD_OFFLINE')

    // sweep 没有具体 unit：不记 pending（没有"哪一项"可指）
    expect(pending.record).not.toHaveBeenCalled()

    // 旧实现到这里就永远不动了；现在按最大等待慢轮询，网络回来能自己恢复
    log.clear()
    setOnline(true)
    await vi.advanceTimersByTimeAsync(MAX_WAIT)

    expect(log.dump()).toContain('云同步恢复正常')
    queue.stop()
    vi.useRealTimers()
  })

  it('在线时不留离线痕迹（离线分支不能把正常轮次也标成待同步）', async () => {
    vi.useFakeTimers()
    setOnline(true)
    const { queue } = await boot()

    queue.markDirty('font.tags')
    await vi.advanceTimersByTimeAsync(DEBOUNCE)

    expect(pending.record).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'CLOUD_OFFLINE',
    )

    queue.stop()
    vi.useRealTimers()
  })
})
