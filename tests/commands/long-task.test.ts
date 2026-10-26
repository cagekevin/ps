import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/data', () => ({ starsRepo: {}, starsWriter: {}, tagsRepo: {}, tagsWriter: {} }))
vi.mock('@/cep/data/settings', () => ({ settingsSnapshot: () => ({}) }))
vi.mock('@/cep/jsx', () => ({
  jsx: { font: {}, layer: {}, env: {} },
}))

import { __resetForTest, execute, register } from '@/commands/registry'
import { resetProgressPort, setProgressPort } from '@/commands/runtime'

const begin = vi.fn()

beforeEach(() => {
  __resetForTest()
  begin.mockReset()
})

afterEach(() => {
  resetProgressPort()
})

describe('长任务生命周期', () => {
  it('kind=long 自动 begin/end，命令拿到的 progress 会透传', async () => {
    const update = vi.fn()
    const end = vi.fn()
    begin.mockReturnValue({ update, end })
    setProgressPort({ begin })

    register({
      id: 'test.long',
      title: '播放动作',
      group: 'action',
      requires: 'none',
      kind: 'long',
      async invoke(ctx) {
        ctx.progress.update(0.5, '第 5 个')
      },
    })

    await expect(execute('test.long')).resolves.toEqual({ status: 'ok' })

    expect(begin).toHaveBeenCalledWith('播放动作')
    expect(update).toHaveBeenCalledWith(0.5, '第 5 个')
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('命令失败也要 end（不能留下永远转圈的 HUD）', async () => {
    const end = vi.fn()
    begin.mockReturnValue({ update: () => {}, end })
    setProgressPort({ begin })

    register({
      id: 'test.fail',
      title: '批量导出',
      group: 'file',
      requires: 'none',
      kind: 'long',
      async invoke() {
        throw new Error('导出失败')
      },
    })

    await expect(execute('test.fail')).resolves.toMatchObject({
      status: 'error',
      reason: '导出失败',
    })
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('kind=instant 不创建任务', async () => {
    setProgressPort({ begin })

    register({
      id: 'test.instant',
      title: '立即执行',
      group: 'system',
      requires: 'none',
      kind: 'instant',
      async invoke() {},
    })

    await expect(execute('test.instant')).resolves.toEqual({ status: 'ok' })
    expect(begin).not.toHaveBeenCalled()
  })
})
