import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { useActionStore } = await import('@/stores/action')
const { actionIndexRepo, actionLibraryRepo } = await import('@/cep/data/actions')

/** 每个用例重置成可控的初值（浏览器分支是内存仓库） */
async function seedIndex() {
  await actionIndexRepo.write({
    index: 0,
    list: [{ name: '默认仓库', fileName: 'sj_dz_default.json' }],
  })
}

async function seedLibrary() {
  await actionLibraryRepo.write([
    {
      groupName: '修图',
      show: true,
      list: [
        { group: '修图', name: '磨皮' },
        { group: '修图', name: '锐化', alias: '清晰' },
      ],
    },
    { groupName: '新建', show: true, list: [] },
  ])
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  jsx.action.callAction.mockResolvedValue(null)
  await seedIndex()
  await seedLibrary()
})

describe('action.call', () => {
  it('传整个 item（group + name + alias）给 jsx', async () => {
    await execute('action.call', { group: '修图', name: '锐化', alias: '清晰' })

    expect(jsx.action.callAction).toHaveBeenCalledWith({
      group: '修图',
      name: '锐化',
      alias: '清晰',
    })
  })

  it('jsx 抛错时归一成 failed', async () => {
    jsx.action.callAction.mockRejectedValue(new Error('动作不存在'))

    await expect(execute('action.call', { group: '修图', name: '磨皮' })).resolves.toMatchObject({
      ok: false,
      reason: '动作不存在',
    })
  })
})

describe('loadPsActions（store 读模型）', () => {
  it('原版 {name,children} 结构能解析出动作', async () => {
    jsx.action.getActionList.mockResolvedValue([
      { name: '修图', children: [{ name: '磨皮' }, { name: '锐化' }] },
    ])

    const store = useActionStore()
    await store.loadPsActions()

    expect(store.psGroups).toEqual([
      {
        groupName: '修图',
        show: true,
        list: [
          { group: '修图', name: '磨皮' },
          { group: '修图', name: '锐化' },
        ],
      },
    ])
    expect(store.psUnparsed).toBe(false)
    expect(store.psError).toBe('')
  })

  it('结构不认识时标 unparsed，不谎报"没有动作"', async () => {
    jsx.action.getActionList.mockResolvedValue({ weird: true })

    const store = useActionStore()
    await store.loadPsActions()

    expect(store.psUnparsed).toBe(true)
    expect(store.psGroups).toHaveLength(0)
  })

  it('确实为空时不标 unparsed', async () => {
    jsx.action.getActionList.mockResolvedValue([])

    const store = useActionStore()
    await store.loadPsActions()

    expect(store.psUnparsed).toBe(false)
  })

  it('读失败进 psError，loading 一定复位', async () => {
    jsx.action.getActionList.mockRejectedValue(new Error('动作面板不可用'))

    const store = useActionStore()
    await store.loadPsActions()

    expect(store.psError).toBe('动作面板不可用')
    expect(store.psLoading).toBe(false)
  })
})

describe('分组 CRUD', () => {
  it('折叠状态写回 show 字段（切页仍保持）', async () => {
    await execute('action.toggleGroup', { index: 0 })
    expect((await actionLibraryRepo.read()).value[0].show).toBe(false)

    await execute('action.toggleGroup', { index: 0 })
    expect((await actionLibraryRepo.read()).value[0].show).toBe(true)
  })

  it('新建分组追加到末尾', async () => {
    await execute('action.addGroup', { name: '后期' })

    const { value } = await actionLibraryRepo.read()
    expect(value.map((group) => group.groupName)).toEqual(['修图', '新建', '后期'])
  })

  it('同名分组允许（原版 addGroup 不查重）', async () => {
    await execute('action.addGroup', { name: '修图' })

    const { value } = await actionLibraryRepo.read()
    expect(value.map((group) => group.groupName)).toEqual(['修图', '新建', '修图'])
  })

  it('afterIndex 有效时插到该分组之后', async () => {
    await execute('action.addGroup', { name: '后期', afterIndex: 0 })

    const { value } = await actionLibraryRepo.read()
    expect(value.map((group) => group.groupName)).toEqual(['修图', '后期', '新建'])
  })

  it('空分组名被拒绝', async () => {
    await expect(execute('action.addGroup', { name: '   ' })).resolves.toMatchObject({ ok: false })
  })

  it('重命名分组', async () => {
    await execute('action.renameGroup', { index: 1, name: '文档' })

    const { value } = await actionLibraryRepo.read()
    expect(value[1].groupName).toBe('文档')
  })

  it('删除分组；删最后一个时补“默认分组”', async () => {
    await execute('action.deleteGroup', { index: 1 })
    expect((await actionLibraryRepo.read()).value).toHaveLength(1)

    await execute('action.deleteGroup', { index: 0 })
    const { value } = await actionLibraryRepo.read()
    expect(value).toEqual([{ groupName: '默认分组', show: true, list: [] }])
  })
})

describe('仓库与排序', () => {
  it('新建仓库只加索引，不切换当前仓库', async () => {
    await execute('action.addWarehouse', { name: '电商' })

    const { value } = await actionIndexRepo.read()
    expect(value.list.map((item) => item.name)).toEqual(['默认仓库', '电商'])
    expect(value.index).toBe(0)
  })

  it('重命名仓库只改 name，不改 fileName', async () => {
    const before = (await actionIndexRepo.read()).value.list[0].fileName
    await execute('action.renameWarehouse', { index: 0, name: '主仓库' })

    const after = (await actionIndexRepo.read()).value.list[0]
    expect(after.name).toBe('主仓库')
    expect(after.fileName).toBe(before)
  })

  it('切换仓库改 index', async () => {
    await execute('action.addWarehouse', { name: '电商' })
    await execute('action.selectWarehouse', { index: 1 })

    expect((await actionIndexRepo.read()).value.index).toBe(1)
  })

  it('删除仓库至少保留一个', async () => {
    await execute('action.addWarehouse', { name: '电商' })
    await execute('action.deleteWarehouse', { index: 0 })

    const { value } = await actionIndexRepo.read()
    expect(value.list).toHaveLength(1)
    expect(value.list[0].name).toBe('电商')
    expect(value.index).toBe(0)
  })

  it('分组排序', async () => {
    await execute('action.reorderGroup', { from: 0, to: 1 })

    const { value } = await actionLibraryRepo.read()
    expect(value.map((group) => group.groupName)).toEqual(['新建', '修图'])
  })

  it('动作组内排序 before / after', async () => {
    await execute('action.reorderItem', {
      fromGroup: 0,
      fromIndex: 0,
      toGroup: 0,
      toIndex: 1,
      position: 'after',
    })

    let { value } = await actionLibraryRepo.read()
    expect(value[0].list.map((item) => item.name)).toEqual(['锐化', '磨皮'])

    await execute('action.reorderItem', {
      fromGroup: 0,
      fromIndex: 1,
      toGroup: 0,
      toIndex: 0,
      position: 'before',
    })

    value = (await actionLibraryRepo.read()).value
    expect(value[0].list.map((item) => item.name)).toEqual(['磨皮', '锐化'])
  })
})

describe('动作项', () => {
  it('删除动作', async () => {
    await execute('action.deleteItem', { groupIndex: 0, itemIndex: 0 })

    const { value } = await actionLibraryRepo.read()
    expect(value[0].list.map((item) => item.name)).toEqual(['锐化'])
  })

  it('设置别名时保留 group 和 name（执行仍需要）', async () => {
    await execute('action.setAlias', { groupIndex: 0, itemIndex: 0, alias: '一键美颜' })

    const { value } = await actionLibraryRepo.read()
    expect(value[0].list[0]).toEqual({ group: '修图', name: '磨皮', alias: '一键美颜' })
  })

  it('删除别名后回到 group + name', async () => {
    await execute('action.deleteAlias', { groupIndex: 0, itemIndex: 1 })

    const { value } = await actionLibraryRepo.read()
    expect(value[0].list[1]).toEqual({ group: '修图', name: '锐化' })
  })

  it('从 PS 添加时不去重（原版 addList 直接 push）', async () => {
    await execute('action.addFromPs', {
      groupIndex: 1,
      items: [
        { group: '新建', name: '800' },
        { group: '新建', name: '800' },
        { group: '新建', name: '1200' },
      ],
    })

    const { value } = await actionLibraryRepo.read()
    expect(value[1].list.map((item) => item.name)).toEqual(['800', '800', '1200'])
  })

  it('添加空列表被拒绝', async () => {
    await expect(execute('action.addFromPs', { groupIndex: 0, items: [] })).resolves.toMatchObject({
      ok: false,
      reason: '没有选中任何动作',
    })
  })
})
