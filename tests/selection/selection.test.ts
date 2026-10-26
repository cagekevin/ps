import { beforeEach, describe, expect, it, vi } from 'vitest'

const ps = vi.hoisted(() => ({ getLayerState: vi.fn() }))

vi.mock('@/cep/ps', () => ps)

const { current, refresh, selectionRef, __pushForTest } = await import('@/selection')

beforeEach(() => {
  ps.getLayerState.mockReset()
  __pushForTest({ hasSelection: false, typeNumber: 0 })
})

describe('选区快照', () => {
  it('refresh 向 PS 查一次，并写入响应式 ref', async () => {
    ps.getLayerState.mockResolvedValue({ hasSelection: true, typeNumber: 2 })

    const next = await refresh()

    expect(next).toEqual({ hasSelection: true, typeNumber: 2 })
    expect(current()).toEqual(next)
    // useCommand.disabled 依赖这个 ref，所以必须同步更新
    expect(selectionRef.value).toEqual(next)
  })

  it('并发 refresh 复用同一个请求（避免一次操作查两次选区）', async () => {
    ps.getLayerState.mockResolvedValue({ hasSelection: true, typeNumber: 2 })

    await Promise.all([refresh(), refresh(), refresh()])
    expect(ps.getLayerState).toHaveBeenCalledTimes(1)
  })

  it('查询完成后允许下一次查询（inflight 被清空）', async () => {
    ps.getLayerState.mockResolvedValue({ hasSelection: true, typeNumber: 2 })

    await refresh()
    await refresh()
    expect(ps.getLayerState).toHaveBeenCalledTimes(2)
  })

  it('查询失败不改变快照，由调用方决定如何提示', async () => {
    ps.getLayerState.mockRejectedValue(new Error('EvalScript error.'))
    __pushForTest({ hasSelection: true, typeNumber: 2 })

    await expect(refresh()).rejects.toThrow(/EvalScript/)
    expect(current()).toEqual({ hasSelection: true, typeNumber: 2 })
  })

  it('__pushForTest 模拟选区变化（仅测试用）', () => {
    __pushForTest({ hasSelection: false, typeNumber: 0 })
    expect(current().hasSelection).toBe(false)
  })
})
