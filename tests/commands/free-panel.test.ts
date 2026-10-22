import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: false, typeNumber: 0 }),
  current: () => ({ hasSelection: false, typeNumber: 0 }),
  selectionRef: { value: { hasSelection: false, typeNumber: 0 } },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { freePanelRepo } = await import('@/cep/data/free-panel')
const { createEmptyFreePanel, findBlock } = await import('@/domain/free-panel')

beforeEach(async () => {
  setActivePinia(createPinia())
  await freePanelRepo.write(createEmptyFreePanel())
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

    const file = (await freePanelRepo.read()).value
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
    const file = (await freePanelRepo.read()).value
    const first = findBlock(file.obj.list, 1)?.data[0]
    if (!first) throw new Error('fixture missing')

    await execute('freePanel.remove', { blockId: 1, btnId: first.btnId })

    const next = (await freePanelRepo.read()).value
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['锐化'])
  })

  it('setDisplay 更新列数 / 图标 / 文字', async () => {
    await execute('freePanel.setDisplay', { showNumber: 4, showIcon: true, showText: false })

    const file = (await freePanelRepo.read()).value
    const block = findBlock(file.obj.list, 1)
    expect(block?.showNumber).toBe(4)
    expect(block?.showIcon).toBe(true)
    expect(block?.showText).toBe(false)
  })

  it('addBlock 新增根区域 / 子区域，removeBlock 删除', async () => {
    await execute('freePanel.addBlock', { type: 'norow' })
    let file = (await freePanelRepo.read()).value
    expect(file.obj.list).toHaveLength(2)
    expect(file.obj.list[1].id).toBe(file.uid)

    await execute('freePanel.addBlock', { parentId: 1, type: 'row' })
    file = (await freePanelRepo.read()).value
    expect(findBlock(file.obj.list, 1)?.children).toHaveLength(1)

    const childId = findBlock(file.obj.list, 1)?.children[0].id
    if (!childId) throw new Error('child missing')
    await execute('freePanel.removeBlock', { blockId: childId })
    file = (await freePanelRepo.read()).value
    expect(findBlock(file.obj.list, 1)?.children).toHaveLength(0)
  })

  it('setBlock 修改区域方向和宽高', async () => {
    await execute('freePanel.setBlock', {
      blockId: 1,
      type: 'row',
      width: '50%',
      height: '200px',
    })

    const block = findBlock((await freePanelRepo.read()).value.obj.list, 1)
    expect(block?.type).toBe('row')
    expect(block?.width).toBe('50%')
    expect(block?.height).toBe('200px')
  })

  it('clear 重置工作区', async () => {
    await addTwo()
    await execute('freePanel.clear', {})

    const file = (await freePanelRepo.read()).value
    expect(file.obj.list).toHaveLength(1)
    expect(file.obj.list[0].data).toEqual([])
  })

  it('跨 block 拖拽：从源 block 删除，插入目标 block', async () => {
    const file = createEmptyFreePanel()
    file.obj.list.push({ ...file.obj.list[0], id: 2, data: [] })
    await freePanelRepo.write(file)

    await execute('freePanel.add', {
      blockId: 1,
      items: [
        { text: 'A', key: 'x' },
        { text: 'B', key: 'y' },
      ],
    })
    await execute('freePanel.add', { blockId: 2, items: [{ text: 'X', key: 'z' }] })

    const before = (await freePanelRepo.read()).value
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

    const after = (await freePanelRepo.read()).value
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
    const file = (await freePanelRepo.read()).value
    const [a, b, c] = findBlock(file.obj.list, 1)?.data ?? []
    if (!a || !b || !c) throw new Error('fixture missing')

    await execute('freePanel.reorder', {
      fromBlockId: 1,
      fromBtnId: c.btnId,
      toBlockId: 1,
      toBtnId: a.btnId,
      position: 'before',
    })
    let next = (await freePanelRepo.read()).value
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['C', 'A', 'B'])

    await execute('freePanel.reorder', {
      fromBlockId: 1,
      fromBtnId: b.btnId,
      toBlockId: 1,
      toBtnId: c.btnId,
      position: 'after',
    })
    next = (await freePanelRepo.read()).value
    expect(findBlock(next.obj.list, 1)?.data.map((item) => item.text)).toEqual(['C', 'B', 'A'])
  })
})
