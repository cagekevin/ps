import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: true, typeNumber: 1 }),
  current: () => ({ hasSelection: true, typeNumber: 1 }),
  selectionRef: { value: { hasSelection: true, typeNumber: 1 } },
}))

const commonUse = vi.hoisted(() => ({
  zoom: vi.fn(async () => null),
  flip: vi.fn(async () => null),
  embedImage: vi.fn(async () => null),
  importMultipleImages: vi.fn(async () => null),
  optimizeDoc: vi.fn(async () => null),
  transform: vi.fn(async () => null),
  referenceLines: vi.fn(async () => null),
  distribute: vi.fn(async () => null),
  getPsdList: vi.fn(async () => []),
}))

const legacy = vi.hoisted(() => ({ call: vi.fn(async () => null) }))

vi.mock('@/cep/jsx', () => ({ jsx: { commonUse, legacy } }))

await import('@/commands')
const { execute } = await import('@/commands/registry')

beforeEach(() => {
  for (const fn of Object.values(commonUse)) fn.mockClear()
  legacy.call.mockClear()
})

describe('常用页命令', () => {
  it('zoom 把倍数原样传给 jsx', async () => {
    const result = await execute('commonUse.zoom', { scale: 150 })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.zoom).toHaveBeenCalledWith(150)
  })

  it('zoom 拒绝非正倍数', async () => {
    const result = await execute('commonUse.zoom', { scale: 0 })

    expect(result).toMatchObject({ ok: false })
    expect(commonUse.zoom).not.toHaveBeenCalled()
  })

  it('flip 只接受 6 个原版方向', async () => {
    await execute('commonUse.flip', { direction: '左右' })
    expect(commonUse.flip).toHaveBeenCalledWith('左右')

    commonUse.flip.mockClear()
    const bad = await execute('commonUse.flip', { direction: '斜' as never })
    expect(bad).toMatchObject({ ok: false })
    expect(commonUse.flip).not.toHaveBeenCalled()
  })

  it('embedImage 把开关集合原样传给 jsx', async () => {
    const options = { autoEmbedOnDrop: true, linkMode: 'sameFolder' as const }

    await execute('commonUse.embedImage', { options })

    expect(commonUse.embedImage).toHaveBeenCalledWith(options)
  })

  it('importMultipleImages 空路径被拒绝', async () => {
    const result = await execute('commonUse.importMultipleImages', { paths: [] })

    expect(result).toMatchObject({ ok: false })
    expect(commonUse.importMultipleImages).not.toHaveBeenCalled()
  })

  it('optimizeDoc 是长任务：上报进度并带上三个开关', async () => {
    const result = await execute('commonUse.optimizeDoc', {
      options: { optimizeAll: true, deleteAllEmpty: false, deleteAllHide: true },
      total: 3,
    })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.optimizeDoc).toHaveBeenCalledWith({
      optimizeAll: true,
      deleteAllEmpty: false,
      deleteAllHide: true,
    })
  })

  it('transform 参数数量必须是 7（原版参数顺序）', async () => {
    const short = await execute('commonUse.transform', {
      params: [1, 0, '0px', '0px', 0, 100, 0].slice(0, 6) as never,
    })
    expect(short).toMatchObject({ ok: false })
    expect(commonUse.transform).not.toHaveBeenCalled()

    const ok = await execute('commonUse.transform', { params: [1, 0, '0px', '0px', 0, 100, 0] })
    expect(ok).toMatchObject({ ok: true })
    expect(commonUse.transform).toHaveBeenCalledWith([1, 0, '0px', '0px', 0, 100, 0])
  })

  it('distribute 参数数量必须是 3', async () => {
    const bad = await execute('commonUse.distribute', { params: [0, 10] as never })
    expect(bad).toMatchObject({ ok: false })

    const ok = await execute('commonUse.distribute', { params: [0, 10, 1] })
    expect(ok).toMatchObject({ ok: true })
    expect(commonUse.distribute).toHaveBeenCalledWith([0, 10, 1])
  })

  it('referenceLines 透传动作与选项', async () => {
    await execute('commonUse.referenceLines', { action: 'clear', options: { width: '100' } })

    expect(commonUse.referenceLines).toHaveBeenCalledWith('clear', { width: '100' })
  })

  it('exportImages 三种模式分别走三条既有白名单 key', async () => {
    await execute('commonUse.exportImages', { mode: 'image', options: { a: 1 } })
    expect(legacy.call).toHaveBeenLastCalledWith('cy_ExportImage', [{ a: 1 }], '导出图片')

    await execute('commonUse.exportImages', { mode: 'first' })
    expect(legacy.call).toHaveBeenLastCalledWith('cy_BatchExportLayer', [], '导出图片')

    await execute('commonUse.exportImages', { mode: 'second' })
    expect(legacy.call).toHaveBeenLastCalledWith('cy_BatchExportSecondLayer', [], '导出图片')
  })

  it('openExportFolder 走 cy_openDirectory', async () => {
    await execute('commonUse.openExportFolder', undefined)

    expect(legacy.call).toHaveBeenCalledWith('cy_openDirectory', [], '打开所在目录')
  })

  it('jsx 报失败时命令不吞掉', async () => {
    commonUse.zoom.mockRejectedValueOnce(new Error('boom'))

    const result = await execute('commonUse.zoom', { scale: 200 })

    expect(result).toMatchObject({ ok: false })
  })
})
