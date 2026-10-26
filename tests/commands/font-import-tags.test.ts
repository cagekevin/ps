import { beforeEach, describe, expect, it, vi } from 'vitest'
import { msg } from '@/domain/messages'

/**
 * `font.importTags` 的**解析失败路径**（解析收口刀 4 的凭据）。
 *
 * 为什么必须有它：`parseTagImport` 此前是「`JSON.parse` + 一串中文 `{error}`」，
 * 换成判别联合后，**失败怎么传出去**是这条链唯一会退化的地方 —— 没人守就没人知道。
 * 判据：坏输入 ⇒ `CepError('PARSE')`，且文案来自 `describeDecodeFail`（唯一渲染处），
 * 并且**一个字都不写盘**。
 */
const dialog = vi.hoisted(() => ({ openFile: vi.fn(), saveFile: vi.fn() }))
const fsRead = vi.hoisted(() => ({ readExternalText: vi.fn() }))
const writers = vi.hoisted(() => ({
  tagsWriter: { update: vi.fn() },
  starsWriter: { update: vi.fn() },
}))

vi.mock('@/cep/dialog', () => dialog)
vi.mock('@/cep/fs-read', () => fsRead)
vi.mock('@/cep/data', () => ({ ...writers, tagsRepo: {}, starsRepo: {} }))
vi.mock('@/cep/jsx', () => ({ jsx: { font: {}, layer: {}, env: { setEnv: vi.fn() } } }))
vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: false, typeNumber: 0 }),
  current: () => ({ hasSelection: false, typeNumber: 0 }),
  selectionRef: { value: { hasSelection: false, typeNumber: 0 } },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')

const PAYLOAD = { onConfirm: undefined as undefined | (() => Promise<boolean>) }

beforeEach(() => {
  vi.clearAllMocks()
  dialog.openFile.mockReturnValue('C:/导入.json')
})

/**
 * `execute()` **不抛**：它把异常折成 `CommandOutcome`（`{status:"error", fail, reason}`）。
 * 所以断言落在 outcome 上 —— 这也正是用户看到的那一层。
 */
async function failOf(run: Promise<unknown>): Promise<{ fail: string; reason: string }> {
  const outcome = (await run) as { status: string; fail?: string; reason?: string }
  expect(outcome.status).toBe('error')
  return { fail: outcome.fail ?? '', reason: outcome.reason ?? '' }
}

describe('font.importTags · 解析失败路径', () => {
  it('不是合法 JSON → PARSE，文案来自唯一渲染处，且不写盘', async () => {
    fsRead.readExternalText.mockResolvedValue({ status: 'ok', text: 'not json' })

    const fail = await failOf(execute('font.importTags', PAYLOAD))

    expect(fail.fail).toBe('PARSE')
    expect(fail.reason).toBe(msg.data.fn.decodeNotJson())
    expect(writers.tagsWriter.update).not.toHaveBeenCalled()
  })

  it('标签项缺 text → PARSE，文案说得出**哪个字段**（不是一句"格式不对"）', async () => {
    fsRead.readExternalText.mockResolvedValue({
      status: 'ok',
      text: JSON.stringify([{ name: '缺 text' }]),
    })

    const fail = await failOf(execute('font.importTags', PAYLOAD))

    expect(fail.fail).toBe('PARSE')
    expect(fail.reason).toContain('[0].text')
    expect(writers.tagsWriter.update).not.toHaveBeenCalled()
  })

  it('顶层既不是数组也不是对象 → PARSE（形状臂带期望/实际）', async () => {
    fsRead.readExternalText.mockResolvedValue({ status: 'ok', text: '42' })

    const fail = await failOf(execute('font.importTags', PAYLOAD))

    expect(fail.fail).toBe('PARSE')
    expect(fail.reason).toContain('期望 object')
  })

  it('对照：合法数组 + 确认 → 写盘一次（证明失败分支不是"什么都抛"）', async () => {
    const tags = [{ text: '标签A' }, { text: '标签B', xz: true }]
    fsRead.readExternalText.mockResolvedValue({ status: 'ok', text: JSON.stringify(tags) })

    await execute('font.importTags', { onConfirm: async () => true })

    expect(writers.tagsWriter.update).toHaveBeenCalledTimes(1)
    expect(writers.starsWriter.update).not.toHaveBeenCalled()
  })

  it('对照：用户取消确认 → 不写盘', async () => {
    fsRead.readExternalText.mockResolvedValue({
      status: 'ok',
      text: JSON.stringify([{ text: '标签A' }]),
    })

    const outcome = (await execute('font.importTags', { onConfirm: async () => false })) as {
      status: string
    }
    expect(outcome.status === 'ok').toBe(false)
    expect(writers.tagsWriter.update).not.toHaveBeenCalled()
  })
})
