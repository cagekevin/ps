import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CustomRequest } from '@/domain/custom'

/**
 * 自定义页命令（`/custom`）。
 *
 * 验的是**命令层行为**：
 * - 空选区直接失败，不调 jsx
 * - 生成链的调用顺序：checkStatus → mergeRectangles → generate
 * - 合并矩形的链路：checkMergeRectangles → mergeRectangles
 * - jsx 失败时命令失败并把 msg 带出来
 *
 * UNVERIFIED: 四个 jsx 函数的参数形状与返回结构未实测
 * （`docs/页面/04-自定义.md:60-62`）。这里断言的是**我们发出的调用**，
 * 不是 PS 侧对参数的理解。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 1 }))

/**
 * 四个 jsx 假实现。返回类型照 `jsx/types.ts` 的 `CustomJsx` 写 `Promise<unknown>`：
 * 真实返回结构未实测（见上），命令层用 `utils/jsx-result` 兜形态，
 * 所以用例可以喂 `{ err: 0 }` 也可以喂 `{ err: 1, msg }`，无需给 mock 放宽到 any。
 */
const custom = vi.hoisted(() => ({
  checkStatus: vi.fn<(request: CustomRequest) => Promise<unknown>>(async () => ({ err: 0 })),
  checkMergeRectangles: vi.fn<(request: CustomRequest) => Promise<unknown>>(async () => ({
    err: 0,
  })),
  mergeRectangles: vi.fn<(request: CustomRequest) => Promise<unknown>>(async () => ({ err: 0 })),
  generate: vi.fn<(request: CustomRequest) => Promise<unknown>>(async () => ({ err: 0 })),
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

vi.mock('@/cep/jsx', () => ({
  jsx: {
    custom,
    font: {},
    layer: {},
    env: {},
    action: {},
    legacy: {},
    rename: {},
    style: {},
  },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { NO_SELECTION_TEXT } = await import('@/commands/custom')

const request: CustomRequest = {
  shapeIndex: 0,
  textLocation: 0,
  heightIstrue: false,
  rowSpacing: '8px',
  columnSpacing: '8px',
  textSize1: '0',
  textSize2: '0',
  unit: 'px',
  lines: [{ tip: '第1行', text: '1:2:1', height: '', arr: [0], allcount: '1', pattern: 0 }],
}

beforeEach(() => {
  setActivePinia(createPinia())
  selection.hasSelection = true
  custom.checkStatus.mockReset().mockResolvedValue({ err: 0 })
  custom.checkMergeRectangles.mockReset().mockResolvedValue({ err: 0 })
  custom.mergeRectangles.mockReset().mockResolvedValue({ err: 0 })
  custom.generate.mockReset().mockResolvedValue({ err: 0 })
})

describe('custom.generate', () => {
  it('按 checkStatus → mergeRectangles → generate 的顺序调用', async () => {
    const order: string[] = []
    custom.checkStatus.mockImplementation(async () => {
      order.push('checkStatus')
      return { err: 0 }
    })
    custom.mergeRectangles.mockImplementation(async () => {
      order.push('mergeRectangles')
      return { err: 0 }
    })
    custom.generate.mockImplementation(async () => {
      order.push('generate')
      return { err: 0 }
    })

    await expect(execute('custom.generate', { request })).resolves.toEqual({ ok: true })
    expect(order).toEqual(['checkStatus', 'mergeRectangles', 'generate'])
  })

  it('把页面状态原样发给 jsx', async () => {
    await execute('custom.generate', { request })

    expect(custom.generate).toHaveBeenCalledWith(request)
  })

  it('空选区直接失败，不调任何 jsx', async () => {
    selection.hasSelection = false

    const result = await execute('custom.generate', { request })

    expect(result).toMatchObject({ ok: false, reason: NO_SELECTION_TEXT })
    expect(custom.checkStatus).not.toHaveBeenCalled()
    expect(custom.generate).not.toHaveBeenCalled()
  })

  it('状态检查失败时中止，不进入生成', async () => {
    custom.checkStatus.mockResolvedValue({ err: 1, msg: '没有可用的矩形' })

    const result = await execute('custom.generate', { request })

    expect(result).toMatchObject({ ok: false, reason: '没有可用的矩形' })
    expect(custom.generate).not.toHaveBeenCalled()
  })

  it('生成失败时命令失败并带出 jsx 的 msg', async () => {
    custom.generate.mockResolvedValue({ err: 1, msg: '生成失败' })

    const result = await execute('custom.generate', { request })

    expect(result).toMatchObject({ ok: false, reason: '生成失败' })
  })

  it('合并矩形失败不阻断生成（合并只是链路的一步）', async () => {
    custom.mergeRectangles.mockResolvedValue({ err: 1, msg: '没有可合并的矩形' })

    const result = await execute('custom.generate', { request })

    expect(result).toEqual({ ok: true })
    expect(custom.generate).toHaveBeenCalled()
  })
})

describe('custom.mergeRectangles', () => {
  it('按 checkMergeRectangles → mergeRectangles 的顺序调用', async () => {
    const order: string[] = []
    custom.checkMergeRectangles.mockImplementation(async () => {
      order.push('check')
      return { err: 0 }
    })
    custom.mergeRectangles.mockImplementation(async () => {
      order.push('merge')
      return { err: 0 }
    })

    await expect(execute('custom.mergeRectangles', { request })).resolves.toEqual({ ok: true })
    expect(order).toEqual(['check', 'merge'])
  })

  it('空选区直接失败，不调 jsx', async () => {
    selection.hasSelection = false

    const result = await execute('custom.mergeRectangles', { request })

    expect(result).toMatchObject({ ok: false, reason: NO_SELECTION_TEXT })
    expect(custom.checkMergeRectangles).not.toHaveBeenCalled()
  })

  it('检查失败时不执行合并', async () => {
    custom.checkMergeRectangles.mockResolvedValue({ err: 1, msg: '检查未通过' })

    const result = await execute('custom.mergeRectangles', { request })

    expect(result).toMatchObject({ ok: false })
    expect(custom.mergeRectangles).not.toHaveBeenCalled()
  })
})
