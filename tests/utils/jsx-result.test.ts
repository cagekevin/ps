import { describe, expect, it } from 'vitest'
import { asJsxOutcome } from '@/utils/jsx-result'

/**
 * 两臂契约的凭证（R2-2）：
 * - 成功臂 `{ ok: true; data }` —— `data` 原样保留
 * - 失败臂 `{ ok: false; code; reason; hostCode? }` —— code 是本仓错误码，hostCode 是宿主的
 */
describe('asJsxOutcome', () => {
  it('null / 空串算成功且无数据', () => {
    expect(asJsxOutcome(null)).toEqual({ ok: true, data: undefined })
    expect(asJsxOutcome('')).toEqual({ ok: true, data: undefined })
    expect(asJsxOutcome('undefined')).toEqual({ ok: true, data: undefined })
  })

  it('"ok" 保留原值（调用方靠它区分"宿主说 ok"与"宿主给了数据"）', () => {
    expect(asJsxOutcome('ok')).toEqual({ ok: true, data: 'ok' })
    expect(asJsxOutcome('OK')).toEqual({ ok: true, data: 'OK' })
  })

  it('数组与无 err 的对象算成功，数据原样保留', () => {
    expect(asJsxOutcome([1, 2])).toEqual({ ok: true, data: [1, 2] })
    expect(asJsxOutcome({ family: 'MiSans' })).toEqual({ ok: true, data: { family: 'MiSans' } })
  })

  it('err == 1（含字符串 "1"）算失败，带 msg；hostCode 原样带出', () => {
    expect(asJsxOutcome({ err: 1, msg: '没有选中文字' })).toMatchObject({
      ok: false,
      code: 'JSX',
      reason: '没有选中文字',
    })
    expect(asJsxOutcome({ err: '1', code: 1 })).toMatchObject({
      ok: false,
      code: 'JSX',
      hostCode: 1,
    })
  })

  it('err == 0 算成功，data 取出', () => {
    expect(asJsxOutcome({ err: 0, data: { size: '12 点' } })).toEqual({
      ok: true,
      data: { size: '12 点' },
    })
  })

  it('未知 err（2 / -1 / NaN）不再当成功，且说明原值（TD-16-8）', () => {
    // 旧口径是「只有 err === 1 算失败」⇒ err=2 / -1 / NaN 全被当成功。
    // 现在只有 err === 0 是成功，未知值一律失败并报出原值。
    const two = asJsxOutcome({ err: 2 })
    expect(two.ok).toBe(false)
    // 清单 R2：「err 非 0 非 1 判 PARSE」—— 未知状态 = 读不懂返回值，不是"宿主说失败"
    expect(two.ok === false ? two.code : '').toBe('PARSE')
    expect(two.ok === false ? two.reason : '').toContain('未知状态')
    expect(asJsxOutcome({ err: -1 }).ok).toBe(false)
    expect(asJsxOutcome({ err: 'x' }).ok).toBe(false)
  })

  it('失败臂自带 code 与原因；成功臂的 data 要先判 ok 才能取（TS 收窄）', () => {
    const bad = asJsxOutcome({ err: 1, msg: '读取失败' })
    expect(bad.ok).toBe(false)
    expect(bad.ok === false ? bad.reason : '').toContain('读取失败')
    const good = asJsxOutcome({ err: 0, data: 1 })
    expect(good.ok).toBe(true)
    expect(good.ok ? good.data : null).toBe(1)
  })
})
