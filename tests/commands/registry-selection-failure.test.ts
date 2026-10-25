import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import type { Command } from '@/commands/types'

/**
 * TD-13-4：选区查询失败的原因与 code 不许被 `.catch(() => null)` 吞掉。
 *
 * 两件事各自钉一条：
 * ① `requires: layer/textLayer` 的命令失败时，用户看到的是**真实原因**（带 code），
 *    不是一句和这次操作无关的「读取选区失败」；
 * ② `requires: none / document` 的命令本来就不看选区，不许被无关的读取失败连坐。
 */

const selection = vi.hoisted(() => ({
  refresh: vi.fn(),
  current: vi.fn(() => ({ hasSelection: true, typeNumber: 2 })),
}))

vi.mock('@/selection', () => selection)

const { __resetForTest, execute, register } = await import('@/commands/registry')

function makeCommand(partial: Partial<Command<void>> = {}): Command<void> {
  return {
    id: 'test.ok',
    title: '测试命令',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    invoke: async () => {},
    ...partial,
  }
}

beforeEach(() => {
  __resetForTest()
  selection.refresh.mockReset()
  selection.current.mockClear()
})

describe('选区查询失败时', () => {
  it('requires:layer 的命令把真实原因和 code 带给用户（不是一句「读取选区失败」）', async () => {
    selection.refresh.mockRejectedValue(
      new CepError('PARSE', 'Layer_getTypeNumber 返回了无法识别的值'),
    )
    register(makeCommand({ id: 'test.layer', requires: 'layer' }))

    const result = await execute('test.layer')

    expect(result).toMatchObject({ ok: false, code: 'PARSE' })
    if (result.ok === false) {
      expect(result.reason).toContain('Layer_getTypeNumber 返回了无法识别的值')
    }
    expect(log.dump()).toContain('前置查询选区失败')
  })

  it('requires:none 的命令不受连坐，照常执行', async () => {
    selection.refresh.mockRejectedValue(new CepError('NO_CEP', 'CEP 回调监听不可用'))
    const invoke = vi.fn(async () => {})
    register(makeCommand({ id: 'test.export', requires: 'none', invoke }))

    await expect(execute('test.export')).resolves.toEqual({ ok: true })
    expect(invoke).toHaveBeenCalledTimes(1)
    // 用的是上一次快照，而不是"空选区"
    expect(selection.current).toHaveBeenCalled()
  })

  it('requires:document 同样不连坐', async () => {
    selection.refresh.mockRejectedValue(new CepError('JSX', 'EvalScript 执行失败'))
    const invoke = vi.fn(async () => {})
    register(makeCommand({ id: 'test.doc', requires: 'document', invoke }))

    await expect(execute('test.doc')).resolves.toEqual({ ok: true })
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('textLayer 的失败也要说原因（这条最容易被误读成「没选文字图层」）', async () => {
    selection.refresh.mockRejectedValue(new CepError('INIT', 'ztgl_initSystemList 不可用'))
    register(makeCommand({ id: 'test.text', requires: 'textLayer' }))

    const result = await execute('test.text')

    expect(result).toMatchObject({ ok: false, code: 'INIT' })
    if (result.ok === false) {
      expect(result.reason).toContain('ztgl_initSystemList 不可用')
      expect(result.reason).not.toBe('读取选区失败')
    }
  })
})
