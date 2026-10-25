import { afterEach, describe, expect, it, vi } from 'vitest'
import { CepError, ERR_PREFIX } from '@/utils/errors'
import { evalScriptRaw, hasCep, jsxRead } from '@/cep/transport'

type Bridge = { evalScript: (script: string, cb: (res: string) => void) => void }
const holder = window as unknown as { __adobe_cep__?: Bridge }

function setBridge(evalScript: Bridge['evalScript']) {
  holder.__adobe_cep__ = { evalScript }
}

afterEach(() => {
  delete holder.__adobe_cep__
  vi.useRealTimers()
})

describe('hasCep', () => {
  it('没有桥时为 false，有 evalScript 时为 true', () => {
    expect(hasCep()).toBe(false)
    setBridge(() => {})
    expect(hasCep()).toBe(true)
  })
})

describe('evalScriptRaw', () => {
  it('没有 CEP 环境时抛 NO_CEP', async () => {
    await expect(evalScriptRaw('1')).rejects.toMatchObject({ code: 'NO_CEP' })
  })

  it('正常返回脚本结果', async () => {
    setBridge((_script, cb) => cb('ok'))
    await expect(evalScriptRaw('1')).resolves.toBe('ok')
  })

  it('CEP 的 EvalScript error. 转成 JSX 错误', async () => {
    setBridge((_script, cb) => cb('EvalScript error.'))
    await expect(evalScriptRaw('1')).rejects.toMatchObject({ code: 'JSX' })
  })

  it('桥同步抛错时也转成 JSX 错误', async () => {
    setBridge(() => {
      throw new Error('bridge boom')
    })
    await expect(evalScriptRaw('1')).rejects.toThrow('bridge boom')
  })

  it('超时抛 TIMEOUT_UNKNOWN（不是「失败」，是「不知道做没做成」），晚到的回调不会二次结算', async () => {
    vi.useFakeTimers()
    let late: ((res: string) => void) | undefined
    setBridge((_script, cb) => {
      late = cb
    })

    const task = evalScriptRaw('long', 1000)
    const assertion = expect(task).rejects.toMatchObject({ code: 'TIMEOUT_UNKNOWN' })
    await vi.advanceTimersByTimeAsync(1001)
    await assertion

    expect(() => late?.('too late')).not.toThrow()
  })

  it('超时后队列锁不提前释放：PS 那条还没回包，下一条不许进 ExtendScript', async () => {
    vi.useFakeTimers()
    const calls: { script: string; cb: (res: string) => void }[] = []
    setBridge((script, cb) => calls.push({ script, cb }))

    const first = evalScriptRaw('one', 1000)
    const second = evalScriptRaw('two', 1000)

    const assertion = expect(first).rejects.toMatchObject({ code: 'TIMEOUT_UNKNOWN' })
    await vi.advanceTimersByTimeAsync(1001)
    await assertion

    // 关键：我们不等了，但 PS 侧那条可能还在跑，队列不许放行
    expect(calls).toHaveLength(1)

    // PS 终于回包 → 这时才轮到下一条
    calls[0].cb('1')
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toHaveLength(2)

    calls[1].cb('2')
    await expect(second).resolves.toBe('2')
  })

  it('超时后 PS 始终不回包 → 到宽限期强制放行，且留 warn（队列不许永久卡死）', async () => {
    vi.useFakeTimers()
    const calls: { script: string; cb: (res: string) => void }[] = []
    setBridge((script, cb) => calls.push({ script, cb }))

    const first = evalScriptRaw('one', 1000)
    const second = evalScriptRaw('two', 1000)
    const assertion = expect(first).rejects.toMatchObject({ code: 'TIMEOUT_UNKNOWN' })
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    expect(calls).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(120_000 + 1)
    expect(calls).toHaveLength(2)

    calls[1].cb('2')
    await expect(second).resolves.toBe('2')
  })

  it('严格串行：前一条没回来，后一条不进入 ExtendScript', async () => {
    const calls: { script: string; cb: (res: string) => void }[] = []
    setBridge((script, cb) => calls.push({ script, cb }))

    const first = evalScriptRaw('one')
    const second = evalScriptRaw('two')
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toHaveLength(1)

    calls[0].cb('1')
    await expect(first).resolves.toBe('1')
    await Promise.resolve()
    expect(calls).toHaveLength(2)

    calls[1].cb('2')
    await expect(second).resolves.toBe('2')
  })

  it('前一条失败不阻塞队列', async () => {
    let count = 0
    setBridge((_script, cb) => {
      count++
      cb(count === 1 ? 'EvalScript error.' : 'ok')
    })

    const failed = evalScriptRaw('one')
    const next = evalScriptRaw('two')
    await expect(failed).rejects.toMatchObject({ code: 'JSX' })
    await expect(next).resolves.toBe('ok')
  })
})

describe('jsxRead', () => {
  it('字符串参数转义单引号和反斜杠，数字布尔裸传', async () => {
    let captured = ''
    setBridge((script, cb) => {
      captured = script
      cb('null')
    })
    await jsxRead('cy_zoom', ["a'b\\c", 3, true, { x: 1 }])

    expect(captured).toContain(`'a\\'b\\\\c'`)
    expect(captured).toContain(', 3, true, ')
    expect(captured).toContain(`'{"x":1}'`)
  })

  it(`${ERR_PREFIX} 前缀抛 CepError，并带上 label`, async () => {
    setBridge((_script, cb) => cb(`${ERR_PREFIX}没有选中图层`))
    await expect(jsxRead('cy_zoom', [], { label: '设置字体' })).rejects.toThrow(
      '设置字体：没有选中图层',
    )
  })

  it('参数里有 undefined 时提前报出是第几个，不让它变成 TypeError', async () => {
    // JSON.stringify(undefined) 返回 undefined 而不是字符串，toJsxArg 里 .replace 会抛
    // 「Cannot read properties of undefined」—— 报错完全指不到调用点。
    setBridge((_script, cb) => cb('null'))
    await expect(
      jsxRead('cy_distributedByPitch', [1, undefined], { label: '分布' }),
    ).rejects.toThrow('分布：第 2 个参数是 undefined')
  })

  it('空串与 undefined 返回 undefined', async () => {
    setBridge((_script, cb) => cb(''))
    await expect(jsxRead('cy_zoom')).resolves.toEqual({ ok: true, data: undefined })
    setBridge((_script, cb) => cb('undefined'))
    await expect(jsxRead('cy_zoom')).resolves.toEqual({ ok: true, data: undefined })
  })

  it('合法 JSON 解析', async () => {
    setBridge((_script, cb) => cb('{"ok":true}'))
    await expect(jsxRead('cy_zoom')).resolves.toEqual({ ok: true, data: { ok: true } })
  })

  it('jsxbin 的成功哨兵 ok / OK 原样返回（不是"读不懂"）', async () => {
    setBridge((_script, cb) => cb('ok'))
    await expect(jsxRead('cy_zoom')).resolves.toEqual({ ok: true, data: 'ok' })
    setBridge((_script, cb) => cb('OK'))
    await expect(jsxRead('cy_zoom')).resolves.toEqual({ ok: true, data: 'OK' })
  })

  /**
   * TD-12-9：非 JSON 且不是哨兵 = **读不懂**。
   * 旧实现 `return raw as unknown as T` 把字符串当对象交给消费侧——
   * 形状错误从此一路流进业务，只在很下游才炸，而且报错指不回这里。
   */
  it('非 JSON 且非哨兵 → 抛 PARSE，带 label 与原值片段（不再原样返回）', async () => {
    setBridge((_script, cb) => cb('纯文本'))

    const error = await jsxRead('cy_zoom', [], { label: '读取字体' }).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'PARSE' })
    expect((error as Error).message).toContain('读取字体')
    expect((error as Error).message).toContain('纯文本')
    expect((error as Error).message).toContain('不是 JSON')
  })

  it('错误码是 CepError.JSX，不是普通 Error', async () => {
    setBridge((_script, cb) => cb(`${ERR_PREFIX}boom`))
    await expect(jsxRead('cy_zoom')).rejects.toBeInstanceOf(CepError)
  })
})
