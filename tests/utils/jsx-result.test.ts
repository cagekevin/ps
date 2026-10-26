import { describe, expect, it } from 'vitest'
import { asJsxOutcome, typedOutcome } from '@/utils/jsx-result'
import { decoderOf, shapeFail } from '@/utils/decode'
import { isRecord } from '@/utils/guards'

/**
 * 两臂契约的凭证（R2-2）：
 * - 成功臂 `{ ok: true; data }` —— `data` 原样保留
 * - 失败臂 `{ ok: false; code; reason; hostCode? }` —— code 是本仓错误码，hostCode 是宿主的
 */
describe('asJsxOutcome', () => {
  it('null / 空串算成功且无数据', () => {
    expect(asJsxOutcome(null)).toEqual({ status: 'ok', data: undefined })
    expect(asJsxOutcome('')).toEqual({ status: 'ok', data: undefined })
    expect(asJsxOutcome('undefined')).toEqual({ status: 'ok', data: undefined })
  })

  it('"ok" 保留原值（调用方靠它区分"宿主说 ok"与"宿主给了数据"）', () => {
    expect(asJsxOutcome('ok')).toEqual({ status: 'ok', data: 'ok' })
    expect(asJsxOutcome('OK')).toEqual({ status: 'ok', data: 'OK' })
  })

  it('数组与无 err 的对象算成功，数据原样保留', () => {
    expect(asJsxOutcome([1, 2])).toEqual({ status: 'ok', data: [1, 2] })
    expect(asJsxOutcome({ family: 'MiSans' })).toEqual({ status: 'ok', data: { family: 'MiSans' } })
  })

  it('err == 1（含字符串 "1"）算失败，带 msg；hostCode 原样带出', () => {
    expect(asJsxOutcome({ err: 1, msg: '没有选中文字' })).toMatchObject({
      status: 'error',
      fail: 'JSX',
      reason: '没有选中文字',
    })
    expect(asJsxOutcome({ err: '1', code: 1 })).toMatchObject({
      status: 'error',
      fail: 'JSX',
      hostCode: 1,
    })
  })

  it('err == 0 算成功，data 取出', () => {
    expect(asJsxOutcome({ err: 0, data: { size: '12 点' } })).toEqual({
      status: 'ok',
      data: { size: '12 点' },
    })
  })

  it('未知 err（2 / -1 / NaN）不再当成功，且说明原值（TD-16-8）', () => {
    // 旧口径是「只有 err === 1 算失败」⇒ err=2 / -1 / NaN 全被当成功。
    // 现在只有 err === 0 是成功，未知值一律失败并报出原值。
    const two = asJsxOutcome({ err: 2 })
    expect(two.status === 'ok').toBe(false)
    // 清单 R2：「err 非 0 非 1 判 PARSE」—— 未知状态 = 读不懂返回值，不是"宿主说失败"
    expect(two.status === 'error' ? two.fail : '').toBe('PARSE')
    expect(two.status === 'error' ? two.reason : '').toContain('未知状态')
    expect(asJsxOutcome({ err: -1 }).status).toBe('error')
    expect(asJsxOutcome({ err: 'x' }).status).toBe('error')
  })

  it('失败臂自带 code 与原因；成功臂的 data 要先判 `status` 才能取（TS 收窄）', () => {
    const bad = asJsxOutcome({ err: 1, msg: '读取失败' })
    expect(bad.status === 'ok').toBe(false)
    expect(bad.status === 'error' ? bad.reason : '').toContain('读取失败')
    const good = asJsxOutcome({ err: 0, data: 1 })
    expect(good.status === 'ok').toBe(true)
    expect(good.status === 'ok' ? good.data : null).toBe(1)
  })
})

/**
 * `typedOutcome`：把**已解释过的**两臂 + 一个 `Decoder<T>` 收成 `JsxOutcome<T>`。
 *
 * 为什么必须有用例：它此前**零覆盖**，于是 `decode` 一直保留 `T | null` 通道 ——
 * "结构不认识"是个 `null`，说不出**哪个字段**、**期望什么**（TD-18-10）。
 * 判据：失败臂取不到 `data`，且 reason 里带得回码与观测。
 */
describe('typedOutcome', () => {
  it('decode 通过 → 成功臂带值', () => {
    const out = typedOutcome({ status: 'ok', data: { a: 1 } }, decoderOf(isRecord), '读配置')
    expect(out).toEqual({ status: 'ok', data: { a: 1 } })
  })

  it('decode 给码 → PARSE + 码与观测（不是一句"结构不认识"）', () => {
    const out = typedOutcome({ status: 'ok', data: 42 }, decoderOf(isRecord), '读配置')

    expect(out).toMatchObject({ status: 'error', fail: 'PARSE' })
    expect(out.status === 'error' ? out.reason : '').toBe('读配置: shape.top(expected=object)')
    // 失败臂**取不到值**：不是 data 为 undefined，而是根本没有 data 这个键
    expect('data' in out).toBe(false)
  })

  it('形状臂带字段名：expected/actual 一起回来', () => {
    const out = typedOutcome(
      { status: 'ok', data: { list: 'not-array' } },
      (raw) =>
        isRecord(raw) && Array.isArray(raw.list)
          ? { value: raw.list }
          : shapeFail('list', 'array', isRecord(raw) ? raw.list : raw),
      '读列表',
    )

    expect(out.status === 'error' ? out.reason : '').toBe('读列表: shape.list(expected=array)')
  })

  it('宿主已失败 → 原样返回，不在这里二次解释', () => {
    const host = { status: 'error' as const, fail: 'JSX' as const, reason: '宿主炸了' }
    expect(typedOutcome(host, decoderOf(isRecord), '读配置')).toEqual(host)
  })
})
