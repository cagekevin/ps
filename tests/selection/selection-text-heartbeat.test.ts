import { beforeEach, describe, expect, it, vi } from 'vitest'
import { log } from '@/utils/logger'

/**
 * TD-13-6：事件来了、属性却没跟上 —— 快照冻结在上一层，必须说出来。
 *
 * 判据只认「我们已经知道有事发生」这一刻：事件触发后 `STALE_AFTER_MS` 内没读到新属性
 * 才算旧。用户什么都不做的时候没有事件，因此不会误报（报警要能一直开着才有用）。
 */

const jsx = vi.hoisted(() => ({ font: { getFontSimpleInfo: vi.fn() } }))
const ps = vi.hoisted(() => ({ initJsx: vi.fn(async () => undefined) }))
const events = vi.hoisted(() => ({ listeners: {} as Record<string, (p: unknown) => void> }))

vi.mock('@/cep/jsx', () => ({ jsx }))
vi.mock('@/cep/ps', () => ps)
vi.mock('@/cep/events', () => ({
  subscribeHostEvent: async (name: string, listener: (p: unknown) => void) => {
    events.listeners[name] = listener
    return () => {}
  },
}))

const { startTextInfoWatch, refreshTextInfo, textInfoStale, STALE_AFTER_MS } =
  await import('@/selection/current-text')

const TEXT_INFO = {
  size: '12 点',
  weight: 'Regular',
  family: '苹方',
  color: { rgb: { r: 0, g: 0, b: 0 } },
}
/** 两臂成功臂：宿主返回值包在 `data` 里 */
const TEXT_OK = { ok: true, data: TEXT_INFO }

beforeEach(() => {
  jsx.font.getFontSimpleInfo.mockReset()
  events.listeners = {}
  textInfoStale.value = ''
})

describe('文字属性心跳', () => {
  it('事件触发后迟迟读不回来 → 标 stale 且日志有 error；读到后自动解除', async () => {
    vi.useFakeTimers()
    jsx.font.getFontSimpleInfo.mockResolvedValue(TEXT_OK)
    await startTextInfoWatch()

    // 这一次读取挂住不返回（PS 没回包）
    let release: () => void = () => {}
    jsx.font.getFontSimpleInfo.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(TEXT_OK)
      }),
    )

    events.listeners.selection({ eventData: { layerID: [7] } })
    expect(textInfoStale.value).toBe('')

    await vi.advanceTimersByTimeAsync(STALE_AFTER_MS + 1)
    expect(textInfoStale.value).toContain('可能不是当前选区')
    expect(log.dump()).toContain('文字属性更新超时')

    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(textInfoStale.value).toBe('')

    vi.useRealTimers()
  })

  it('用户什么都没动（没有事件）时不误报', async () => {
    vi.useFakeTimers()
    jsx.font.getFontSimpleInfo.mockResolvedValue(TEXT_OK)
    await startTextInfoWatch()

    await vi.advanceTimersByTimeAsync(STALE_AFTER_MS * 10)
    expect(textInfoStale.value).toBe('')

    vi.useRealTimers()
  })

  it('跳过的原因写具体：只写「跳过」等于没写（分不清正常跳过还是 payload 坏了）', async () => {
    jsx.font.getFontSimpleInfo.mockResolvedValue(TEXT_OK)
    await startTextInfoWatch()

    events.listeners.selection({ eventData: { layerID: [1, 2] } })

    expect(log.dump()).toContain('宿主事件跳过：selection')
    expect(log.dump()).toContain('slct 选中 2 个图层')
  })

  it('读失败时 stale 不冒充「读失败」（两个状态各管一段）', async () => {
    jsx.font.getFontSimpleInfo.mockResolvedValue({ ok: false, code: 'JSX', reason: '没有文字图层' })
    await refreshTextInfo()

    expect(textInfoStale.value).toBe('')
  })
})
