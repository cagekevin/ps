import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: true, typeNumber: 1 }),
  current: () => ({ hasSelection: true, typeNumber: 1 }),
  selectionRef: { value: { hasSelection: true, typeNumber: 1 } },
}))

const commonUse = vi.hoisted(() => ({
  zoom: vi.fn(async () => ({ ok: true, data: null })),
  flip: vi.fn(async () => ({ ok: true, data: null })),
  embedImage: vi.fn(async () => ({ ok: true, data: null })),
  embedMultipleImages: vi.fn(async () => ({ ok: true, data: null })),
  importMultipleImages: vi.fn(async () => ({ ok: true, data: null })),
  getImagePath: vi.fn(async (): Promise<unknown> => -1),
  optimizeOnce: vi.fn(async () => ({ ok: true, data: null })),
  optimizeFolder: vi.fn(async () => ({ ok: true, data: null })),
  transform: vi.fn(async () => ({ ok: true, data: null })),
  referenceGuide: vi.fn(async () => ({ ok: true, data: null })),
  referenceSlice: vi.fn(async () => ({ ok: true, data: null })),
  distribute: vi.fn(async () => ({ ok: true, data: null })),
  getPsdList: vi.fn(async (): Promise<unknown> => []),
  exportPsdImage: vi.fn(async () => ({ ok: true, data: null })),
}))

const legacy = vi.hoisted(() => ({ call: vi.fn(async () => ({ ok: true, data: null })) }))

vi.mock('@/cep/jsx', () => ({ jsx: { commonUse, legacy } }))

await import('@/commands')
const { execute } = await import('@/commands/registry')

beforeEach(() => {
  for (const fn of Object.values(commonUse)) fn.mockClear()
  commonUse.getImagePath.mockResolvedValue({ ok: true, data: -1 })
  commonUse.getPsdList.mockResolvedValue({ ok: true, data: [] })
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
    commonUse.getImagePath.mockResolvedValueOnce({ ok: true, data: ['a.png', 'b.png'] })
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

  it('optimizeOnce 是单文档优化：走 cy_optimizeDoc', async () => {
    const result = await execute('commonUse.optimizeOnce', {
      options: { optimizeAll: true, deleteAllEmpty: false, deleteAllHide: true },
    })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.optimizeOnce).toHaveBeenCalledWith({
      optimizeAll: true,
      deleteAllEmpty: false,
      deleteAllHide: true,
    })
  })

  it('optimizeFolder：列表由 cy_getPsdForFolder 取，逐张调、全成才 ok', async () => {
    commonUse.getPsdList.mockResolvedValueOnce({ ok: true, data: ['a.psd', 'b.psd'] })

    const result = await execute('commonUse.optimizeFolder', { options: { optimizeAll: true } })

    expect(result).toMatchObject({ ok: true })
    expect(commonUse.optimizeFolder).toHaveBeenCalledTimes(2)
    expect(commonUse.optimizeFolder).toHaveBeenNthCalledWith(1, { optimizeAll: true }, 'a.psd')
    expect(commonUse.optimizeFolder).toHaveBeenNthCalledWith(2, { optimizeAll: true }, 'b.psd')
  })

  it('optimizeFolder 全败：一个 ok:true 都不给，文案带比例', async () => {
    commonUse.getPsdList.mockResolvedValueOnce({ ok: true, data: ['a.psd', 'b.psd'] })
    commonUse.optimizeFolder.mockRejectedValue(new Error('锁文件'))

    const result = await execute('commonUse.optimizeFolder', { options: {} })

    expect(result).toMatchObject({ ok: false })
    expect((result as { reason: string }).reason).toContain('成功 0/2')
    expect((result as { reason: string }).reason).toContain('失败 2 张')
    // 一个失败不中断：两张都试过
    expect(commonUse.optimizeFolder).toHaveBeenCalledTimes(2)
  })

  it('optimizeFolder 一半成功：抛错并写清成功 2/3、失败 1 张', async () => {
    commonUse.getPsdList.mockResolvedValueOnce({ ok: true, data: ['a.psd', 'b.psd', 'c.psd'] })
    commonUse.optimizeFolder
      .mockResolvedValueOnce({ ok: true, data: null })
      .mockRejectedValueOnce(new Error('文件损坏'))
      .mockResolvedValueOnce({ ok: true, data: null })

    const result = await execute('commonUse.optimizeFolder', { options: {} })

    expect(result).toMatchObject({ ok: false })
    const reason = (result as { reason: string }).reason
    expect(reason).toContain('成功 2/3')
    expect(reason).toContain('失败 1 张')
    expect(reason).toContain('b.psd')
  })

  it('optimizeFolder 列表为空时直接报「文件夹内没有PSD文件」', async () => {
    commonUse.getPsdList.mockResolvedValueOnce({ ok: true, data: [] })

    const result = await execute('commonUse.optimizeFolder', { options: {} })

    expect(result).toMatchObject({ ok: false })
    expect((result as { reason: string }).reason).toContain('文件夹内没有PSD文件')
    expect(commonUse.optimizeFolder).not.toHaveBeenCalled()
  })

  it('exportPsdFolder：>30 张未确认时抛，确认后逐张导出', async () => {
    const files = Array.from({ length: 31 }, (_, i) => `f${i}.psd`)
    commonUse.getPsdList.mockResolvedValue({ ok: true, data: files })

    const blocked = await execute('commonUse.exportPsdFolder', { options: { a: 1 } })
    expect(blocked).toMatchObject({ ok: false })
    expect((blocked as { reason: string }).reason).toContain('文件夹内超过30个psd')
    expect(commonUse.exportPsdImage).not.toHaveBeenCalled()

    const confirmed = await execute('commonUse.exportPsdFolder', {
      options: { a: 1 },
      confirmed: true,
    })
    expect(confirmed).toMatchObject({ ok: true })
    expect(commonUse.exportPsdImage).toHaveBeenCalledTimes(31)
    expect(commonUse.exportPsdImage).toHaveBeenNthCalledWith(1, 'f0.psd', { a: 1 })
  })

  it('exportPsdFolder 部分成功同样不许吞', async () => {
    commonUse.getPsdList.mockResolvedValueOnce({ ok: true, data: ['a.psd', 'b.psd'] })
    commonUse.exportPsdImage
      .mockResolvedValueOnce({ ok: true, data: null })
      .mockRejectedValueOnce(new Error('炸了'))

    const result = await execute('commonUse.exportPsdFolder', { options: {} })

    expect(result).toMatchObject({ ok: false })
    expect((result as { reason: string }).reason).toContain('成功 1/2')
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
