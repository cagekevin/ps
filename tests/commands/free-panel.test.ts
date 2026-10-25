import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readValue } from '../support/repo-read'

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: false, typeNumber: 0 }),
  current: () => ({ hasSelection: false, typeNumber: 0 }),
  selectionRef: { value: { hasSelection: false, typeNumber: 0 } },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { freePanelWriter } = await import('@/cep/data/free-panel')
const { createEmptyFreePanel, findBlock, normalizeFreePanel } = await import('@/domain/free-panel')

beforeEach(async () => {
  setActivePinia(createPinia())
  await freePanelWriter.write(createEmptyFreePanel())
})

async function addTwo() {
  await execute('freePanel.add', {
    blockId: 1,
    items: [
      { text: '磨皮', key: 'action.call', option: { group: '修图', name: '磨皮' } },
      { text: '锐化', key: 'action.call', option: { group: '修图', name: '锐化' } },
    ],
  })
}

describe('自由面板命令', () => {
  it('add 写入选中 block.data，并生成唯一 btnId', async () => {
    await addTwo()

    const file = readValue(await freePanelWriter.read())
    const block = findBlock(file.obj.list, 1)
    expect(block?.data).toHaveLength(2)
    expect(block?.data[0]).toMatchObject({
      text: '磨皮',
      key: 'action.call',
      option: { group: '修图', name: '磨皮' },
    })
    expect(block?.data[0].btnId).not.toBe(block?.data[1].btnId)
  })

  it('区域不存在时拒绝', async () => {
    const result = await execute('freePanel.add', {
      blockId: 999,
      items: [{ text: 'A', key: 'action.call' }],
    })
    expect(result).toMatchObject({ ok: false })
  })

  it('空名字 / 空 key 被拒绝', async () => {
    await expect(
      execute('freePanel.add', { blockId: 1, items: [{ text: ' ', key: 'x' }] }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      execute('freePanel.add', { blockId: 1, items: [{ text: 'x', key: ' ' }] }),
    ).resolves.toMatchObject({ ok: false })
  })

  it('remove 按 blockId + btnId 删除', async () => {
    await addTwo()
    const file = readValue(await freePanelWriter.read())
    const first = findBlock(file.obj.list, 1)?.data[0]
    if (!first) throw new Error('fixture missing')

    await execute('freePanel.remove', { blockId: 1, btnId: first.btnId })

    const next = readValue(await freePanelWriter.read())
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['锐化'])
  })

  it('setDisplay 更新列数 / 图标 / 文字', async () => {
    await execute('freePanel.setDisplay', { showNumber: 4, showIcon: true, showText: false })

    const file = readValue(await freePanelWriter.read())
    const block = findBlock(file.obj.list, 1)
    expect(block?.showNumber).toBe(4)
    expect(block?.showIcon).toBe(true)
    expect(block?.showText).toBe(false)
  })

  /**
   * D-32 口径 = **全局**（有意简化，注释见 `commands/freePanel.ts` 的 `freePanel.setDisplay`）。
   *
   * 原版按 block 存，所以磁盘上完全可能出现"两个区域列数不同"。这里钉两条：
   * ① 读路径不动数据（不静默抹平）；
   * ② 只有用户显式点列数时才统一写所有区域（全局设置生效），写完全部一致。
   */
  it('两个区域列数不同时：读不抹平，显式设置为全局值后一致', async () => {
    await execute('freePanel.addBlock', { type: 'norow' })

    // 造出原版式数据：区域 1 三列、区域 2 两列
    await freePanelWriter.update((file) => {
      const next = normalizeFreePanel(file)
      next.obj.list[0].showNumber = 3
      next.obj.list[1].showNumber = 2
      return next
    })

    const mixed = readValue(await freePanelWriter.read())
    expect(mixed.obj.list.map((block) => block.showNumber)).toEqual([3, 2])

    // 显式点"四列" = 全局设置生效
    await execute('freePanel.setDisplay', { showNumber: 4 })

    const after = readValue(await freePanelWriter.read())
    expect(after.obj.list.map((block) => block.showNumber)).toEqual([4, 4])
  })

  it('setDisplay 也写嵌套子区域的显示字段（与页面勾选态扫描的范围一致）', async () => {
    await execute('freePanel.addBlock', { parentId: 1, type: 'row' })
    await execute('freePanel.setDisplay', { showIcon: true })

    const file = readValue(await freePanelWriter.read())
    expect(file.obj.list[0].showIcon).toBe(true)
    expect(file.obj.list[0].children[0]?.showIcon).toBe(true)
  })

  it('addBlock 新增根区域 / 子区域，removeBlock 删除', async () => {
    await execute('freePanel.addBlock', { type: 'norow' })
    let file = readValue(await freePanelWriter.read())
    expect(file.obj.list).toHaveLength(2)
    expect(file.obj.list[1].id).toBe(file.uid)

    await execute('freePanel.addBlock', { parentId: 1, type: 'row' })
    file = readValue(await freePanelWriter.read())
    expect(findBlock(file.obj.list, 1)?.children).toHaveLength(1)

    const childId = findBlock(file.obj.list, 1)?.children[0].id
    if (!childId) throw new Error('child missing')
    await execute('freePanel.removeBlock', { blockId: childId })
    file = readValue(await freePanelWriter.read())
    expect(findBlock(file.obj.list, 1)?.children).toHaveLength(0)
  })

  it('setBlock 修改区域方向和宽高', async () => {
    await execute('freePanel.setBlock', {
      blockId: 1,
      type: 'row',
      width: '50%',
      height: '200px',
    })

    const block = findBlock(readValue(await freePanelWriter.read()).obj.list, 1)
    expect(block?.type).toBe('row')
    expect(block?.width).toBe('50%')
    expect(block?.height).toBe('200px')
  })

  it('clear 重置工作区', async () => {
    await addTwo()
    await execute('freePanel.clear', {})

    const file = readValue(await freePanelWriter.read())
    expect(file.obj.list).toHaveLength(1)
    expect(file.obj.list[0].data).toEqual([])
  })

  it('跨 block 拖拽：从源 block 删除，插入目标 block', async () => {
    const file = createEmptyFreePanel()
    file.obj.list.push({ ...file.obj.list[0], id: 2, data: [] })
    await freePanelWriter.write(file)

    await execute('freePanel.add', {
      blockId: 1,
      items: [
        { text: 'A', key: 'x' },
        { text: 'B', key: 'y' },
      ],
    })
    await execute('freePanel.add', { blockId: 2, items: [{ text: 'X', key: 'z' }] })

    const before = readValue(await freePanelWriter.read())
    const a = findBlock(before.obj.list, 1)?.data[0]
    const x = findBlock(before.obj.list, 2)?.data[0]
    if (!a || !x) throw new Error('fixture missing')

    await execute('freePanel.reorder', {
      fromBlockId: 1,
      fromBtnId: a.btnId,
      toBlockId: 2,
      toBtnId: x.btnId,
      position: 'before',
    })

    const after = readValue(await freePanelWriter.read())
    expect(findBlock(after.obj.list, 1)?.data.map((item) => item.text)).toEqual(['B'])
    expect(findBlock(after.obj.list, 2)?.data.map((item) => item.text)).toEqual(['A', 'X'])
  })

  it('reorder 按 btnId before / after', async () => {
    await execute('freePanel.add', {
      blockId: 1,
      items: [
        { text: 'A', key: 'x' },
        { text: 'B', key: 'y' },
        { text: 'C', key: 'z' },
      ],
    })
    const file = readValue(await freePanelWriter.read())
    const [a, b, c] = findBlock(file.obj.list, 1)?.data ?? []
    if (!a || !b || !c) throw new Error('fixture missing')

    await execute('freePanel.reorder', {
      fromBlockId: 1,
      fromBtnId: c.btnId,
      toBlockId: 1,
      toBtnId: a.btnId,
      position: 'before',
    })
    let next = readValue(await freePanelWriter.read())
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['C', 'A', 'B'])

    await execute('freePanel.reorder', {
      fromBlockId: 1,
      fromBtnId: b.btnId,
      toBlockId: 1,
      toBtnId: c.btnId,
      position: 'after',
    })
    next = readValue(await freePanelWriter.read())
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['C', 'B', 'A'])
  })
})
