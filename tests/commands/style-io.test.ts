import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readValue } from '../support/repo-read'

/**
 * 样式页导入导出（第 6 段）：`.kux` 容器四条命令。
 *
 * 覆盖三条路径（成功 / 用户取消 / 写失败），全部走内存 fs，不碰真实 `%APPDATA%`：
 * 1. 导出物形态必须对得上契约 §0.1 / §2.4；
 * 2. 导入必须换新 id（否则覆盖本地）、替换前备份索引、替换后旧文件进回收目录；
 * 3. 任何写失败都不许"看起来成功"：索引不动、已写的新文件回滚。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
  failWrite: false,
  /**
   * 只让 `<路径>.bak` 写失败。**当前无用例使用**：本仓每次导入都重新发 guid
   * （`remapKuContainer` + `kuGuid()`），目标名永远不重复 ⇒ `writeKuFile` 的 `.bak` 分支
   * 在本仓调用链上**不可达**（TD-09-22 是潜在洞，守卫已加，反例构造不出来）。
   * 留着开关是为了将来出现"同名覆盖"流程时能立刻钉住。
   */
  failBak: false,
  /** 非空 = 这个路径的读返回 `error`（模拟 EPERM / EBUSY：文件在、但读不到） */
  readErrorPath: '',
}))

const dialog = vi.hoisted(() => ({ open: null as string | null, save: null as string | null }))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextSmart: async (path: string) => fsMock.files.get(path) ?? null,
  // T-107：唯一读入口（三态）  readTextOutcome: async (path: string) => {
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
  writeTextFile: (path: string, text: string) => {
      if (fsMock.failWrite) throw new Error('disk full')
      fsMock.files.set(path, text)
    },
  writeTextFileAtomic: (path: string, text: string) => {
      if (fsMock.failWrite) return { status: 'error' as const, reason: 'ENOSPC: disk full' }
      fsMock.files.set(path, text)
      return { status: 'ok' as const }
    },
  // T-109：base64 读也走三态（只认 ENOENT 是 notSeen）  readBase64Outcome: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined
        ? { status: 'notSeen' as const }
        : { status: 'ok' as const, base64: Buffer.from(text, 'utf8').toString('base64') }
    },
  writeBase64File: (path: string, base64: string) => {
      if (fsMock.failWrite) return { status: 'error' as const, reason: 'ENOSPC: disk full' }
      // TD-09-22：`.bak` 这一个路径被占用（目录占位 → EISDIR），只让备份写失败    if (fsMock.failBak && path.endsWith('.bak')) {
        return { status: 'error' as const, reason: 'EISDIR: illegal operation on a directory' }
      }
      fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
      return { status: 'ok' as const }
    },
  // T-109：`removeFile` 现在返回 `{ ok } | { ok:false, reason }`，不再是 boolean  removeFile: (path: string) => {
      fsMock.files.delete(path)
      return { ok: true as const }
    },
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (base64: string) => Buffer.from(base64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

vi.mock('@/cep/dialog', () => ({
  openFile: () => dialog.open,
  saveFile: () => dialog.save,
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))

vi.mock('@/cep/jsx', () => ({
  jsx: {
    action: { callAction: vi.fn(), getActionList: vi.fn() },
    font: { setFont: vi.fn(), initSystemList: vi.fn(), checkUseFont: vi.fn(), useFont: vi.fn() },
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
    style: {},
  },
}))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { styleIndexWriter } = await import('@/cep/data/style-library-repo')

const USER = 'ROAM/SheJiZhuLi'
const INDEX = `${USER}/sj_kuStoreInfo.ini`
const LIB = {
  color: `${USER}/sj_kuColA.ini`,
  gradient: `${USER}/sj_kuGraA.ini`,
  font: `${USER}/sj_kuFonA.json`,
  style: `${USER}/sj_kuStyA.ini`,
}

const COLOR_GROUPS = [
  { name: '灰白', show: true, list: [{ name: '未命名', color: { hex: '302F34', c: 81 } }] },
]
const STYLE_GROUPS = [
  {
    name: '样式默认分组',
    show: true,
    id: 'YS5B2C4C06B1029543',
    list: [{ name: '描边', id: 'ABC123', layerId: 7 }],
  },
]
const GRADIENT_GROUPS = [
  { name: '渐变默认分组', show: true, list: [{ name: '未命名', gradient: { angle: 90 } }] },
]
const FONT_GROUPS = [{ name: '等线字组', show: true, list: [{ name: '未命名', fonts: [] }] }]

const enc = (text: string) => Buffer.from(text, 'utf8').toString('base64')
const dec = (base64: string) => Buffer.from(base64, 'base64').toString('utf8')

function warehouse(name: string) {
  return {
    name,
    color: 'sj_kuColA.ini',
    gradient: 'sj_kuGraA.ini',
    font: 'sj_kuFonA.json',
    style: 'sj_kuStyA.ini',
  }
}

function seedLibs() {
  fsMock.files.set(LIB.color, JSON.stringify(COLOR_GROUPS))
  fsMock.files.set(LIB.gradient, JSON.stringify(GRADIENT_GROUPS))
  fsMock.files.set(LIB.font, JSON.stringify(FONT_GROUPS))
  fsMock.files.set(LIB.style, JSON.stringify(STYLE_GROUPS))
}

function readJson(path: string): unknown {
  const text = fsMock.files.get(path)
  if (text === undefined) throw new Error(`没有写这个文件：${path}`)
  return JSON.parse(text)
}

function containerText(name: string, options: { missingColor?: boolean } = {}): string {
  return JSON.stringify({
    arrFileData: [
      {
        name: 'sj_kuColB2014808B3687D156.ini',
        data: options.missingColor ? false : enc(JSON.stringify(COLOR_GROUPS)),
      },
      { name: 'sj_kuStyBAAE4E9FB90DE3E13.ini', data: enc(JSON.stringify(STYLE_GROUPS)) },
      { name: 'sj_kuFonB194C70A627566B.json', data: enc(JSON.stringify(FONT_GROUPS)) },
      { name: 'sj_kuGraBAE924AD7B6094003C.ini', data: enc(JSON.stringify(GRADIENT_GROUPS)) },
      { name: 'kuStyle/YS5B2C4C06B1029543.psd', data: false },
    ],
    store: {
      index: 0,
      list: [
        {
          name,
          color: 'sj_kuColB2014808B3687D156.ini',
          gradient: 'sj_kuGraBAE924AD7B6094003C.ini',
          font: 'sj_kuFonB194C70A627566B.json',
          style: 'sj_kuStyBAAE4E9FB90DE3E13.ini',
        },
      ],
    },
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  fsMock.files.clear()
  fsMock.failWrite = false
  fsMock.readErrorPath = ''
  dialog.open = null
  dialog.save = null

  await styleIndexWriter.write({ index: 0, list: [warehouse('默认仓库')] })
  fsMock.files.set(INDEX, JSON.stringify({ index: 0, list: [warehouse('默认仓库')] }))
  seedLibs()
})

describe('导出（契约 §0.1 / §2.4 / §2.6）', () => {
  it('导出所有仓库：arrFileData = 每仓库 color/style/font/gradient，store 是索引镜像', async () => {
    dialog.save = 'OUT/all.kux'
    const result = await execute('style.exportKuAll')

    expect(result.ok).toBe(true)
    const file = readJson('OUT/all.kux') as {
      arrFileData: Array<{ name: string; data: string | false }>
      store: { index: number; list: Array<{ name: string }> }
    }

    expect(file.arrFileData.map((entry) => entry.name)).toEqual([
      'sj_kuColA.ini',
      'sj_kuStyA.ini',
      'sj_kuFonA.json',
      'sj_kuGraA.ini',
      // 样式组的 psd + 项的 png 是旁路图，跟在四个库文件后面（契约 §3.4）
      'kuStyle/YS5B2C4C06B1029543.psd',
      'kuStyle/ABC123.png',
    ])
    expect(dec(file.arrFileData[0].data as string)).toBe(JSON.stringify(COLOR_GROUPS))
    expect(file.store.list[0].name).toBe('默认仓库')
    expect(file.store.index).toBe(0)
  })

  it('导出当前仓库：只留当前项，store.index 归 0', async () => {
    await styleIndexWriter.write({
      index: 1,
      list: [warehouse('仓库A'), warehouse('仓库B')],
    })
    dialog.save = 'OUT/current.kux'
    const result = await execute('style.exportKuCurrent')

    expect(result.ok).toBe(true)
    const file = readJson('OUT/current.kux') as {
      store: { index: number; list: Array<{ name: string }> }
    }
    expect(file.store.index).toBe(0)
    expect(file.store.list.map((item) => item.name)).toEqual(['仓库B'])
  })

  it('库文件读不到时 data 写布尔 false，不省略', async () => {
    fsMock.files.delete(LIB.font)
    dialog.save = 'OUT/missing.kux'
    await execute('style.exportKuAll')

    const file = readJson('OUT/missing.kux') as {
      arrFileData: Array<{ name: string; data: string | false }>
    }
    const font = file.arrFileData.find((entry) => entry.name === 'sj_kuFonA.json')
    expect(font?.data).toBe(false)
  })

  it('导出写盘失败 → 失败，不报成功', async () => {
    fsMock.failWrite = true
    dialog.save = 'OUT/all.kux'
    const result = await execute('style.exportKuAll')

    expect(result.ok).toBe(false)
    expect(fsMock.files.has('OUT/all.kux')).toBe(false)
  })
})

describe('导入 .kux（契约 §2.4 / §5.2）', () => {
  it('覆盖导入：换新文件名、写索引、旧文件进回收目录、索引留 .bak', async () => {
    fsMock.files.set('IN/one.kux', containerText('导入仓库'))
    dialog.open = 'IN/one.kux'

    const result = await execute('style.importKuReplace')
    expect(result.ok).toBe(true)

    const index = readValue(await styleIndexWriter.read())
    expect(index.list.map((item) => item.name)).toEqual(['导入仓库'])
    // 内层文件名换新：不再指向导入文件里的名字
    expect(index.list[0].color).not.toBe('sj_kuColB2014808B3687D156.ini')
    expect(index.list[0].color).toMatch(/^sj_kuCol[0-9A-F]{16}\.ini$/)
    expect(fsMock.files.has(`${USER}/${String(index.list[0].color)}`)).toBe(true)

    // 旧库文件移进回收目录后原件被删
    expect(fsMock.files.has(LIB.color)).toBe(false)
    const recycle = [...fsMock.files.keys()].filter((path) => path.includes('/.deleted-'))
    expect(recycle.some((path) => path.endsWith('/sj_kuColA.ini'))).toBe(true)

    // 替换前索引原文进 .bak
    expect(JSON.parse(fsMock.files.get(`${INDEX}.bak`) ?? 'null')).toMatchObject({
      list: [{ name: '默认仓库' }],
    })
  })

  it('T-112：旧索引读不到 → 中止替换，索引一个字节都不动、也没有 .bak', async () => {
    const indexText = JSON.stringify({ index: 0, list: [warehouse('默认仓库')] })
    fsMock.files.set(INDEX, indexText)
    fsMock.files.set('IN/one.kux', containerText('导入仓库'))
    dialog.open = 'IN/one.kux'
    // 文件在、但读不到（EPERM）。这不是"索引不存在"，不许当首次导入
    fsMock.readErrorPath = INDEX

    const before = [...fsMock.files.keys()].sort()

    const result = await execute('style.importKuReplace')

    expect(result.ok).toBe(false)
    // 读不到就写不出 .bak，所以整份替换必须中止：旧索引原样留着
    expect(fsMock.files.get(INDEX)).toBe(indexText)
    expect(fsMock.files.has(`${INDEX}.bak`)).toBe(false)
    // 磁盘文件集合前后完全一致：已写的新库文件回滚掉，旧的一个都没少
    expect([...fsMock.files.keys()].sort()).toEqual(before)
  })

  it('追加导入：本地仓库保留，导入的接在后面并选中它', async () => {
    fsMock.files.set('IN/one.kux', containerText('导入仓库'))
    dialog.open = 'IN/one.kux'

    const result = await execute('style.importKuAppend')
    expect(result.ok).toBe(true)

    const index = readValue(await styleIndexWriter.read())
    expect(index.list.map((item) => item.name)).toEqual(['默认仓库', '导入仓库'])
    expect(index.index).toBe(1)
    expect(fsMock.files.has(LIB.color)).toBe(true)
    expect([...fsMock.files.keys()].some((path) => path.includes('/.deleted-'))).toBe(false)
  })

  it('导入文件里缺库文件（data:false）时跳过不写，其余照常', async () => {
    fsMock.files.set('IN/partial.kux', containerText('导入仓库', { missingColor: true }))
    dialog.open = 'IN/partial.kux'

    const result = await execute('style.importKuReplace')
    expect(result.ok).toBe(true)

    const index = readValue(await styleIndexWriter.read())
    const color = String(index.list[0].color)
    expect(fsMock.files.has(`${USER}/${color}`)).toBe(false)
  })

  /**
   * TD-09-22：`.bak` 写失败必须**中止导入**。
   *
   * 旧实现把 `writeBase64File(<.bak>)` 的 `false` 丢掉、继续写本体 ——
   * 真实文件系统上可复现（`.bak` 这个路径被目录占住 → EISDIR，本体照样写得进去）：
   * 结果是「导入报成功 / 原件已覆盖 / `.bak` 不存在 / 日志一行都没有」。
   */
  it('写文件失败 → 索引不动，已写的新文件回滚', async () => {
    fsMock.files.set('IN/one.kux', containerText('导入仓库'))
    dialog.open = 'IN/one.kux'
    fsMock.failWrite = true

    const result = await execute('style.importKuReplace')
    expect(result.ok).toBe(false)
    // 1a：写失败早一步中止——`.bak` 写不出来就**不碰原件**（TD-09-22），
    // 所以现在的失败点是「备份原文件失败」，比旧版「写本体失败」更靠前、原件未受损
    expect(result.ok === false && result.reason).toMatch(/备份原文件失败|写入文件失败/)

    const index = readValue(await styleIndexWriter.read())
    expect(index.list.map((item) => item.name)).toEqual(['默认仓库'])
    expect(fsMock.files.has(LIB.color)).toBe(true)
  })

  it('用户取消对话框 → 失败但不动任何文件', async () => {
    dialog.open = null
    const before = new Map(fsMock.files)
    const result = await execute('style.importKuReplace')

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toBe('取消操作')
    expect(fsMock.files).toEqual(before)
  })
})
