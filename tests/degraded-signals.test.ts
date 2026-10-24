import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * T-101-1：失败必须可见。
 *
 * 阶段 0（T-101-0）点名 8 处：4 处**静默用坏数据**、4 处**把"文件坏了"说成"不存在"**。
 * 本刀只补信号，不动 `RepoRead` 形状（联合类型是阶段 1）。
 *
 * 每个用例都喂一份真的坏文件（走 `fileRepo` 的 `hasCep` 分支），断言**用户能看到的那句话**：
 * 命令 reason（→ toast）/ store `degraded`（→ 页面提示条）/ `log.error`（→ 设置页「打开日志」）。
 * 每处还配一条"本来就没有"的对照，证明两种结论现在分得开。
 */

const files = vi.hoisted(() => ({ map: new Map<string, string>() }))

const jsx = vi.hoisted(() => ({
  font: { distributeByPitch: vi.fn(async () => 'ok') },
  action: { callAction: vi.fn(async () => null), getActionList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))
vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  extensionDir: () => '/ext',
  userDir: () => '/user',
  readTextSync: (path: string) => {
    const text = files.map.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  readTextSmart: async (path: string) => files.map.get(path) ?? null,
  readTextViaJsx: async (path: string) => files.map.get(path) ?? null,
  // T-105：写路径改用三态读；这个假 fs 没有"读不出"的场景，只会 ok / missing
  readTextOutcome: async (path: string) => {
    const text = files.map.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  writeTextFile: (path: string, text: string) => {
    files.map.set(path, text)
  },
  writeTextFileAtomic: (path: string, text: string) => {
    files.map.set(path, text)
    return true
  },
  // T-109：base64 读也走三态
  readBase64Outcome: () => ({ status: 'notSeen' as const }),
  writeBase64File: () => ({ status: 'ok' as const }),
  removeFile: () => ({ ok: true as const }),
  dirUsage: () => null,
  saveExportedText: () => {},
  psScriptsDir: async () => null,
  b64ToUtf8: (value: string) => value,
  utf8ToB64: (value: string) => value,
}))
vi.mock('@/cep/jsx', () => ({ jsx }))
vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { useActionStore } = await import('@/stores/action')
const { useCommonUseStore, installCommonUseSource } = await import('@/stores/common-use')
const { commonUseRepo } = await import('@/cep/data/common-use')
const { readKuItem } = await import('@/cep/data/style-library-repo')
const { log } = await import('@/utils/logger')
const { __resetSettingsForTest } = await import('@/cep/data/settings')

const SET_FILE = '/user/sj_set.json'
const ACTION_INDEX = '/user/sj_dzStoreInfo.json'
const ACTION_LIB = '/user/sj_dz_default.json'
const KU_INDEX = '/user/sj_kuStoreInfo.ini'
const FREE_PANEL = '/user/sj_appFreePanel.json'
const COMMON_USE = '/user/sj_commonFunction.json'

beforeEach(() => {
  setActivePinia(createPinia())
  files.map.clear()
  __resetSettingsForTest()
  vi.clearAllMocks()
  vi.mocked(jsx.font.distributeByPitch).mockResolvedValue('ok')
  installCommonUseSource({
    read: () => commonUseRepo.read(),
    onChange: (listener) => commonUseRepo.onChange(listener),
  })
})

describe('静默 4 处：degraded 不许再被丢掉', () => {
  it('commands/fontSet.ts:138「按间距分布」：坏设置 → 抛 IO，且一次 jsx 都不调', async () => {
    files.map.set(SET_FILE, '{ 坏 json')

    const result = await execute('fontSet.distribute', { axis: 1, value: '10' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('字体设置文件损坏')
    expect(result.ok === false && result.reason).toContain('内容不是合法 JSON')
    // 关键：不许拿默认 ztDistributionFilter 继续跑（改前这里会调用一次）
    expect(jsx.font.distributeByPitch).not.toHaveBeenCalled()
  })

  it('对照：设置文件正常 → 仍按用户的 ztDistributionFilter 跑（改前能跑的仍绿）', async () => {
    files.map.set(SET_FILE, JSON.stringify({ ztDistributionFilter: false }))

    const result = await execute('fontSet.distribute', { axis: 1, value: '10' })

    expect(result.ok).toBe(true)
    expect(jsx.font.distributeByPitch).toHaveBeenCalledWith(1, '10', false)
  })

  it('stores/action.ts:36：坏索引 → 提示里说清"现在看的是默认仓库"，并落 error 日志', async () => {
    files.map.set(ACTION_INDEX, '{ 坏 json')
    const error = vi.spyOn(log, 'error').mockImplementation(() => {})

    const store = useActionStore()
    await store.load()

    expect(store.degraded).toContain('动作库索引文件损坏')
    // 只说"索引坏了"仍然是误导：用户会把默认仓库当成自己的（T-101-1 丙区 1）
    expect(store.degraded).toContain('当前显示的是默认仓库 sj_dz_default.json')
    expect(error).toHaveBeenCalled()
    expect(String(error.mock.calls.at(-1)?.[1])).toContain('sj_dz_default.json')
    error.mockRestore()
  })

  it('stores/common-use.ts:58：坏 sj_set.json → options 的坏因进 degraded + error 日志', async () => {
    files.map.set(SET_FILE, '{ 坏 json')
    const error = vi.spyOn(log, 'error').mockImplementation(() => {})

    const store = useCommonUseStore()
    await store.loadOptions()

    expect(store.degraded).toContain('内容不是合法 JSON')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('反向探针：先坏 settings 再 load 好的 tiles，两个坏因互不覆盖（不留半态）', async () => {
    files.map.set(SET_FILE, '{ 坏 json')
    files.map.set(COMMON_USE, JSON.stringify({ info: [] }))
    const store = useCommonUseStore()
    await store.loadOptions()
    const optionsReason = store.degraded
    expect(optionsReason).not.toBe('')

    // load() 读的是另一个文件（sj_commonFunction.json），正常 → 不许把 options 的坏因抹掉
    await store.load()

    expect(store.degraded).toContain('内容不是合法 JSON')
  })
})

describe('文案 4 处：必须分得清"文件坏了"与"本来就没有"', () => {
  it('cep/data/actions.ts:105/106：坏索引 → 说"索引文件损坏"，不是"至少保留一个仓库"', async () => {
    files.map.set(ACTION_INDEX, '{ 坏 json')

    const result = await execute('action.deleteWarehouse', { index: 0 })

    expect(result.ok).toBe(false)
    const reason = result.ok === false ? result.reason : ''
    expect(reason).toContain('动作库索引文件损坏')
    expect(reason).not.toContain('至少保留一个仓库')
    expect(reason).not.toContain('仓库不存在')
  })

  it('对照：索引正常且只有一个仓库 → 仍是"至少保留一个仓库"（本来就没有）', async () => {
    files.map.set(
      ACTION_INDEX,
      JSON.stringify({ index: 0, list: [{ name: '默认仓库', fileName: 'sj_dz_default.json' }] }),
    )

    const result = await execute('action.deleteWarehouse', { index: 0 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('至少保留一个仓库')
  })

  it('cep/data/style-library-repo.ts:110：坏索引 → 说"索引文件损坏"，不猜库文件路径', async () => {
    files.map.set(KU_INDEX, '{ 坏 json')

    await expect(readKuItem('color', 0, 0)).rejects.toThrow('仓库索引文件损坏')
    await expect(readKuItem('color', 0, 0)).rejects.not.toThrow('索引里没有当前仓库')
  })

  it('对照：索引正常但这个仓库没登记 color 库 → 才是"索引里没有当前仓库的 color 库文件名"', async () => {
    files.map.set(KU_INDEX, JSON.stringify({ index: 0, list: [{ name: '默认仓库' }] }))

    await expect(readKuItem('color', 0, 0)).rejects.toThrow('索引里没有当前仓库的color库文件名')
  })

  it('commands/freePanel.ts:298：坏面板文件 → 说"文件损坏"，不是"自由面板项不存在"', async () => {
    files.map.set(FREE_PANEL, '{ 坏 json')

    const result = await execute('freePanel.execute', { blockId: 1, btnId: 1 })

    expect(result.ok).toBe(false)
    const reason = result.ok === false ? result.reason : ''
    expect(reason).toContain('自由面板文件损坏')
    expect(reason).not.toContain('自由面板项不存在')
  })
})

describe('反向探针：别把正常状态改成"坏"', () => {
  it('动作库文件本身不存在不算坏（首次使用是正常状态，`degraded` 必须还是空串）', async () => {
    files.map.set(
      ACTION_INDEX,
      JSON.stringify({ index: 0, list: [{ name: '默认仓库', fileName: 'sj_dz_default.json' }] }),
    )
    const store = useActionStore()
    await store.load()

    expect(store.degraded).toBe('')
    expect(files.map.has(ACTION_LIB)).toBe(false)
  })
})
