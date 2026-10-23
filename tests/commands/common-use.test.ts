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
  embedMultipleImages: vi.fn(async () => null),
  importMultipleImages: vi.fn(async () => null),
  getImagePath: vi.fn(async () => -1 as unknown),
  optimizeOnce: vi.fn(async () => null),
  optimizeFolder: vi.fn(async () => null),
  transform: vi.fn(async () => null),
  referenceGuide: vi.fn(async () => null),
  referenceSlice: vi.fn(async () => null),
  distribute: vi.fn(async () => null),
  getPsdList: vi.fn(async () => []),
}))

const legacy = vi.hoisted(() => ({ call: vi.fn(async () => null) }))

vi.mock('@/cep/jsx', () => ({ jsx: { commonUse, legacy } }))

await import('@/commands')
const { execute } = await import('@/commands/registry')

beforeEach(() => {
  for (const fn of Object.values(commonUse)) fn.mockClear()
  commonUse.getImagePath.mockResolvedValue(-1)
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

  it('embedImage 把官方实参原样传给 jsx', async () => {
    const options = { path: 'C:/a.png', bLink2: -1, bDelete: false }

    await execute('commonUse.embedImage', { options })

    expect(commonUse.embedImage).toHaveBeenCalledWith(options)
  })

  it('embedMultipleImages 无参调用', async () => {
    await execute('commonUse.embedMultipleImages', undefined)

    expect(commonUse.embedMultipleImages).toHaveBeenCalledWith()
  })

  it('importMultipleImages 未给 path 时先取路径；返回 -1（取消）就不导入', async () => {
    const result = await execute('commonUse.importMultipleImages', { toLinkObject: true })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.getImagePath).toHaveBeenCalledTimes(1)
    expect(commonUse.importMultipleImages).not.toHaveBeenCalled()
  })

  it('importMultipleImages 把取到的 path 原样透传（数组与单张都行）', async () => {
    commonUse.getImagePath.mockResolvedValueOnce(['a.png', 'b.png'])
    await execute('commonUse.importMultipleImages', { toLinkObject: false })
    expect(commonUse.importMultipleImages).toHaveBeenCalledWith({
      path: ['a.png', 'b.png'],
      toLinkObject: false,
    })

    commonUse.importMultipleImages.mockClear()
    await execute('commonUse.importMultipleImages', {
      path: 'C:/x.png',
      toLinkObject: true,
    })
    expect(commonUse.getImagePath).toHaveBeenCalledTimes(1) // 只在上一条调过
    expect(commonUse.importMultipleImages).toHaveBeenCalledWith({
      path: 'C:/x.png',
      toLinkObject: true,
    })
  })

  it('optimizeDoc 是单文档优化：走 optimizeOnce 并上报进度', async () => {
    const result = await execute('commonUse.optimizeDoc', {
      options: { optimizeAll: true, deleteAllEmpty: false, deleteAllHide: true },
      total: 3,
    })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.optimizeOnce).toHaveBeenCalledWith({
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

  it('参考线拆成两条命令：cy_useGride / cy_clearCutGuide 各走各的 jsx', async () => {
    await execute('commonUse.referenceGuide', { options: { width: '100' } })
    expect(commonUse.referenceGuide).toHaveBeenCalledWith({ width: '100' })

    await execute('commonUse.referenceSlice', { options: undefined })
    expect(commonUse.referenceSlice).toHaveBeenCalledWith(undefined)
    expect(commonUse.referenceGuide).toHaveBeenCalledTimes(1)
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
