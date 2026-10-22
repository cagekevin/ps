import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * 样式域命令（第 2 段）。
 *
 * 重点覆盖三件事：
 * 1. 原版 `useColor` 是**修饰键路由**（`ft.f/g/e` = ctrl/meta、shift、alt，`app.v4.js:70622-70638`），
 *    不是能力降级链——四步都要走到，顺序错就是功能错；
 * 2. `alt` 分支（`cy_changeStyleColor`）拿到新项要回写库文件（`:50153-50159`）；
 * 3. 三条"添加"命令把 jsx 结果写进正确的库文件。
 */
const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
  rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
  style: {
    useShapeFill: vi.fn(),
    setBorderColor: vi.fn(),
    changeStyleColor: vi.fn(),
    useStyleColor: vi.fn(),
    useGradient: vi.fn(),
    useStyle: vi.fn(),
    getForegroundColor: vi.fn(),
    getGradientInfo: vi.fn(),
    addStyle: vi.fn(),
  },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

/** 样式库的磁盘读写：测试里换内存实现，命令与 jsx 都走真的 */
const store = vi.hoisted(() => {
  const files = new Map<string, string>()
  return { files }
})

/**
 * `userDir()` 必须真的以 `USER_DIR`（`/SheJiZhuLi`）结尾——发送到色板要把它剥掉还原成
 * `%APPDATA%` 根（原版 `path.seBan` = `getUserDataPath() + "/FengZiSeBan/userColor.ini"`）。
 */
vi.mock('@/cep/fs', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
  readTextSmart: async (path: string) => store.files.get(path) ?? null,
  writeTextFileAtomic: (path: string, text: string) => {
    store.files.set(path, text)
    return true
  },
  // 备份走普通写（和 fileRepo 一致）
  writeTextFile: (path: string, text: string) => {
    store.files.set(path, text)
  },
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { styleIndexRepo } = await import('@/cep/data/style-library-repo')

const USER = 'ROAM/SheJiZhuLi'
const COLOR_LIB = `${USER}/sj_kuColA.ini`
const GRADIENT_LIB = `${USER}/sj_kuGraA.ini`
const STYLE_LIB = `${USER}/sj_kuStyA.ini`
const SWATCH_FILE = 'ROAM/FengZiSeBan/userColor.ini'

function seed(
  path: string,
  groups: Array<{ name: string; show: boolean; id?: string; list: unknown[] }>,
) {
  store.files.set(path, JSON.stringify(groups))
}

async function read(path: string): Promise<unknown> {
  return JSON.parse(store.files.get(path) ?? 'null')
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  store.files.clear()

  await styleIndexRepo.write({
    index: 0,
    list: [
      {
        name: '默认仓库',
        color: 'sj_kuColA.ini',
        gradient: 'sj_kuGraA.ini',
        font: 'sj_kuFonA.json',
        style: 'sj_kuStyA.ini',
      },
    ],
  })

  seed(COLOR_LIB, [
    {
      name: '灰白',
      show: true,
      list: [{ name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } }],
    },
  ])
  seed(GRADIENT_LIB, [
    { name: '渐变默认分组', show: true, list: [{ name: '未命名', gradient: { angle: 90 } }] },
  ])
  seed(STYLE_LIB, [{ name: '样式默认分组', show: true, id: 'YS5B2C4C06B1029543', list: [] }])

  jsx.style.useShapeFill.mockResolvedValue(null)
  jsx.style.setBorderColor.mockResolvedValue(null)
  jsx.style.changeStyleColor.mockResolvedValue(null)
  jsx.style.useStyleColor.mockResolvedValue(null)
  jsx.style.useGradient.mockResolvedValue(null)
  jsx.style.useStyle.mockResolvedValue(null)
})

describe('style.applyColor：修饰键路由（app.v4.js:50128-50163）', () => {
  it('ctrl → ys_useShapeFill，发磁盘上的原始项', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'ctrl' })

    expect(jsx.style.useShapeFill).toHaveBeenCalledWith({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
    expect(jsx.style.setBorderColor).not.toHaveBeenCalled()
    expect(jsx.style.useStyleColor).not.toHaveBeenCalled()
  })

  it('shift → ys_setBorderColor', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'shift' })

    expect(jsx.style.setBorderColor).toHaveBeenCalled()
    expect(jsx.style.useShapeFill).not.toHaveBeenCalled()
  })

  it('无修饰键 → ys_useStyleColor', async () => {
    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'none' })

    expect(jsx.style.useStyleColor).toHaveBeenCalled()
  })

  it('alt → cy_changeStyleColor，返回新项时回写库文件（:50153-50159）', async () => {
    jsx.style.changeStyleColor.mockResolvedValue({
      name: '未命名',
      color: { hex: '000000', c: 0, m: 0, y: 0, k: 100 },
    })

    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'alt' })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[0]).toEqual({
      name: '未命名',
      color: { hex: '000000', c: 0, m: 0, y: 0, k: 100 },
    })
  })

  it('alt 返回 -1 = 取消：不动库文件', async () => {
    jsx.style.changeStyleColor.mockResolvedValue(-1)

    await execute('style.applyColor', { groupIndex: 0, itemIndex: 0, modifier: 'alt' })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[0]).toEqual({
      name: '未命名',
      color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 },
    })
  })
})

describe('style.applyGradient / style.applyStyle', () => {
  it('渐变发 item.gradient，不是整个项（:50791）', async () => {
    await execute('style.applyGradient', { groupIndex: 0, itemIndex: 0 })

    expect(jsx.style.useGradient).toHaveBeenCalledWith({ angle: 90 })
  })

  it('图层样式发原始项 + groupId（:51509-51511）', async () => {
    seed(STYLE_LIB, [
      {
        name: '样式默认分组',
        show: true,
        id: 'YS5B2C4C06B1029543',
        list: [{ name: '描边', id: 'X1', layerId: 3 }],
      },
    ])

    await execute('style.applyStyle', { groupIndex: 0, itemIndex: 0 })

    expect(jsx.style.useStyle).toHaveBeenCalledWith(
      { name: '描边', id: 'X1', layerId: 3 },
      'YS5B2C4C06B1029543',
    )
  })
})

describe('三条"添加"命令', () => {
  it('颜色：ys_getForegroundColor 的返回值原样入库（:50193-50202）', async () => {
    jsx.style.getForegroundColor.mockResolvedValue({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })

    await execute('style.addColor', { groupIndex: 0 })

    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(2)
    expect(groups[0].list[1]).toEqual({
      name: '未命名',
      color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 },
    })
  })

  it('颜色：null = 失败，不入库（:50196）', async () => {
    jsx.style.getForegroundColor.mockResolvedValue(null)

    await expect(execute('style.addColor', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })
    const groups = (await read(COLOR_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(1)
  })

  it('渐变：包成 {name:"未命名", gradient:data} 入库（:50767-50771）', async () => {
    jsx.style.getGradientInfo.mockResolvedValue({ err: 0, data: { angle: 90 } })

    await execute('style.addGradient', { groupIndex: 0 })

    const groups = (await read(GRADIENT_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[1]).toEqual({ name: '未命名', gradient: { angle: 90 } })
  })

  it('渐变：false / err=1 / 无 data 都不入库', async () => {
    jsx.style.getGradientInfo.mockResolvedValue(false)
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    jsx.style.getGradientInfo.mockResolvedValue({ err: 1, msg: '没有渐变' })
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    jsx.style.getGradientInfo.mockResolvedValue({ err: 0, data: null })
    await expect(execute('style.addGradient', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })

    const groups = (await read(GRADIENT_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(1)
  })

  it('样式：ys_AddStyle 的 data 入库，payload 带 groupId + envDir（:51532-51547）', async () => {
    jsx.style.addStyle.mockResolvedValue({ err: 0, data: { name: '描边', id: 'X9', layerId: 7 } })

    await execute('style.addStyle', { groupIndex: 0 })

    expect(jsx.style.addStyle).toHaveBeenCalledWith({
      delArr: [],
      groupId: 'YS5B2C4C06B1029543',
      envDir: '/SheJiZhuLi',
    })
    const groups = (await read(STYLE_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list[0]).toEqual({ name: '描边', id: 'X9', layerId: 7 })
  })

  it('样式：err=1 时报错且不入库', async () => {
    jsx.style.addStyle.mockResolvedValue({ err: 1, msg: '没有可保存的样式' })

    await expect(execute('style.addStyle', { groupIndex: 0 })).resolves.toMatchObject({
      ok: false,
    })
    const groups = (await read(STYLE_LIB)) as Array<{ list: unknown[] }>
    expect(groups[0].list).toHaveLength(0)
  })
})

// ---------- 第 3 段：分组 / 项的增删改 + 写库 ----------

type RawGroup = { name?: string; show?: boolean; id?: string; list?: unknown[] }

async function groups(path: string): Promise<RawGroup[]> {
  return (await read(path)) as RawGroup[]
}

describe('style.addGroup（原版 addGroup，app.v4.js:52437-52449）', () => {
  it('追加到末尾：{name, show, list:[]}（createGroupObject :52513-52521）', async () => {
    await expect(execute('style.addGroup', { kind: 'color', name: '  新组  ' })).resolves.toEqual({
      ok: true,
    })

    const g = await groups(COLOR_LIB)
    expect(g).toHaveLength(2)
    expect(g[1]).toEqual({ name: '新组', show: true, list: [] })
  })

  it('样式库的组带 id：YS + 16 位大写 hex（:53270-53278）', async () => {
    await execute('style.addGroup', { kind: 'style', name: '描边组' })

    const g = await groups(STYLE_LIB)
    expect(g[1].name).toBe('描边组')
    expect(g[1].id).toMatch(/^YS[0-9A-F]{16}$/)
  })

  it('afterIndex 有效时插到它后面（:52443-52447）', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.addGroup', { kind: 'color', name: 'C', afterIndex: 0 })

    expect((await groups(COLOR_LIB)).map((g) => g.name)).toEqual(['A', 'C', 'B'])
  })

  it('空名报错且不动文件', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(execute('style.addGroup', { kind: 'color', name: '   ' })).resolves.toMatchObject({
      ok: false,
    })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })

  it('库文件损坏（不是 JSON）→ 报错，不覆盖原文件', async () => {
    store.files.set(COLOR_LIB, '{坏掉的')

    const result = await execute('style.addGroup', { kind: 'color', name: 'X' })

    expect(result.ok).toBe(false)
    expect(store.files.get(COLOR_LIB)).toBe('{坏掉的')
  })
})

describe('style.renameGroup（原版 renameGroup :52456-52459）', () => {
  it('只改 name，id 与 list 原样保留', async () => {
    seed(STYLE_LIB, [
      { name: '旧名', show: true, id: 'YSAAAAAAAAAAAAAAAA', list: [{ name: 'x', id: 'i' }] },
    ])

    await expect(
      execute('style.renameGroup', { kind: 'style', groupIndex: 0, name: '新名' }),
    ).resolves.toEqual({ ok: true })

    expect(await groups(STYLE_LIB)).toEqual([
      { name: '新名', show: true, id: 'YSAAAAAAAAAAAAAAAA', list: [{ name: 'x', id: 'i' }] },
    ])
  })

  it('分组不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.renameGroup', { kind: 'color', groupIndex: 5, name: 'X' }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.deleteGroup（原版 deleteGroup :52451-52454）', () => {
  it('删掉指定组', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.deleteGroup', { kind: 'color', groupIndex: 0 })

    expect((await groups(COLOR_LIB)).map((g) => g.name)).toEqual(['B'])
  })

  it('删空后补「颜色默认分组」（this.text + "默认分组"）', async () => {
    await execute('style.deleteGroup', { kind: 'color', groupIndex: 0 })

    expect(await groups(COLOR_LIB)).toEqual([{ name: '颜色默认分组', show: true, list: [] }])
  })

  it('索引里没有当前仓库 → 报错（不静默写到别处）', async () => {
    await styleIndexRepo.write({ index: 0, list: [] })

    await expect(
      execute('style.deleteGroup', { kind: 'color', groupIndex: 0 }),
    ).resolves.toMatchObject({ ok: false })
  })
})

describe('style.toggleGroupShow（原版 changeGroupShowStatus :52415-52435）', () => {
  it('不传 only → 取反', async () => {
    seed(COLOR_LIB, [{ name: 'A', show: true, list: [] }])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 0 })

    expect((await groups(COLOR_LIB))[0].show).toBe(false)
  })

  it('only=true → 只显示这一组', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: true, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 1, only: true })

    expect((await groups(COLOR_LIB)).map((g) => g.show)).toEqual([false, true])
  })

  it('only=true 且本来只显示这一组 → 关掉它（showOnlyGroup 的边界，:52431）', async () => {
    seed(COLOR_LIB, [
      { name: 'A', show: false, list: [] },
      { name: 'B', show: true, list: [] },
    ])

    await execute('style.toggleGroupShow', { kind: 'color', groupIndex: 1, only: true })

    expect((await groups(COLOR_LIB)).map((g) => g.show)).toEqual([false, false])
  })

  it('分组不存在 → 报错', async () => {
    await expect(
      execute('style.toggleGroupShow', { kind: 'color', groupIndex: 3 }),
    ).resolves.toMatchObject({ ok: false })
  })
})

describe('style.addItem（原版 addItem :52482-52489）', () => {
  it('原样 push 进 list，不补键', async () => {
    await expect(
      execute('style.addItem', {
        kind: 'color',
        groupIndex: 0,
        item: { name: '红', color: { hex: 'FF0000' } },
      }),
    ).resolves.toEqual({ ok: true })

    const g = await groups(COLOR_LIB)
    expect(g[0].list).toHaveLength(2)
    expect(g[0].list?.[1]).toEqual({ name: '红', color: { hex: 'FF0000' } })
  })

  it('分组不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.addItem', { kind: 'color', groupIndex: 9, item: { name: '红' } }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.renameItem（原版 renameItem :52496-52499）', () => {
  it('只改 name，其余键原样带走', async () => {
    seed(COLOR_LIB, [
      { name: '灰白', show: true, list: [{ name: '未命名', color: { hex: '302F34' } }] },
    ])

    await execute('style.renameItem', {
      kind: 'color',
      groupIndex: 0,
      itemIndex: 0,
      name: ' 主色 ',
    })

    expect((await groups(COLOR_LIB))[0].list?.[0]).toEqual({
      name: '主色',
      color: { hex: '302F34' },
    })
  })

  it('空名 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.renameItem', { kind: 'color', groupIndex: 0, itemIndex: 0, name: ' ' }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.deleteItem（原版 deleteItem :52477-52480）', () => {
  it('删掉指定项', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])

    await execute('style.deleteItem', { kind: 'color', groupIndex: 0, itemIndex: 0 })

    expect((await groups(COLOR_LIB))[0].list).toEqual([{ name: 'b', color: { hex: '222222' } }])
  })

  it('项不存在 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.deleteItem', { kind: 'color', groupIndex: 0, itemIndex: 9 }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.reorderItem（原版只有拖拽 :50040-50070，这里挪一格）', () => {
  it('上移一格', async () => {
    seed(COLOR_LIB, [
      {
        name: '灰白',
        show: true,
        list: [
          { name: 'a', color: { hex: '111111' } },
          { name: 'b', color: { hex: '222222' } },
        ],
      },
    ])

    await execute('style.reorderItem', {
      kind: 'color',
      groupIndex: 0,
      itemIndex: 1,
      direction: 'up',
    })

    const list = (await groups(COLOR_LIB))[0].list as Array<{ name: string }>
    expect(list.map((item) => item.name)).toEqual(['b', 'a'])
  })

  it('已在第一项还上移 → 报错，文件不变', async () => {
    const before = store.files.get(COLOR_LIB)

    await expect(
      execute('style.reorderItem', {
        kind: 'color',
        groupIndex: 0,
        itemIndex: 0,
        direction: 'up',
      }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('style.sendToSwatch（原版 :50349-50355）', () => {
  it('把 [item] 写成色板文件全文（整份替换，不是追加），旧内容进 .bak', async () => {
    const previous = JSON.stringify([{ name: '旧色', color: { hex: '000000' } }])
    store.files.set(SWATCH_FILE, previous)

    await expect(
      execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 0 }),
    ).resolves.toEqual({ ok: true })

    expect(JSON.parse(store.files.get(SWATCH_FILE) ?? 'null')).toEqual([
      { name: '未命名', color: { hex: '302F34', c: 81, m: 77, y: 69, k: 46 } },
    ])
    expect(store.files.get(`${SWATCH_FILE}.bak`)).toBe(previous)
  })

  it('项不存在 → 报错，色板文件不动', async () => {
    const previous = JSON.stringify([{ name: '旧色', color: { hex: '000000' } }])
    store.files.set(SWATCH_FILE, previous)

    await expect(
      execute('style.sendToSwatch', { kind: 'color', groupIndex: 0, itemIndex: 7 }),
    ).resolves.toMatchObject({ ok: false })
    expect(store.files.get(SWATCH_FILE)).toBe(previous)
  })
})
