import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readValue } from '../support/repo-read'

/**
 * T-86b：常用页在 `sj_set.json` 里的 8 个 `cy*` 键（唯一入口 = `cep/data/legacy-settings.ts`）。
 *
 * 三条重点：
 * 1. 深对象**递归到叶子**，不许整块替换（否则用户没改的分支被删）；
 * 2. 数组**整体替换**（原版 `cyExport` 里就有数组，按下标合并会把长度变化吃掉）；
 * 3. 未知键拒写；文件里其它几十个键原样保留。
 */

const state = vi.hoisted(() => ({
  files: new Map<string, string>(),
  /** 非空 = 读返回 `error`（T-116：模拟"文件在、但读不到"） */
  readError: '',
}))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => '/user',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextSmart: async (path: string) => state.files.get(path) ?? null,
  // T-105：写路径改用三态读；T-116 起支持"读不到"（`readError`）这个分支  readTextOutcome: async (path: string) => {
      if (state.readError) return { status: 'error' as const, reason: state.readError }
      const text = state.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = state.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFile: (path: string, text: string) => {
      state.files.set(path, text)
    },
  writeTextFileAtomic: (path: string, text: string) => {
      state.files.set(path, text)
      return true
    },
}))

const PATH = '/user/sj_set.json'

const {
  COMMON_USE_SETTING_KEYS,
  readCommonUseOptions,
  readFontSetSettingsForSync,
  updateCommonUseOptions,
} = await import('@/cep/data/legacy-settings')

function writeDisk(value: unknown): void {
  state.files.set(PATH, JSON.stringify(value))
}

function readDisk(): Record<string, unknown> {
  return JSON.parse(state.files.get(PATH) ?? '{}') as Record<string, unknown>
}

beforeEach(() => {
  state.files.clear()
  state.readError = ''
})

/**
 * T-116：`readFontSetSettingsForSync` 的两种"不 ok"必须分开报。
 *
 * 动作相同（都中止同步），但用户该做的事不同：文件不在 = 设置丢了要重建；
 * 读不到 = 关掉占用它的程序再试。以前两种都说"不存在"。
 */
describe('同步读设置：读不到 ≠ 不存在（T-116）', () => {
  it('文件不在（notSeen）→ 报"不存在"', async () => {
    await expect(readFontSetSettingsForSync()).rejects.toThrow('不存在')
  })

  it('文件在、读不到（EPERM）→ 报"读不到"并带原因，不说"不存在"', async () => {
    writeDisk({ ztSize: 12 })
    state.readError = 'EPERM: operation not permitted'

    const failed = readFontSetSettingsForSync()
    await expect(failed).rejects.toThrow('读不到')
    await expect(failed).rejects.toThrow('EPERM')
    await expect(failed).rejects.not.toThrow('不存在')
  })
})

describe('读那 8 个键', () => {
  it('只挑 cy* 键，不认识的顶层键不返回', async () => {
    writeDisk({
      cyLinkObject: 1,
      cyExport: { format: 'png', sizes: [1, 2] },
      ztPreview: 3,
      别人的键: 'keep',
    })

    const read = await readCommonUseOptions()
    const value = readValue(read)
    const degraded = read.reason

    expect(degraded).toBeUndefined()
    expect(Object.keys(value).sort()).toEqual(['cyExport', 'cyLinkObject'])
  })

  it('文件里缺的键不补默认值（缺 = 官方默认，由面板决定）', async () => {
    writeDisk({ ztPreview: 3 })

    const value = readValue(await readCommonUseOptions())

    expect(value).toEqual({})
  })

  it('白名单就是那 17 个键（T-88b2 补 4 个自动嵌入开关；T-97-3 补 3 个 cyShow*；T-97-5 补 2 个区域显隐）', () => {
    expect(COMMON_USE_SETTING_KEYS).toHaveLength(17)
    expect([...COMMON_USE_SETTING_KEYS]).toEqual([
      'cyAutoFillColor',
      'cyClipMaskAutoEmbed',
      'cyDeleteNext',
      'cyDragInAutoEmbed',
      'cyExport',
      'cyShowBatch',
      'cyShowCompress',
      'cyShowSetFolder',
      'cyShowTransformation',
      'cyShowZoom',
      'cyImportToLinkObject',
      'cyLinkObject',
      'cyOpenDranInToLinkObject',
      'cyOptimizeAll',
      'cyOptimizeDeleteAllEmpty',
      'cyOptimizeDeleteAllHide',
      'cyPasetImageAutoEmbed',
    ])
  })
})

describe('写：递归到叶子 / 数组整体替换', () => {
  it('深对象只改被点到的叶子，同级兄弟键保持原值', async () => {
    writeDisk({
      cyExport: { format: 'png', quality: 90, nested: { a: 1, b: 2 } },
      ztPreview: 3,
    })

    await updateCommonUseOptions({ cyExport: { nested: { b: 20 } } })

    const disk = readDisk()
    expect(disk.cyExport).toEqual({
      format: 'png',
      quality: 90,
      nested: { a: 1, b: 20 },
    })
    // 别人的键一个都不许丢
    expect(disk.ztPreview).toBe(3)
  })

  it('数组整体替换，不是按下标合并', async () => {
    writeDisk({ cyExport: { sizes: [1, 2, 3] } })

    await updateCommonUseOptions({ cyExport: { sizes: [9] } })

    expect((readDisk().cyExport as { sizes: number[] }).sizes).toEqual([9])
  })

  it('标量直接覆盖（含 false / 0 这类"假值"，不许被当成"没传"跳过）', async () => {
    writeDisk({ cyDeleteNext: true, cyLinkObject: 1 })

    await updateCommonUseOptions({ cyDeleteNext: false, cyLinkObject: 0 })

    const disk = readDisk()
    expect(disk.cyDeleteNext).toBe(false)
    expect(disk.cyLinkObject).toBe(0)
  })

  it('未知键拒写，且磁盘一个字节不动', async () => {
    writeDisk({ cyLinkObject: 1 })
    const before = state.files.get(PATH)

    await expect(updateCommonUseOptions({ notACyKey: 1 } as never)).rejects.toMatchObject({
      code: 'PARSE',
    })
    expect(state.files.get(PATH)).toBe(before)
  })

  it('返回值是写后的 8 个键（供调用方直接回填 UI）', async () => {
    writeDisk({ cyOptimizeAll: false })

    const next = await updateCommonUseOptions({ cyOptimizeAll: true })

    expect(next).toEqual({ cyOptimizeAll: true })
  })
})
