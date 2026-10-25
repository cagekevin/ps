import { describe, expect, it, vi } from 'vitest'

/**
 * /：jsx 超时**按语义分三档、只有一份常量**。
 *
 * 以前 `READ/WRITE/LONG` 在 font / style / commonUse 各定义一遍（font 写 20s、commonUse 写 60s），
 * 其余 6 个域裸数字。这里钉两件事：
 * 1. 三档的数值与语义（改回旧值会红）；
 * 2. **每个域真的用那一档**（按"这次调用在等什么"），靠 mock 掉 jsxCall 看它收到什么。
 */
const jsxCall = vi.hoisted(() => vi.fn(async () => ({ ok: true, data: undefined })))
vi.mock('@/cep/transport', () => ({
  // 唯一入口的公开面是 `jsxRead`/`jsxWrite`；内部 `jsxCall` 不导出。
  // 本测试只看底下 `jsxCall` 收到的 timeout ⇒ 两个入口都透传给它。
  jsxRead: (...args: Parameters<typeof jsxCall>) => jsxCall(...args),
  jsxWrite: (...args: Parameters<typeof jsxCall>) => jsxCall(...args),
}))

const { READ, WRITE, LONG } = await import('@/cep/jsx/timeouts')
const { createFontJsx } = await import('@/cep/jsx/font')
const { createCommonUseJsx } = await import('@/cep/jsx/commonUse')
const { createRenameJsx } = await import('@/cep/jsx/rename')

function lastTimeout(): number | undefined {
  const calls = jsxCall.mock.calls as unknown as Array<[string, unknown[], { timeout?: number }?]>
  return calls.at(-1)?.[2]?.timeout
}

describe('jsx 超时分档', () => {
  it('三档数值与语义（读 10s / 写 60s / 长任务 300s）', () => {
    expect(READ).toBe(10_000)
    expect(WRITE).toBe(60_000)
    expect(LONG).toBe(300_000)
    // 写档必须容得下"弹对话框等用户"，所以不许回到 20s
    expect(WRITE).toBeGreaterThan(20_000)
  })

  it('读用 READ 档', () => {
    const font = createFontJsx()
    jsxCall.mockClear()
    font.getTypeUnits()
    expect(lastTimeout()).toBe(READ)
  })

  it('写用 WRITE 档（font 与 commonUse 同一个值，不再差三倍）', () => {
    const font = createFontJsx()
    jsxCall.mockClear()
    font.setFont('PSName', '名字', 'Regular')
    const fontWrite = lastTimeout()

    const commonUse = createCommonUseJsx()
    jsxCall.mockClear()
    commonUse.locationTrade()
    const commonWrite = lastTimeout()

    expect(fontWrite).toBe(WRITE)
    expect(commonWrite).toBe(WRITE)
    expect(fontWrite).toBe(commonWrite)
  })

  it('长任务用 LONG 档（系统字体表 / 改名批处理）', () => {
    const font = createFontJsx()
    jsxCall.mockClear()
    font.initSystemList()
    expect(lastTimeout()).toBe(LONG)

    const rename = createRenameJsx()
    jsxCall.mockClear()
    rename.batchName('a', true)
    expect(lastTimeout()).toBe(LONG)
  })
})
