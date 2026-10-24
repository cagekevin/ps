import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readValue } from '../support/repo-read'

/**
 * T-99-2：`sj_appFreePanel.json` 的读边界归一。
 *
 * 钉的是"坏文件不能进业务"这条 P0：
 * - 形状不认识（`{}` / `obj.list` 不是数组 / 顶层是数组）→ `degraded` 有值，值里没有坏数据；
 * - 文件不存在 → `degraded` 为空（"读到空"与"文件坏了"必须可分）；
 * - 正常文件读回同值（block / data / 未知键一个不少）；
 * - `degraded` 时 `update` 抛 `IO`，磁盘一个字节不变（D-42 与这刀同一条链）。
 */

const state = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => '/user',
  readTextSmart: async (path: string) => state.files.get(path) ?? null,
  // T-105：写路径改用三态读；这个假 fs 没有"读不出"的场景，只会 ok / missing
  readTextOutcome: async (path: string) => {
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

const { freePanelRepo } = await import('@/cep/data/free-panel')
const { DATA_FILES } = await import('@/cep/env')

const PATH = `/user/${DATA_FILES.appFreePanel}`

/** 实测的原版形状（`domain/free-panel.ts` 顶部依据：`{ uid, btnId, obj:{version,type,list} }`） */
const realShape = {
  uid: 2,
  btnId: 12,
  obj: {
    version: '1.0',
    type: 'row',
    list: [
      {
        id: 1,
        zIndex: 0,
        showIcon: false,
        showNumber: 2,
        type: 'norow',
        width: '100%',
        height: '100%',
        children: [],
        data: [
          {
            icon: '',
            type: '',
            key: 'dz_useAction',
            btnId: 12,
            text: 'ps批量导出',
            funcText: '',
            option: { group: '常用', name: 'ps批量导出' },
            left: '',
            top: '',
            position: false,
          },
        ],
      },
    ],
  },
}

function seed(content: unknown): void {
  state.files.set(PATH, JSON.stringify(content))
}

beforeEach(() => {
  state.files.clear()
})

describe('自由面板仓库 · 读边界归一（T-99-2）', () => {
  it('正常文件逐值读回，degraded 为空', async () => {
    seed(realShape)

    const read = await freePanelRepo.read()

    expect(read.reason).toBeUndefined()
    expect(readValue(read).uid).toBe(2)
    expect(readValue(read).btnId).toBe(12)
    expect(readValue(read).obj.list).toHaveLength(1)
    expect(readValue(read).obj.list[0].data[0]).toMatchObject({
      key: 'dz_useAction',
      text: 'ps批量导出',
      option: { group: '常用', name: 'ps批量导出' },
    })
  })

  it('形状不认识（缺 obj）时 degraded 有值，业务拿不到坏数据', async () => {
    seed({})

    const read = await freePanelRepo.read()

    expect(read.reason).toBe('内容结构不认识')
    // 旧断言是「值退到 fallback：一个空区域、没有项」；坏读没有 value（4a96f63 的
    // src/cep/data/types.ts 把 `value` 从失败臂上删了），同一个意图更强：
    // 业务根本取不到值，也就不可能把 `{}` 当面板用
    expect(read).not.toHaveProperty('value')
  })

  it('obj.list 不是数组时同样判为结构不认识', async () => {
    seed({ uid: 1, btnId: 0, obj: { version: '1.0', type: 'row', list: '不是数组' } })

    const read = await freePanelRepo.read()

    expect(read.reason).toBe('内容结构不认识')
    expect(read).not.toHaveProperty('value')
  })

  it('顶层是数组（把别的库文件拷进来）也不当面板用', async () => {
    seed([{ groupName: '修图', list: [] }])

    const read = await freePanelRepo.read()

    expect(read.reason).toBe('内容结构不认识')
  })

  it('非法 JSON 与结构不认识是两个原因', async () => {
    state.files.set(PATH, '{坏文件')

    const read = await freePanelRepo.read()

    expect(read.reason).toBe('内容不是合法 JSON')
  })

  it('文件不存在不算 degraded（首次使用是正常状态）', async () => {
    const read = await freePanelRepo.read()

    expect(read.reason).toBeUndefined()
    expect(readValue(read).obj.list).toHaveLength(1)
  })

  it('结构不认识时 update 拒绝写，磁盘一个字节不变', async () => {
    seed({})
    const before = state.files.get(PATH)

    await expect(
      freePanelRepo.update((file) => {
        file.btnId += 1
      }),
    ).rejects.toThrow('拒绝覆盖写')

    expect(state.files.get(PATH)).toBe(before)
  })
})
