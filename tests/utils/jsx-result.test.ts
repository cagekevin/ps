import { describe, expect, it } from 'vitest'
import { asJsxResult, requireJsxOk } from '@/utils/jsx-result'

describe('asJsxResult', () => {
  it('null / 空串 / "ok" 都算成功且无数据', () => {
    expect(asJsxResult(null)).toEqual({ ok: true })
    expect(asJsxResult('')).toEqual({ ok: true })
    expect(asJsxResult('ok')).toEqual({ ok: true })
  })

  it('数组与无 err 的对象算成功，数据原样保留', () => {
    expect(asJsxResult([1, 2])).toEqual({ ok: true, data: [1, 2] })
    expect(asJsxResult({ family: 'MiSans' })).toEqual({ ok: true, data: { family: 'MiSans' } })
  })

  it('err == 1（含字符串 "1"）算失败，带 msg / code', () => {
    expect(asJsxResult({ err: 1, msg: '没有选中文字' })).toMatchObject({
      ok: false,
      err: 1,
      msg: '没有选中文字',
    })
    expect(asJsxResult({ err: '1', code: 1 })).toMatchObject({ ok: false, err: 1, code: 1 })
  })

  it('err == 0 算成功，data 取出', () => {
    expect(asJsxResult({ err: 0, data: { size: '12 点' } })).toEqual({
      ok: true,
      err: 0,
      data: { size: '12 点' },
    })
  })

  it('requireJsxOk 失败时抛 jsx 错误', () => {
    expect(() => requireJsxOk({ err: 1, msg: '读取失败' }, '兜底')).toThrow('读取失败')
    expect(requireJsxOk({ err: 0, data: 1 }, '兜底')).toBe(1)
  })
})
