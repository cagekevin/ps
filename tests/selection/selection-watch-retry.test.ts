import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'

/**
 * 订阅失败不许被固化成「空订阅成功态」。
 *
 * 旧实现 `stopWatch = () => {}`：一次失败之后这个会话再也不会重试，
 * `selectionRef` 停在 EMPTY，`useCommand.disabled` 把按钮全灰，界面零提示。
 * 现在失败要满足三件事：① 状态是 `degraded` 且带原因；② 日志有 error（关掉重开查得到）；
 * ③ **还能再试**——既包括调用方再喊一次，也包括下一次查询成功后自动重试。
 */

const events = vi.hoisted(() => ({ subscribeHostEvent: vi.fn() }))
const ps = vi.hoisted(() => ({
  getLayerState: vi.fn(),
  initJsx: vi.fn(async () => undefined),
}))

vi.mock('@/cep/events', () => events)
vi.mock('@/cep/ps', () => ps)

const { startSelectionWatch, refresh, watchStateRef, __resetWatchForTest } =
  await import('@/selection')

beforeEach(() => {
  events.subscribeHostEvent.mockReset()
  ps.getLayerState.mockReset()
  __resetWatchForTest()
})

describe('startSelectionWatch 失败', () => {
  it('置 degraded + 保留原因 + 日志留 error（不是一句 warn 了事）', async () => {
    ps.getLayerState.mockResolvedValue({ hasSelection: true, typeNumber: 2 })
    events.subscribeHostEvent.mockRejectedValue(new CepError('NO_CEP', 'CEP 回调监听不可用'))

    await startSelectionWatch()

    expect(watchStateRef.value.status).toBe('error')
    const failed = watchStateRef.value.status === 'error' ? watchStateRef.value : null
    expect(failed?.detail).toContain('CEP 回调监听不可用')
    expect(failed?.failedAt).toBeTypeOf('number')
    expect(log.dump()).toContain('选区事件订阅失败')
  })

  it('失败后还能再试（旧实现会缓存空订阅，第二次直接返回 no-op）', async () => {
    ps.getLayerState.mockResolvedValue({ hasSelection: true, typeNumber: 2 })
    events.subscribeHostEvent.mockRejectedValueOnce(new Error('boom'))
    events.subscribeHostEvent.mockResolvedValueOnce(() => {})

    await startSelectionWatch()
    expect(events.subscribeHostEvent).toHaveBeenCalledTimes(1)

    await startSelectionWatch()
    expect(events.subscribeHostEvent).toHaveBeenCalledTimes(2)
    expect(watchStateRef.value.status).toBe('watching')
  })

  it('下一次查询成功后自动重试（不需要人工再喊一次）', async () => {
    vi.useFakeTimers()
    ps.getLayerState.mockResolvedValue({ hasSelection: false, typeNumber: 0 })
    events.subscribeHostEvent.mockRejectedValueOnce(new Error('boom'))
    events.subscribeHostEvent.mockResolvedValueOnce(() => {})

    await startSelectionWatch()
    expect(watchStateRef.value.status).toBe('error')

    // 间隔不够：不重试（否则每条命令都去注册一次事件）
    await refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(events.subscribeHostEvent).toHaveBeenCalledTimes(1)

    // 过了重试间隔：随手一次查询就能把它救回来
    vi.setSystemTime(Date.now() + 10_001)
    await refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(events.subscribeHostEvent).toHaveBeenCalledTimes(2)
    expect(watchStateRef.value.status).toBe('watching')

    vi.useRealTimers()
  })
})
