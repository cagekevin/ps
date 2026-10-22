import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
}))

import { __resetForTest, execute, get, isEnabled, list, register } from '@/commands/registry'
import type { Command } from '@/commands/types'

function makeCommand(partial: Partial<Command<void>> = {}): Command<void> {
  return {
    id: 'test.ok',
    title: '测试命令',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    run: async () => {},
    ...partial,
  }
}

beforeEach(() => {
  __resetForTest()
  selection.hasSelection = true
  selection.typeNumber = 2
})

describe('注册与查询', () => {
  it('注册后能 get 到，list 按 group 过滤', () => {
    register(makeCommand())
    register(makeCommand({ id: 'font.x', group: 'font' }))

    expect(get('test.ok')?.title).toBe('测试命令')
    expect(list().map((c) => c.id)).toEqual(['test.ok', 'font.x'])
    expect(list({ group: 'font' }).map((c) => c.id)).toEqual(['font.x'])
  })

  it('list 返回的元数据不含 run（页面不能绕过 execute）', () => {
    register(makeCommand())
    expect('run' in list()[0]).toBe(false)
  })
})

describe('execute', () => {
  it('成功返回 ok:true', async () => {
    const run = vi.fn(async () => {})
    register(makeCommand({ run }))

    await expect(execute('test.ok')).resolves.toEqual({ ok: true })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('命令抛 CepError → ok:false 并带 code，不向外抛', async () => {
    register(
      makeCommand({
        run: async () => {
          throw new CepError('NO_SELECTION', '请先选择一个文字图层')
        },
      }),
    )

    const result = await execute('test.ok')
    expect(result).toEqual({
      ok: false,
      reason: '请先选择一个文字图层',
      code: 'NO_SELECTION',
    })
  })

  it('requires 不满足时不执行 run', async () => {
    selection.hasSelection = false
    const run = vi.fn(async () => {})
    register(makeCommand({ id: 'need.layer', requires: 'layer', run }))

    const result = await execute('need.layer')
    expect(result).toEqual({ ok: false, reason: '请先选择一个图层' })
    expect(run).not.toHaveBeenCalled()
  })

  it('textLayer 要求类型为 2', async () => {
    selection.typeNumber = 1
    register(makeCommand({ id: 'need.text', requires: 'textLayer', run: async () => {} }))

    await expect(execute('need.text')).resolves.toMatchObject({ ok: false })
  })

  it('命令不存在时返回失败而不是抛', async () => {
    await expect(execute('nope')).resolves.toEqual({ ok: false, reason: '命令不存在：nope' })
  })
})

describe('isEnabled', () => {
  it('跟随当前选区快照', () => {
    register(makeCommand({ id: 'need.layer', requires: 'layer' }))

    selection.hasSelection = true
    expect(isEnabled('need.layer')).toBe(true)

    selection.hasSelection = false
    expect(isEnabled('need.layer')).toBe(false)
  })

  it('未注册的 id 为 false', () => {
    expect(isEnabled('nope')).toBe(false)
  })

  it('可以传外部快照（useCommand.disabled 依赖响应式 ref）', () => {
    register(makeCommand({ id: 'need.layer', requires: 'layer' }))

    expect(isEnabled('need.layer', { hasSelection: false, typeNumber: 0 })).toBe(false)
    expect(isEnabled('need.layer', { hasSelection: true, typeNumber: 2 })).toBe(true)
  })
})
