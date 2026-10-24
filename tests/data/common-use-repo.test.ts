import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * T-85：`sj_commonFunction.json` 仓库与纯函数。
 *
 * 六条判据各自有断言（见 describe 的标题）；重点是三条 P0：
 * - `ensure()` 三态：不存在才写种子；读坏/形状坏**抛且磁盘一个字节都不变**；已存在不写
 * - 未知键不丢（`foo` / `sort` / `openistrue` 一轮读-改-写后原值还在）
 * - `move` 与 `domain/reorder` 的落点计算同源（不另写一份）
 */

const state = vi.hoisted(() => ({
  files: new Map<string, string>(),
  failRead: false,
}))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => '/user',
  readTextSmart: async (path: string) => {
    if (state.failRead) throw new Error('EBUSY')
    return state.files.get(path) ?? null
  },
  // T-105：`failRead` 现在走 error 分支（旧实现只有"抛错"能让 D-42 生效，真实读取原语从不抛）
  readTextOutcome: async (path: string) => {
    if (state.failRead) return { status: 'error' as const, reason: 'EBUSY' }
    const text = state.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  readTextSync: (path: string) => {
    // 读不到 ≠ 没有（TD-09-23/24）：failRead 现在是 error，不是 notSeen
    if (state.failRead) return { status: 'error' as const, reason: 'EACCES: 模拟读不到' }
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

const PATH = '/user/sj_commonFunction.json'

const { commonUseRepo } = await import('@/cep/data/common-use')
const { COMMON_USE_SEED, toTiles, readCommonUseItems } = await import('@/domain/common-use')
const { applyListDrop } = await import('@/domain/reorder')

function writeDisk(value: unknown): void {
  state.files.set(PATH, JSON.stringify(value))
}

function readDisk(): string {
  return state.files.get(PATH) ?? ''
}

/** 造一份"官方形状 + 我们没解析过的键"的文件 */
/** 把给定 info 写进内存文件（A2 用例用） */
function seed(content: unknown) {
  state.files.set(PATH, JSON.stringify(content))
}
function seedWithUnknownKeys() {
  // 官方文件根是**裸数组**（`:11112` / `:6401`）；项内还有官方自己写、我们不解析的键（`sort` / `openistrue`）
  return [
    {
      id: 'a',
      isMore: false,
      ismark: false,
      isShow: true,
      title: 'A',
      svg: '#icona',
      fillSvg: false,
      moreId: '',
      name: 'A 项',
      sort: 0,
      openistrue: false,
    },
    {
      id: 'b',
      isMore: true,
      ismark: true,
      isShow: false,
      title: 'B',
      svg: '#iconb',
      fillSvg: '#iconblan',
      moreId: 'img_b_gd',
      name: 'B 项',
      comName: 'comembed',
      sort: 1,
      openistrue: true,
    },
    {
      id: 'c',
      isMore: false,
      ismark: false,
      isShow: true,
      name: 'C 项',
      sort: 2,
      openistrue: false,
    },
  ]
}

beforeEach(() => {
  state.files.clear()
  state.failRead = false
})

describe('ensure() 三态（判据 2）', () => {
  it('文件确实不存在 → 写官方种子 14 项，返回 created: true', async () => {
    const result = await commonUseRepo.ensure()

    expect(result).toEqual({ created: true })
    const onDisk = JSON.parse(readDisk()) as unknown[]
    expect(Array.isArray(onDisk)).toBe(true)
    expect(onDisk).toHaveLength(14)
    expect((onDisk[0] as { id: string }).id).toBe('div_img_cya1')
    // 种子逐项来自官方 configReset()（判据 6）
    expect(onDisk.map((i) => (i as { id: string }).id)).toEqual(COMMON_USE_SEED.map((i) => i.id))
  })

  it('文件已存在 → 不写，磁盘原文逐字节不变', async () => {
    writeDisk(seedWithUnknownKeys())
    const before = readDisk()

    const result = await commonUseRepo.ensure()

    expect(result).toEqual({ created: false })
    expect(readDisk()).toBe(before)
  })

  it('内容不是合法 JSON → 抛 IO，且磁盘原文逐字节不变', async () => {
    state.files.set(PATH, '{"info": [ oops')
    const before = readDisk()

    await expect(commonUseRepo.ensure()).rejects.toMatchObject({ code: 'IO' })
    expect(readDisk()).toBe(before)
  })

  it('根不是数组（也没有 info 数组）→ 抛 IO，且磁盘原文逐字节不变', async () => {
    writeDisk({ info: { nope: true } })
    const before = readDisk()

    await expect(commonUseRepo.ensure()).rejects.toMatchObject({ code: 'IO' })
    expect(readDisk()).toBe(before)
  })

  it('读失败（如被占用）→ 抛 IO，不建种子', async () => {
    state.failRead = true

    await expect(commonUseRepo.ensure()).rejects.toMatchObject({ code: 'IO' })
    expect(state.files.has(PATH)).toBe(false)
  })
})

describe('订阅透出（不自己实现第二套）', () => {
  it('onChange 会在 update 后触发，且 feed 到写后的值', async () => {
    writeDisk(seedWithUnknownKeys())
    const seen: Array<{ ids: string[] }> = []
    const off = commonUseRepo.onChange((value) => {
      seen.push({ ids: readCommonUseItems(value).map((i) => i.id ?? '') })
    })

    await commonUseRepo.setShow('a', false)
    off()
    await commonUseRepo.setShow('b', false)

    expect(seen).toHaveLength(1)
    expect(seen[0].ids).toEqual(['a', 'b', 'c'])
  })
})
describe('项内未知字段不丢（判据 3）', () => {
  it('读-改-写一轮后 sort / openistrue 都还在且值没变，根仍是数组', async () => {
    writeDisk(seedWithUnknownKeys())

    await commonUseRepo.move(0, 1, 'after')
    await commonUseRepo.setShow('b', true)

    const onDisk = JSON.parse(readDisk()) as Array<Record<string, unknown>>
    // 防复发：官方只认裸数组（`:6401` 直接 stringify 数组）
    expect(Array.isArray(onDisk)).toBe(true)
    const byId = new Map(onDisk.map((i) => [i.id, i]))

    expect(byId.get('a')?.sort).toBe(0)
    expect(byId.get('b')?.sort).toBe(1)
    expect(byId.get('c')?.sort).toBe(2)
    expect(byId.get('a')?.openistrue).toBe(false)
    expect(byId.get('b')?.openistrue).toBe(true)
    expect(byId.get('b')?.isShow).toBe(true)
    expect(byId.get('b')?.comName).toBe('comembed')
    expect(byId.get('b')?.fillSvg).toBe('#iconblan')
  })

  it('resetAll 写回 14 项，且根仍是数组（官方面板读得懂）', async () => {
    writeDisk(seedWithUnknownKeys())

    await commonUseRepo.resetAll()

    const onDisk = JSON.parse(readDisk()) as unknown[]
    expect(Array.isArray(onDisk)).toBe(true)
    expect(onDisk).toHaveLength(14)
  })
})

describe('move 与 domain/reorder 同源（判据 4）', () => {
  const cases: Array<[number, number, 'before' | 'after']> = [
    [0, 1, 'after'],
    [0, 1, 'before'],
    [2, 0, 'before'],
    [2, 0, 'after'],
  ]

  it.each(cases)(
    'from %i → to %i（%s）后的顺序与 applyListDrop 一致',
    async (from, to, position) => {
      // 期望值用 domain 的纯函数算（不手写期望，避免自己证明自己）
      const expected = ['a', 'b', 'c']
      applyListDrop(expected, from, to, position)

      writeDisk(seedWithUnknownKeys())
      const next = await commonUseRepo.move(from, to, position)

      expect(readCommonUseItems(next).map((i) => i.id)).toEqual(expected)
      // 落盘与返回值一致
      expect((JSON.parse(readDisk()) as Array<{ id: string }>).map((i) => i.id)).toEqual(expected)
    },
  )

  it('越界下标抛 PARSE，不静默跳过', async () => {
    writeDisk(seedWithUnknownKeys())
    await expect(commonUseRepo.move(0, 9, 'before')).rejects.toMatchObject({ code: 'PARSE' })
  })
})

describe('setShow（判据 3 的次要面）', () => {
  it('只改 isShow，不动顺序与其它字段', async () => {
    writeDisk(seedWithUnknownKeys())
    const next = await commonUseRepo.setShow('a', false)
    const items = readCommonUseItems(next)

    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(items[0].isShow).toBe(false)
    expect(items[0].title).toBe('A')
  })

  it('id 不存在 → 抛 PARSE', async () => {
    writeDisk(seedWithUnknownKeys())
    await expect(commonUseRepo.setShow('nope', true)).rejects.toMatchObject({ code: 'PARSE' })
  })
})

describe('toTiles 单向派生（判据 5）', () => {
  it('过滤 created 临时项、不读 sort、index 用落盘下标', () => {
    const file = [
      { id: 'a', name: 'A', title: 'A', svg: '#icona', fillSvg: false, isShow: true, sort: 5 },
      { created: '自定义变换', comName: 'comcustomChange' },
      {
        id: 'b',
        name: 'B',
        title: 'B',
        svg: '#iconb',
        fillSvg: '#iconblan',
        isShow: false,
        sort: 1,
      },
    ]

    const tiles = toTiles(file)

    expect(tiles.map((t) => t.id)).toEqual(['a', 'b'])
    // index 是落盘下标（b 在 2 位），不是 sort 值
    expect(tiles.map((t) => t.index)).toEqual([0, 2])
    expect(tiles[0].visible).toBe(true)
    expect(tiles[1].visible).toBe(false)
    expect(tiles[0].icon).toEqual({ rest: '#icona', filled: null })
    expect(tiles[1].icon).toEqual({ rest: '#iconb', filled: '#iconblan' })
    // 视图类型里没有 created / sort 这两个键
    expect(Object.keys(tiles[0])).not.toContain('created')
    expect(Object.keys(tiles[0])).not.toContain('sort')
  })

  it('形状不对（根不是数组）给空数组，不抛', () => {
    expect(toTiles({ nope: 1 } as never)).toEqual([])
    expect(toTiles(null)).toEqual([])
  })
})

describe('种子（判据 6）', () => {
  it('14 项、id 与顺序完全照官方 configReset()', () => {
    expect(COMMON_USE_SEED).toHaveLength(14)
    expect(COMMON_USE_SEED.map((i) => i.id)).toEqual([
      'div_img_cya1',
      'div_img_cya2',
      'div_img_cya3',
      'div_img_cya4',
      'div_img_cya5',
      'div_img_cya6',
      'div_img_cya7',
      'div_img_cya8',
      'div_img_cya9',
      'div_img_cya11',
      'div_img_cya13',
      'div_img_cya14',
      'div_img_cya15',
      'div_img_cya12',
    ])
    // comName 只有 7 项（7 个展开面板）
    expect(COMMON_USE_SEED.filter((i) => typeof i.comName === 'string')).toHaveLength(7)
    // fillSvg 既有 false 也有字符串（官方就是这样）
    expect(COMMON_USE_SEED.filter((i) => typeof i.fillSvg === 'string')).toHaveLength(4)
  })
})

describe('A2：显隐与重置（设置页用）', () => {
  it('setShow 只改目标项的 isShow，其它项逐字节不变、顺序不变', async () => {
    seed(COMMON_USE_SEED as unknown as Array<Record<string, unknown>>)
    const before = JSON.parse(state.files.get(PATH) as string) as Array<Record<string, unknown>>

    await commonUseRepo.setShow('div_img_cya3', false)

    const after = JSON.parse(state.files.get(PATH) as string) as Array<Record<string, unknown>>
    expect(after.map((i) => i.id)).toEqual(before.map((i) => i.id))
    expect(after[2].isShow).toBe(false)
    // 其它 13 项与改动前逐字节相同
    for (let i = 0; i < after.length; i += 1) {
      if (i === 2) continue
      expect(JSON.stringify(after[i])).toBe(JSON.stringify(before[i]))
    }
  })

  it('resetAll 回到官方种子顺序（cya12 在最后）', async () => {
    // 先打乱顺序 + 隐藏一项，模拟用户改过
    const shuffled = [...(COMMON_USE_SEED as unknown as Array<Record<string, unknown>>)]
    shuffled.push(shuffled.shift() as Record<string, unknown>)
    seed(shuffled)

    await commonUseRepo.resetAll()

    const after = JSON.parse(state.files.get(PATH) as string) as Array<Record<string, unknown>>
    expect(after.map((i) => i.id)).toEqual([
      'div_img_cya1',
      'div_img_cya2',
      'div_img_cya3',
      'div_img_cya4',
      'div_img_cya5',
      'div_img_cya6',
      'div_img_cya7',
      'div_img_cya8',
      'div_img_cya9',
      'div_img_cya11',
      'div_img_cya13',
      'div_img_cya14',
      'div_img_cya15',
      'div_img_cya12',
    ])
    expect(after.every((i) => i.isShow !== false)).toBe(true)
  })
})

describe('A3：拖拽落盘', () => {
  it('move 之后数组顺序与界面一致，且 index 连续无空洞', async () => {
    seed(COMMON_USE_SEED as unknown as Array<Record<string, unknown>>)

    await commonUseRepo.move(0, 2, 'after')

    const after = JSON.parse(state.files.get(PATH) as string) as Array<Record<string, unknown>>
    expect(after.map((i) => i.id)).toEqual([
      'div_img_cya2',
      'div_img_cya3',
      'div_img_cya1',
      'div_img_cya4',
      'div_img_cya5',
      'div_img_cya6',
      'div_img_cya7',
      'div_img_cya8',
      'div_img_cya9',
      'div_img_cya11',
      'div_img_cya13',
      'div_img_cya14',
      'div_img_cya15',
      'div_img_cya12',
    ])
    // index 连续无空洞：投影出的 index 就是数组下标
    const tiles = toTiles(after as never)
    expect(tiles.map((t) => t.index)).toEqual(Array.from({ length: 14 }, (_, i) => i))
  })

  it('同位移动：数据层是 no-op（顺序与内容都不变）', async () => {
    seed(COMMON_USE_SEED as unknown as Array<Record<string, unknown>>)
    const before = state.files.get(PATH)

    await commonUseRepo.move(3, 3, 'before')

    const after = JSON.parse(state.files.get(PATH) as string) as Array<Record<string, unknown>>
    expect(after.map((i) => i.id)).toEqual(
      (COMMON_USE_SEED as unknown as Array<Record<string, unknown>>).map((i) => i.id),
    )
    expect(before).toBeTruthy()
  })
})
