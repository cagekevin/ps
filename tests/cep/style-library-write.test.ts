import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readValue } from '../support/repo-read'

/**
 * 写库能力（第 3 段的落地层）：`cep/data/style-library-repo.ts`。
 *
 * 只测这一层能证明的三件事：
 * 1. **备份**：改库前把原文写进 `<库文件>.bak`（回滚 = 把 .bak 复制回去）；
 * 2. **写库顺序**：索引里没有文件名时，先写库文件、成功后才补索引（反过来会让索引指向不存在的文件）；
 * 3. **不静默兜底**：库文件损坏 / 写失败一律抛，绝不覆盖原件、绝不"看起来成功"。
 *
 * 全部走内存 fs（`@/cep/fs` 被替身），不碰真实 `%APPDATA%`。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
  /** 让 `writeTextFileAtomic` 返回 false，模拟磁盘写失败 */
  failAtomic: false,
  /** 每次原子写落的路径 —— 用来证明"一次拖拽只写一次盘" */
  atomicWrites: [] as string[],
  /** 非空 = 这个路径的读返回 `error`（模拟 EPERM / EBUSY：文件在、但读不到） */
  readErrorPath: '',
}))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextSmart: async (path: string) => fsMock.files.get(path) ?? null,
  // T-107：唯一读入口（三态）+ 同步例外（CAS / 结构上同步的调用方）  readTextOutcome: async (path: string) => {
      // T-112：文件在、但读不到（EPERM / EBUSY）——这是"读不到"，不是"没有"    if (fsMock.readErrorPath && path === fsMock.readErrorPath) {
        return { status: 'error' as const, reason: 'EPERM: operation not permitted' }
      }
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFileAtomic: (path: string, text: string) => {
      if (fsMock.failAtomic) return { status: 'error' as const, reason: 'EPERM: 模拟原子写失败' }
      fsMock.atomicWrites.push(path)
      fsMock.files.set(path, text)
      return { status: 'ok' as const }
    },
  writeTextFile: (path: string, text: string) => {
      fsMock.files.set(path, text)
    },
  // 删除仓库把文件移进回收目录：base64 只是"原样搬运"的载体，这里用同一个 Map 存文本即可  // T-109：base64 读也走三态（只认 ENOENT 是 notSeen）  readBase64Outcome: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined
        ? { status: 'notSeen' as const }
        : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
    },
  writeBase64File: (path: string, base64: string) => {
      if (fsMock.failAtomic) return { status: 'error' as const, reason: 'EPERM: 模拟写失败' }
      fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
      return { status: 'ok' as const }
    },
  // T-109：`removeFile` 现在返回 `{ ok } | { ok:false, reason }`，不再是 boolean  removeFile: (path: string) => {
      fsMock.files.delete(path)
      return { ok: true as const }
    },
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
}))

const {
  styleIndexWriter,
  readKuLibrary,
  addKuGroup,
  addKuItem,
  appendKuGroup,
  deleteKuItem,
  sendKuItemToSwatch,
  appendKuItemToSwatch,
  selectWarehouse,
  addWarehouse,
  renameWarehouse,
  deleteWarehouse,
  moveKuItemTo,
  moveKuGroupTo,
} = await import('@/cep/data/style-library-repo')

const USER = 'ROAM/SheJiZhuLi'
const COLOR_LIB = `${USER}/sj_kuColA.ini`

const INDEX_VALUE = {
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
}

function seedLib(text = JSON.stringify([{ name: '灰白', show: true, list: [] }])) {
  fsMock.files.set(COLOR_LIB, text)
}

beforeEach(() => {
  fsMock.files.clear()
  fsMock.failAtomic = false
  fsMock.atomicWrites.length = 0
  fsMock.readErrorPath = ''
})

describe('索引状态只有一份实现（TD-09-16）', () => {
  /**
   * 原来「读索引 → 归一 → 拼 degraded」在 `readStyleLibrary`、`usableIndex`、
   * `style-library-io.indexState` 三处各写一遍：改一处必漏另两处。
   * 现在只有一个 `readIndexState`，下面钉住它的两条契约。
   */
  beforeEach(() => {
    fsMock.files.clear()
    fsMock.atomicWrites.length = 0
    fsMock.failAtomic = false
    fsMock.readErrorPath = ''
  })

  it('索引不存在 = 首次使用：degraded 为空串（不许当成"坏了"）', async () => {
    const { readIndexState } = await import('@/cep/data/style-library-repo')

    const state = await readIndexState()

    expect(state.degraded).toBe('')
    expect(state.value.list).toHaveLength(1)
  })

  it('页面读路径与写前检查共用这一份：两边 degraded 一字不差', async () => {
    const { readIndexState, readStyleLibrary } = await import('@/cep/data/style-library-repo')

    const state = await readIndexState()
    const snapshot = await readStyleLibrary()

    // 索引这一层的原因必须**同源**（页面读在自己的 notes 之外不再自己拼一份）
    expect(snapshot.degraded.startsWith(state.degraded)).toBe(true)
    expect(snapshot.index).toEqual(state.value)
  })
})

describe('备份（ADR-12）', () => {
  it('改库前把原文复制成 <库文件>.bak，原文件被新内容覆盖', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexWriter.write(INDEX_VALUE)

    await addKuGroup('color', '新组')

    expect(fsMock.files.get(`${COLOR_LIB}.bak`)).toBe(before)
    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ name: string }>
    expect(groups.map((g) => g.name)).toEqual(['灰白', '新组'])
  })

  it('文件本来不存在（首次使用）→ 不产生空备份', async () => {
    await styleIndexWriter.write(INDEX_VALUE)

    await addKuGroup('color', '新组')

    expect(fsMock.files.has(`${COLOR_LIB}.bak`)).toBe(false)
    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ name: string }>
    expect(groups.map((g) => g.name)).toEqual(['新组'])
  })
})

describe('索引里没有库文件名：先写库文件，再补索引（照 action-archive 顺序）', () => {
  it('生成 sj_kuCol<16 位大写 hex>.json，写成功后索引才登记', async () => {
    await styleIndexWriter.write({ index: 0, list: [{ name: '新仓库' }] })

    await addKuGroup('color', '第一组')

    const fileName = [...fsMock.files.keys()].find(
      (path) => path.startsWith(`${USER}/sj_kuCol`) && !path.endsWith('.bak'),
    )
    expect(fileName).toMatch(/\/sj_kuCol[0-9A-F]{16}\.json$/)
    // 库文件内容确实写了
    expect(JSON.parse(fsMock.files.get(fileName ?? '') ?? '[]')).toEqual([
      { name: '第一组', show: true, list: [] },
    ])
    // 索引补登记的是同一个文件名
    const index = await styleIndexWriter.read()
    expect(readValue(index).list[0].color).toBe(fileName?.replace(`${USER}/`, ''))
  })

  it('写库失败（原子写返回 false）→ 抛错，索引不登记，不留半截文件', async () => {
    await styleIndexWriter.write({ index: 0, list: [{ name: '新仓库' }] })
    fsMock.failAtomic = true

    await expect(addKuGroup('color', '第一组')).rejects.toThrow('写入失败')

    const index = await styleIndexWriter.read()
    expect(readValue(index).list[0].color).toBeUndefined()
    expect([...fsMock.files.keys()].some((path) => path.includes('sj_kuCol'))).toBe(false)
  })
})

describe('不静默兜底', () => {
  it('库文件不是合法 JSON → 抛错，原件一个字节都不动', async () => {
    seedLib('{坏掉的')
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(addKuGroup('color', '新组')).rejects.toThrow('不是合法 JSON')

    expect(fsMock.files.get(COLOR_LIB)).toBe('{坏掉的')
    expect(fsMock.files.has(`${COLOR_LIB}.bak`)).toBe(false)
  })

  it('库文件顶层不是数组 → 抛错，不覆盖', async () => {
    seedLib('{"arrFileData":[],"store":{}}')
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(addKuGroup('color', '新组')).rejects.toThrow('顶层不是数组')

    expect(fsMock.files.get(COLOR_LIB)).toBe('{"arrFileData":[],"store":{}}')
  })

  it('索引里一个仓库都没有（= 索引不可用）→ 抛错，不写库文件（不猜路径、不写到别处）', async () => {
    await styleIndexWriter.write({ index: 0, list: [] })

    await expect(addKuGroup('color', '新组')).rejects.toThrow('仓库索引不可用')

    expect([...fsMock.files.keys()].some((path) => path.includes('sj_kuCol'))).toBe(false)
  })

  it('项不是对象 → 抛错，不动文件', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(addKuItem('color', 0, 'not-an-object')).rejects.toThrow('项必须是非空对象')

    expect(fsMock.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('串行队列（D-12：连点两次不能丢更新）', () => {
  it('并发两次 addKuItem 都落盘', async () => {
    seedLib(JSON.stringify([{ name: '灰白', show: true, list: [] }]))
    await styleIndexWriter.write(INDEX_VALUE)

    await Promise.all([
      addKuItem('color', 0, { name: 'a', color: { hex: '111111' } }),
      addKuItem('color', 0, { name: 'b', color: { hex: '222222' } }),
    ])

    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ list: unknown[] }>
    expect(groups[0].list).toEqual([
      { name: 'a', color: { hex: '111111' } },
      { name: 'b', color: { hex: '222222' } },
    ])
  })

  it('并发删两项：先删第 0 项再删剩下的第 0 项，结果为空', async () => {
    seedLib(
      JSON.stringify([
        {
          name: '灰白',
          show: true,
          list: [{ name: 'a' }, { name: 'b' }],
        },
      ]),
    )
    await styleIndexWriter.write(INDEX_VALUE)

    await Promise.all([deleteKuItem('color', 0, 0), deleteKuItem('color', 0, 0)])

    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ list: unknown[] }>
    expect(groups[0].list).toEqual([])
  })
})

describe('发送到色板', () => {
  it('写到 %APPDATA%/FengZiSeBan/userColor.ini（原版 path.seBan :5222），旧内容进 .bak', async () => {
    seedLib(
      JSON.stringify([
        { name: '灰白', show: true, list: [{ name: '主色', color: { hex: '302F34' } }] },
      ]),
    )
    await styleIndexWriter.write(INDEX_VALUE)
    const swatch = 'ROAM/FengZiSeBan/userColor.ini'
    fsMock.files.set(swatch, '[]')

    await sendKuItemToSwatch('color', 0, 0)

    expect(JSON.parse(fsMock.files.get(swatch) ?? 'null')).toEqual([
      { name: '主色', color: { hex: '302F34' } },
    ])
    expect(fsMock.files.get(`${swatch}.bak`)).toBe('[]')
  })

  it('色板文件写不进去 → 抛错（不让用户以为发送成功）', async () => {
    seedLib(
      JSON.stringify([
        { name: '灰白', show: true, list: [{ name: '主色', color: { hex: '302F34' } }] },
      ]),
    )
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.failAtomic = true

    // 文案从「色板文件写入失败」变成 `file-repo.persist` 的统一报错（带目标路径 + OS 原因）——
    // 行为（必须抛、不让用户以为发送成功）没变，变的是**用户可见文案**（更有诊断价值，已记账）
    await expect(sendKuItemToSwatch('color', 0, 0)).rejects.toThrow(/写入失败/)
  })
})

/**
 * T-112：**读不到 ≠ 没有**。四处 P1 都在这条边界上：
 * 文件在、但读不到（`EPERM` / `EBUSY`）时，原来的写法会拿 `[]` / `null` 当"首次使用"，
 * 然后整份写回 —— 用户的库文件 / 色板被一次操作抹平，而且 `.bak` 也写不出来。
 *
 * 钉的是"抛错 + 原件一个字节都不变"。`notSeen`（文件本来不存在）仍按空处理，
 * 由 `readTextOutcome` 的 `notSeen` 分支保证，不在这组用例里重复。
 */
describe('读不到时不许写盘（T-112）', () => {
  const swatch = 'ROAM/FengZiSeBan/userColor.ini'
  const OLD_SWATCH = JSON.stringify([{ name: '旧色', color: { hex: '000000' } }])

  it('updateKuGroups：库文件读不到 → 抛错，原件一个字节都不动、不写 .bak', async () => {
    const original = JSON.stringify([{ name: '旧组', show: true, list: [] }])
    seedLib(original)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.readErrorPath = COLOR_LIB

    await expect(addKuGroup('color', '新组')).rejects.toThrow('读不到')

    expect(fsMock.files.get(COLOR_LIB)).toBe(original)
    expect(fsMock.files.get(`${COLOR_LIB}.bak`)).toBeUndefined()
  })

  it('readSwatchItems：色板读不到 → 追加中止，色板一个字节都不动', async () => {
    seedLib(
      JSON.stringify([
        { name: '灰白', show: true, list: [{ name: '主色', color: { hex: '302F34' } }] },
      ]),
    )
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.files.set(swatch, OLD_SWATCH)
    fsMock.readErrorPath = swatch

    await expect(appendKuItemToSwatch('color', 0, 0)).rejects.toThrow('读不到')

    expect(fsMock.files.get(swatch)).toBe(OLD_SWATCH)
    expect(fsMock.files.get(`${swatch}.bak`)).toBeUndefined()
  })

  it('writeSwatchItems：色板读不到 → 整份替换中止，原件一个字节都不动', async () => {
    seedLib(
      JSON.stringify([
        { name: '灰白', show: true, list: [{ name: '主色', color: { hex: '302F34' } }] },
      ]),
    )
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.files.set(swatch, OLD_SWATCH)
    fsMock.readErrorPath = swatch

    await expect(sendKuItemToSwatch('color', 0, 0)).rejects.toThrow('读不到')

    expect(fsMock.files.get(swatch)).toBe(OLD_SWATCH)
  })
})

// ---------- 仓库索引（第 5 段）：原版 `N_` 的 select / add / rename / delete ----------

/** 两个仓库的索引。用工厂：仓库改名是**原地改**，共用一份 fixture 会被前一个用例改脏 */
function two() {
  return {
    index: 1,
    list: [
      {
        name: '默认仓库',
        color: 'sj_kuColA.json',
        gradient: 'sj_kuGraA.json',
        font: 'sj_kuFonA.json',
        style: 'sj_kuStyA.json',
      },
      {
        name: '客户A',
        color: 'sj_kuColB.json',
        gradient: 'sj_kuGraB.json',
        font: 'sj_kuFonB.json',
        style: 'sj_kuStyB.json',
      },
    ],
  }
}

describe('切换仓库（原版 select，app.v4.js:53365-53372）', () => {
  it('写 index：列表不动，当前项换成点的那一条', async () => {
    await styleIndexWriter.write(two())

    await selectWarehouse(0)

    const index = await styleIndexWriter.read()
    expect(readValue(index).index).toBe(0)
    expect(readValue(index).list.map((w) => w.name)).toEqual(['默认仓库', '客户A'])
  })

  it('越界（负数 / 超过末位 / 正好等于 list.length）一律归 0', async () => {
    await styleIndexWriter.write(two())

    await selectWarehouse(2) // 原版判 `t > list.length` 会漏过这一条，这里也归 0
    expect(readValue(await styleIndexWriter.read()).index).toBe(0)

    await styleIndexWriter.write(two())
    await selectWarehouse(-1)
    expect(readValue(await styleIndexWriter.read()).index).toBe(0)
  })
})

describe('新建仓库（原版 add / P_，app.v4.js:53357-53363 / 53284-53293）', () => {
  it('追加「未命名分组」+ 四个库文件名，四个 guid 互不相同', async () => {
    await styleIndexWriter.write(INDEX_VALUE)

    await addWarehouse()

    const { list } = readValue(await styleIndexWriter.read())
    expect(list.map((w) => w.name)).toEqual(['默认仓库', '未命名分组'])

    const added = list[1]
    const prefix = { color: 'Col', gradient: 'Gra', font: 'Fon', style: 'Sty' }
    for (const kind of ['color', 'gradient', 'font', 'style'] as const) {
      expect(added[kind]).toMatch(new RegExp(`^sj_ku${prefix[kind]}[0-9A-F]{16}\\.json$`))
    }
    // 原版 P_() 里是四次 D_()：四个文件名不是同一个 guid 换前缀
    const guids = (['color', 'gradient', 'font', 'style'] as const).map((kind) =>
      String(added[kind]).slice('sj_kuCol'.length, 'sj_kuCol'.length + 16),
    )
    expect(new Set(guids).size).toBe(4)
  })
})

describe('重命名仓库（原版 rename，:53324-53327）', () => {
  it('只改 name，其它字段原样保留', async () => {
    await styleIndexWriter.write(two())

    await renameWarehouse(0, '  我的仓库  ')

    const { list } = readValue(await styleIndexWriter.read())
    expect(list[0].name).toBe('我的仓库')
    expect(list[0].color).toBe('sj_kuColA.json')
    expect(list[1].name).toBe('客户A')
  })

  it('空名 → 抛错，索引一个字节都不动（有意偏离：原版不校验）', async () => {
    await styleIndexWriter.write(two())

    await expect(renameWarehouse(0, '   ')).rejects.toThrow('仓库名不能为空')

    expect(readValue(await styleIndexWriter.read()).list[0].name).toBe('默认仓库')
  })
})

describe('删除仓库（原版 delete，:53329-53356）', () => {
  /** 让两个仓库的库文件都在盘上：样式库带组 id + 项 id，渐变库带预览图文件名 */
  function seedWarehouseFiles() {
    fsMock.files.set(
      `${USER}/sj_kuStyA.json`,
      JSON.stringify([
        { name: '样式组', show: true, id: 'YSAAA', list: [{ name: '项', id: 'ITEM1' }] },
      ]),
    )
    fsMock.files.set(
      `${USER}/sj_kuGraA.json`,
      JSON.stringify([
        {
          name: '渐变组',
          show: true,
          list: [{ name: '项', gradient: { fileName: 'g1.png' } }],
        },
      ]),
    )
    fsMock.files.set(`${USER}/sj_kuColA.json`, '[]')
    fsMock.files.set(`${USER}/sj_kuFonA.json`, '[]')
    fsMock.files.set(`${USER}/sj_kuColB.json`, '[]')
    // 组图片 / 组文件 / 渐变预览图（原版 deleteAllGroupFile 会连它们一起删）
    fsMock.files.set(`${USER}/kuStyle/ITEM1.png`, 'png')
    fsMock.files.set(`${USER}/kuStyle/YSAAA.psd`, 'psd')
    fsMock.files.set(`${USER}/Gradient/g1.png`, 'png')
  }

  it('删索引项 + 修 index（被删项在当前项之前 → -1），磁盘文件移进 .deleted-<时间戳>/', async () => {
    seedWarehouseFiles()
    await styleIndexWriter.write(two())

    const result = await deleteWarehouse(0)

    const index = await styleIndexWriter.read()
    expect(readValue(index).list.map((w) => w.name)).toEqual(['客户A'])
    expect(readValue(index).index).toBe(0) // 原来 1，删掉前面的 0 → -1

    // 四个库文件 + 样式组文件与缩略图 + 渐变预览图都搬到了回收目录（保留原相对路径）
    expect(result.recycleDir).toMatch(/\/\.deleted-\d+$/)
    expect(result.moved.sort()).toEqual([
      'Gradient/g1.png',
      'kuStyle/ITEM1.png',
      'kuStyle/YSAAA.psd',
      'sj_kuColA.json',
      'sj_kuFonA.json',
      'sj_kuGraA.json',
      'sj_kuStyA.json',
    ])
    expect(fsMock.files.get(`${result.recycleDir}/sj_kuColA.json`)).toBe('[]')
    expect(fsMock.files.get(`${result.recycleDir}/kuStyle/YSAAA.psd`)).toBe('psd')
    // 原件不在了，别的仓库的文件没被碰
    expect(fsMock.files.has(`${USER}/sj_kuColA.json`)).toBe(false)
    expect(fsMock.files.has(`${USER}/kuStyle/ITEM1.png`)).toBe(false)
    expect(fsMock.files.has(`${USER}/sj_kuColB.json`)).toBe(true)
  })

  it('删当前仓库 → index 归 0', async () => {
    await styleIndexWriter.write(two())

    await deleteWarehouse(1)

    const index = await styleIndexWriter.read()
    expect(readValue(index).list.map((w) => w.name)).toEqual(['默认仓库'])
    expect(readValue(index).index).toBe(0)
  })

  it('只剩一个仓库 → 抛错，索引与文件都不动', async () => {
    seedWarehouseFiles()
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(deleteWarehouse(0)).rejects.toThrow('最少保留一个分组哦')

    expect(readValue(await styleIndexWriter.read()).list).toHaveLength(1)
    expect(fsMock.files.has(`${USER}/sj_kuColA.json`)).toBe(true)
    expect([...fsMock.files.keys()].some((path) => path.includes('.deleted-'))).toBe(false)
  })

  it('下标不存在 → 抛错，不写索引', async () => {
    await styleIndexWriter.write(two())

    await expect(deleteWarehouse(9)).rejects.toThrow('仓库 9 不存在')

    expect(readValue(await styleIndexWriter.read()).list).toHaveLength(2)
  })
})

describe('拖拽落点（moveKuItemTo / moveKuGroupTo）', () => {
  const twoGroups = JSON.stringify([
    { name: '组一', show: true, list: [{ name: 'a0' }, { name: 'a1' }] },
    { name: '组二', show: true, list: [{ name: 'b0' }] },
  ])

  function groupsOf(path = COLOR_LIB): Array<{ name: string; show: boolean; list: unknown[] }> {
    return JSON.parse(fsMock.files.get(path) ?? '[]')
  }

  it('项跨组移动：一次调用 = 一次原子写 + 一份 .bak', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.atomicWrites.length = 0

    await moveKuItemTo('color', {
      from: { group: 0, index: 1 },
      to: { group: 1, index: 0 },
      position: 'after',
    })

    // 只有库文件那一次；索引没被动过
    // `.bak` 现在也走原子写（唯一落盘入口）⇒ 只数**本体**那一次
    expect(fsMock.atomicWrites.filter((p) => !p.endsWith('.bak'))).toEqual([COLOR_LIB])
    expect(fsMock.files.get(`${COLOR_LIB}.bak`)).toBe(twoGroups)

    const groups = groupsOf()
    expect(groups[0].list).toEqual([{ name: 'a0' }])
    expect(groups[1].list).toEqual([{ name: 'b0' }, { name: 'a1' }])
  })

  it('项同组向后插前：目标在源前面，插入下标不受删除影响（原版 :50055-50057）', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)

    await moveKuItemTo('color', {
      from: { group: 0, index: 1 },
      to: { group: 0, index: 0 },
      position: 'before',
    })

    expect(groupsOf()[0].list).toEqual([{ name: 'a1' }, { name: 'a0' }])
  })

  it('原位不写盘：库文件与 .bak 都不变', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.atomicWrites.length = 0

    await moveKuItemTo('color', {
      from: { group: 0, index: 0 },
      to: { group: 0, index: 0 },
      position: 'after',
    })

    expect(fsMock.atomicWrites).toEqual([])
    expect(fsMock.files.has(`${COLOR_LIB}.bak`)).toBe(false)
  })

  it('组排序：一次原子写，且被移动的组顺带折叠（原版 before() + 同一次 updata()）', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.atomicWrites.length = 0

    await moveKuGroupTo('color', 0, 1, 'after')

    // `.bak` 现在也走原子写（唯一落盘入口）⇒ 只数**本体**那一次
    expect(fsMock.atomicWrites.filter((p) => !p.endsWith('.bak'))).toEqual([COLOR_LIB])
    const groups = groupsOf()
    expect(groups.map((g) => g.name)).toEqual(['组二', '组一'])
    expect(groups[1].show).toBe(false)
    expect(groups[0].show).toBe(true)
  })

  it('组排序落回自己：不写盘', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.atomicWrites.length = 0

    await moveKuGroupTo('color', 1, 1, 'before')

    expect(fsMock.atomicWrites).toEqual([])
  })

  it('越界落点抛错，库文件一个字节都不动', async () => {
    seedLib(twoGroups)
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(
      moveKuItemTo('color', {
        from: { group: 0, index: 0 },
        to: { group: 0, index: 5 },
        position: 'after',
      }),
    ).rejects.toThrow('不存在')

    expect(fsMock.files.get(COLOR_LIB)).toBe(twoGroups)
  })
})

/**
 * 刀1：`appendKuGroup` —— 按钮 5「发送到设计助理」的落点。
 *
 * 官方 `addGroupItem(t)`（`app.v4.js:52470-52475`）：`this.info.push(t); this.updata(); return true;`
 * 它与 `addGroup(name, afterIndex)`（`:52437-52449`）是两条路：**不校验、不补字段、不造 id**。
 * 这三条用例钉的就是"没拿 `createKuGroup` 凑"。
 */
describe('appendKuGroup（原版 addGroupItem，:52470-52475）', () => {
  const GROUP = {
    name: '提取颜色组',
    show: true,
    list: [{ name: '未命名', color: { hex: 'FF0000' } }],
  }

  it('整份 push 到库**末尾**，字段原样保留（不补 id）', async () => {
    seedLib(JSON.stringify([{ name: '灰白', show: true, list: [] }]))
    await styleIndexWriter.write(INDEX_VALUE)

    await appendKuGroup('color', GROUP)

    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as unknown[]
    expect(groups).toEqual([{ name: '灰白', show: true, list: [] }, GROUP])
  })

  it('落盘后重读得到（新组在，颜色项能归一成色块）', async () => {
    await styleIndexWriter.write(INDEX_VALUE)

    await appendKuGroup('color', GROUP)

    const read = await readKuLibrary('color', 'sj_kuColA.ini')
    expect(read.note).toBe('')
    expect(read.groups.map((g) => g.name)).toEqual(['提取颜色组'])
    expect(read.groups[0].items).toEqual([{ name: '未命名', swatch: '#FF0000' }])
  })

  it('一次调用 = 一次原子写 + 一份 .bak（旧内容进 .bak）', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexWriter.write(INDEX_VALUE)
    fsMock.atomicWrites.length = 0

    await appendKuGroup('color', GROUP)

    // `.bak` 现在也走原子写（唯一落盘入口）⇒ 只数**本体**那一次
    expect(fsMock.atomicWrites.filter((p) => !p.endsWith('.bak'))).toEqual([COLOR_LIB])
    expect(fsMock.files.get(`${COLOR_LIB}.bak`)).toBe(before)
  })

  it('走同一条串行队列：并发两次都落盘，后写的不会覆盖先写的', async () => {
    seedLib(JSON.stringify([{ name: '灰白', show: true, list: [] }]))
    await styleIndexWriter.write(INDEX_VALUE)

    await Promise.all([
      appendKuGroup('color', { name: 'A', show: true, list: [] }),
      appendKuGroup('color', { name: 'B', show: true, list: [] }),
    ])

    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ name: string }>
    expect(groups.map((g) => g.name)).toEqual(['灰白', 'A', 'B'])
  })

  it('不是对象 → 抛错，库文件一个字节都不动', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexWriter.write(INDEX_VALUE)

    await expect(appendKuGroup('color', 'not-a-group')).rejects.toThrow('组必须是非空对象')
    expect(fsMock.files.get(COLOR_LIB)).toBe(before)
  })
})

/**
 * T-116：`readKuLibrary` 的 `note` 必须分得开"空库"与"读不到"。
 *
 * `note` 经 `readKuLib` 汇进 `degraded`，由样式页渲染——所以这不是"日志多一行"，
 * 是用户在页面上能不能看出"这个库读不到"。
 */
describe('读库文件：读不到 ≠ 没有组（T-116）', () => {
  it('文件不在（notSeen）→ 空库且 note 为空（首次使用，本来就是空的）', async () => {
    const read = await readKuLibrary('color', 'sj_kuColA.ini')

    expect(read.groups).toEqual([])
    expect(read.note).toBe('')
  })

  it('文件在、读不到（EPERM）→ note 带上原因（页面据此显示 degraded）', async () => {
    fsMock.readErrorPath = COLOR_LIB

    const read = await readKuLibrary('color', 'sj_kuColA.ini')

    expect(read.groups).toEqual([])
    expect(read.note).toContain('读不到')
    expect(read.note).toContain('EPERM')
  })
})
