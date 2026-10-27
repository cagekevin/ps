import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 离线不算失败（ADR-21：闸门 skip 不消耗退避），但**必须可观测**。
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
  // 名字跟生产者对齐：mock 少一个导出会让被测代码拿到 undefined
  isCloudUrlUsable: () => true,
  isAutoSyncEnabled: () => true,
}))
vi.mock('@/cep/cloud/ledger', () => ({
  readCloudLedger: async () => ({ status: 'ok', value: { rev: 1, syncedAt: 1, localHash: 'h' } }),
  writeCloudLedger: () => {},
}))
vi.mock('@/cep/cloud/pending', () => ({
  recordPendingChanges: pending.record,
  readPendingChanges: pending.list,
  clearPendingChanges: pending.clear,
}))
vi.mock('@/cep/cloud/transport', () => ({
  pushSnapshot: async () => {},
  pullSnapshot: async () => ({ status: 'notSeen' as const }),
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
    // 反向对照：有具体 unit 时不写 sweep 那句——两句不能互相顶替
    expect(log.dump()).not.toContain('全量补偿同步没有执行')

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
    //sweep 离线必须留下**自己的**可观察痕迹。旧实现按 `units.length === 0`
    // 早退，只剩 reportSyncOutcome 那句通用的"本轮跳过"，看不出"这一轮是全量补偿没跑"
    expect(log.dump()).toContain('全量补偿同步没有执行')

    // sweep 没有具体 unit：不记 pending（没有"哪一项"可指），也不许造 '*' / 'all' 伪 unit
    expect(pending.record).not.toHaveBeenCalled()

    // 旧实现到这里就永远不动了；现在按最大等待慢轮询，网络回来能自己恢复
    // 清现场靠「模块重载」（boot() 里重新 import ⇒ 新实例），
    // 不再需要 logger 导出一个清场函数（它的导出面只有 `log` 一个东西）
    setOnline(true)
    await vi.advanceTimersByTimeAsync(MAX_WAIT)

    expect(log.dump()).toContain('云同步恢复正常')
    queue.stop()
    vi.useRealTimers()
  })

  /**
   * 第二半：留痕要能看见，但**不许变成心跳**。
   *
   * 离线会按最大等待慢轮询，一小时十几轮；每轮都 warn 一遍同样的字，等于把 warn 降级成
   * 噪音（"记跃迁不记心跳"）。判据：离线连续两轮只留一句；恢复在线后再离线
   * 重新留一句（跃迁两头都要有）。
   */
  it('离线 sweep 的留痕只写跃迁：连续两轮一句，恢复后再离线重新一句', async () => {
    vi.useFakeTimers()
    setOnline(false)
    const { log, queue } = await boot()

    const timesWarned = () => log.dump().split('全量补偿同步没有执行').length - 1

    queue.requestSync('boot')
    await vi.advanceTimersByTimeAsync(0)
    expect(timesWarned()).toBe(1)

    // 第二轮慢轮询（还是离线）：不许再写一遍
    await vi.advanceTimersByTimeAsync(MAX_WAIT)
    expect(timesWarned()).toBe(1)
    // 而且始终没有把 sweep 记成 pending（两轮都没记）
    expect(pending.record).not.toHaveBeenCalled()

    // 恢复在线：这一轮真的跑成了
    setOnline(true)
    await vi.advanceTimersByTimeAsync(MAX_WAIT)

    // 再离线：新一轮跃迁，必须重新留一句（否则用户又回到"无痕"）
    setOnline(false)
    queue.requestSync('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(timesWarned()).toBe(2)

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
