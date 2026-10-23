import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * T-87：常用页 store 投影 + 折叠态归属。
 *
 * 三条硬要求：
 * 1. store 是**只读投影**（不 import 任何 `Repo` 形状、不暴露写方法）；
 * 2. 折叠态落 `sj_v5_ui.json`，**写盘路径里不许出现 `sj_set.json`**（靶点⑱ 第一向）；
 * 3. 反向：`sj_set.json` 里就算有同名键，折叠态也不认它（靶点⑱ 第二向，防两个真相源）。
 */

const state = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/selection', () => ({
  refresh: async () => ({ hasSelection: false }),
  current: () => ({ hasSelection: false }),
  selectionRef: { value: { hasSelection: false } },
}))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => '/user',
  readTextSmart: async (path: string) => state.files.get(path) ?? null,
  readTextFile: (path: string) => state.files.get(path) ?? null,
  writeTextFile: (path: string, text: string) => {
    state.files.set(path, text)
  },
  writeTextFileAtomic: (path: string, text: string) => {
    state.files.set(path, text)
    return true
  },
  readBase64File: () => null,
  writeBase64File: () => true,
  removeFile: () => true,
  dirUsage: () => null,
  saveExportedText: () => {},
  b64ToUtf8: (value: string) => value,
  utf8ToB64: (value: string) => value,
}))

const COMMON_USE_FILE = '/user/sj_commonFunction.json'
const SET_FILE = '/user/sj_set.json'
const UI_FILE = '/user/sj_v5_ui.json'

const { setActivePinia, createPinia } = await import('pinia')
const { useCommonUseStore, provideCommonUseSource, bindCommonUseData } =
  await import('@/stores/common-use')
const { getCommonUseCollapsed, flushPrefs, __resetSettingsForTest } =
  await import('@/cep/data/settings')
await import('@/commands')
const { execute } = await import('@/commands/registry')
const { commonUseRepo } = await import('@/cep/data/common-use')

function writeCommonUseFile(info: unknown[]): void {
  state.files.set(COMMON_USE_FILE, JSON.stringify({ info }))
}

beforeEach(() => {
  setActivePinia(createPinia())
  state.files.clear()
  __resetSettingsForTest()
  // 端口只暴露 read / onChange：store 拿不到任何写入口
  provideCommonUseSource({
    read: () => commonUseRepo.read(),
    onChange: (listener) => commonUseRepo.onChange(listener),
  })
})

describe('只读投影', () => {
  it('load 把落盘文件派生成 tiles（含隐藏态与图标成对字段）', async () => {
    writeCommonUseFile([
      {
        id: 'a',
        name: '嵌入图片',
        title: '智能匹配图片到背景框',
        svg: '#iconqianrutupian',
        fillSvg: '#iconqianrutupianlan',
        isShow: true,
      },
      { id: 'b', name: '优化文档', svg: '#iconyouhuawendang', fillSvg: false, isShow: false },
    ])

    const store = useCommonUseStore()
    await store.load()

    expect(store.tiles.map((t) => t.id)).toEqual(['a', 'b'])
    expect(store.tiles[0].icon).toEqual({
      rest: '#iconqianrutupian',
      filled: '#iconqianrutupianlan',
    })
    expect(store.tiles[1].visible).toBe(false)
    expect(store.error).toBe('')
  })

  it('文件坏掉时给降级提示，页面仍能渲染空列表', async () => {
    state.files.set(COMMON_USE_FILE, '{ 坏 json')

    const store = useCommonUseStore()
    await store.load()

    expect(store.tiles).toEqual([])
    expect(store.degraded).not.toBe('')
  })
})

describe('装配绑定', () => {
  it('命令写完仓库后，投影跟着更新（订阅走注入端口，不经 store 自己）', async () => {
    writeCommonUseFile([
      { id: 'a', name: '嵌入图片', svg: '#icona', fillSvg: false, isShow: true },
      { id: 'b', name: '优化文档', svg: '#iconb', fillSvg: false, isShow: true },
    ])
    bindCommonUseData()
    const store = useCommonUseStore()
    await store.load()
    expect(store.tiles[1].visible).toBe(true)

    await commonUseRepo.setShow('b', false)

    expect(store.tiles[1].visible).toBe(false)
  })
})
describe('折叠态归属（靶点⑱）', () => {
  it('写折叠态只落 sj_v5_ui.json，路径里没有 sj_set.json', async () => {
    const first = await execute('commonUse.setCollapsed', { id: 'comembed', collapsed: true })
    expect(first).toMatchObject({ ok: true })
    flushPrefs()

    expect([...state.files.keys()]).toEqual([UI_FILE])
    expect(getCommonUseCollapsed()).toEqual({ comembed: true })
    expect(state.files.has(SET_FILE)).toBe(false)
  })

  it('反向：sj_set.json 里同名键不被当成折叠态（没有第二个真相源）', async () => {
    state.files.set(
      SET_FILE,
      JSON.stringify({ 'commonUse.collapsed': { comembed: true }, cyLinkObject: 1 }),
    )

    expect(getCommonUseCollapsed()).toEqual({})
  })

  it('setCollapsed 是合并写，不会把别的面板的折叠态抹掉', async () => {
    const first = await execute('commonUse.setCollapsed', { id: 'comembed', collapsed: true })
    expect(first).toMatchObject({ ok: true })
    flushPrefs()
    await execute('commonUse.setCollapsed', { id: 'comexport', collapsed: true })
    flushPrefs()
    await execute('commonUse.setCollapsed', { id: 'comembed', collapsed: false })
    flushPrefs()

    expect(getCommonUseCollapsed()).toEqual({ comembed: false, comexport: true })
  })
})
