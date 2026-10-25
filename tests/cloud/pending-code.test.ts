import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * logger 与被测模块必须拿到**同一个模块实例**的 `log`：
 * `vi.resetModules()` 之后，静态 import 的与动态 import 的不是同一份。
 * 所以两个都在 `beforeEach` 里动态 import（同一轮解析 ⇒ 同一实例）。
 */
let log: typeof import('@/utils/logger').log

/**
 * TD-11-8：待同步痕迹要带得上**具体错误码**，不能只有 5 个粗桶。
 *
 * 为什么不是多加几个 `reason`：`reason` 是"用户该做什么"的粗分类（页面按它选文案），
 * 错误码是"技术上到底怎么了"（日志、后续按码处理）。两者维度不同；
 * 把码塞进 `reason` 会让 FiveReason 变成十五桶，而每一桶都得配一句专属文案。
 *
 * 顺带钉住兼容性：老痕迹（没有 `code` 字段）读回来不许报错、也不许凭空造一个码。
 */

const store = vi.hoisted(() => ({ prefs: new Map<string, unknown>() }))

vi.mock('@/cep/data/settings', () => ({
  getPref: (key: string, fallback: unknown) =>
    store.prefs.has(key) ? store.prefs.get(key) : fallback,
  setPref: (key: string, value: unknown) => {
    store.prefs.set(key, value)
  },
}))

beforeEach(async () => {
  // 重载模块 = "面板重开" ⇒ logger 的内存缓冲是干净的（不再需要专门的清场函数）
  vi.resetModules()
  log = (await import('@/utils/logger')).log
  const pending = await import('@/cep/cloud/pending')
  readPendingChanges = pending.readPendingChanges
  recordPendingChanges = pending.recordPendingChanges
  resetPendingWarn = pending.__resetPendingWarnForTest
  store.prefs.clear()
  resetPendingWarn()
})

let readPendingChanges: typeof import('@/cep/cloud/pending').readPendingChanges
let recordPendingChanges: typeof import('@/cep/cloud/pending').recordPendingChanges
let resetPendingWarn: typeof import('@/cep/cloud/pending').__resetPendingWarnForTest

describe('pending 痕迹的错误码', () => {
  it('记进去的码能读回来（落盘形状带上 code）', () => {
    recordPendingChanges(['font.tags'], 'network', 'CLOUD_PERMISSION')

    expect(readPendingChanges()).toEqual([
      { unit: 'font.tags', at: expect.any(Number), reason: 'network', code: 'CLOUD_PERMISSION' },
    ])
  })

  it('码同时写进日志，并带一句"用户该做什么"（权限错别让人干等重试）', () => {
    recordPendingChanges(['font.tags'], 'network', 'CLOUD_PERMISSION')

    const dumped = log.dump()
    expect(dumped).toContain('CLOUD_PERMISSION')
    expect(dumped).toContain('不会自己好')
    expect(dumped).toContain('部署权限')
  })

  it('没有码时不多写字段（老调用处 / 老痕迹照旧）', () => {
    recordPendingChanges(['font.tags'], 'network')

    const [entry] = readPendingChanges()
    expect(entry).toMatchObject({ unit: 'font.tags', reason: 'network' })
    expect('code' in entry).toBe(false)
  })

  it('老痕迹里 code 形状不对时不抛，也不造码', () => {
    store.prefs.set('cloud.pending', [
      { unit: 'font.tags', at: 1, reason: 'network', code: 42 },
      { unit: 'font.stars', at: 2, reason: 'conflict', code: 'CLOUD_PERMISSION' },
    ])

    const items = readPendingChanges()
    expect(items[0]).toMatchObject({ unit: 'font.tags' })
    expect('code' in items[0]).toBe(false)
    expect(items[1].code).toBe('CLOUD_PERMISSION')
  })
})
