import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 字体标签 / 评分的导入导出（T-51）。
 *
 * 四条 P0 各有一条钉死：
 * 1. **先校验后写**——形状不对时失败，且**一个字都不写**（标签/评分文件都不动）；
 * 2. **覆盖写要 `.bak` 真落盘**——导入后 `<file>.bak` 里是导入前的原文；
 * 3. **取消对话框不写盘**——`onConfirm` 返回 false 时两个文件都不动；
 * 4. **星级混用类型别丢**——`"3"` 与 `2` 并存时，导入与导出都原样保留。
 *
 * 走真实的 `fileRepo`（只 mock 磁盘与对话框），所以 `.bak` 落盘是真的落盘，
 * 不是替身自称落了。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
}))

const dialog = vi.hoisted(() => ({ open: null as string | null, save: null as string | null }))

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => 'ROAM/SheJiZhuLi',
  readTextSmart: async (path: string) => fsMock.files.get(path) ?? null,
  // T-105：写路径改用三态读；这个假 fs 没有"读不出"的场景，只会 ok / missing
  readTextOutcome: async (path: string) => {
    const text = fsMock.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  readTextSync: (path: string) => fsMock.files.get(path) ?? null,
  writeTextFile: (path: string, text: string) => {
    fsMock.files.set(path, text)
  },
  writeTextFileAtomic: (path: string, text: string) => {
    fsMock.files.set(path, text)
    return true
  },
  saveExportedText: (path: string, text: string) => {
    fsMock.files.set(path, text)
  },
  removeFile: (path: string) => {
    fsMock.files.delete(path)
    return true
  },
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

const USER = 'ROAM/SheJiZhuLi'
const TAGS = `${USER}/sj_ztglTags.ini`
const STARS = `${USER}/sj_ztglStar.ini`

/** 原文件的实况：标签是数组，星级里 `"3"` 与 `2` 混用 */
const OLD_TAGS = JSON.stringify([
  { text: '中-黑', xz: false, arr: ['微软雅黑'] },
  { text: '英-宋', xz: false, arr: ['Verdana'] },
])
const OLD_STARS = JSON.stringify([
  { name: 'OPPOSans', star: '3' },
  { name: 'Verdana', star: 2 },
])

beforeEach(() => {
  fsMock.files.clear()
  dialog.open = null
  dialog.save = null
  fsMock.files.set(TAGS, OLD_TAGS)
  fsMock.files.set(STARS, OLD_STARS)
})

describe('font.importTags', () => {
  it('合法文件 → 覆盖写标签与评分，`.bak` 里是导入前的原文', async () => {
    dialog.open = '/tmp/in.json'
    fsMock.files.set(
      '/tmp/in.json',
      JSON.stringify({
        tags: [{ text: '新标签', xz: false, arr: ['MiSans'] }],
        stars: [{ name: 'MiSans', star: 3 }],
      }),
    )

    await expect(execute('font.importTags', {})).resolves.toEqual({ ok: true })

    expect(JSON.parse(fsMock.files.get(TAGS)!)).toEqual([
      { text: '新标签', xz: false, arr: ['MiSans'] },
    ])
    expect(JSON.parse(fsMock.files.get(STARS)!)).toEqual([{ name: 'MiSans', star: 3 }])

    // `.bak` 真落盘：内容是导入前的原文
    expect(fsMock.files.get(`${TAGS}.bak`)).toBe(OLD_TAGS)
    expect(fsMock.files.get(`${STARS}.bak`)).toBe(OLD_STARS)
  })

  it('形状不对 → 失败，且标签与评分文件一个字都没动', async () => {
    dialog.open = '/tmp/bad.json'
    fsMock.files.set('/tmp/bad.json', '{oops')

    await expect(execute('font.importTags', {})).resolves.toMatchObject({ ok: false })

    expect(fsMock.files.get(TAGS)).toBe(OLD_TAGS)
    expect(fsMock.files.get(STARS)).toBe(OLD_STARS)
    // 没写过就没有 `.bak`
    expect(fsMock.files.has(`${TAGS}.bak`)).toBe(false)
  })

  it('标签项缺 text → 失败，不写盘（先校验后写）', async () => {
    dialog.open = '/tmp/bad2.json'
    fsMock.files.set('/tmp/bad2.json', JSON.stringify({ tags: [{ xz: false, arr: [] }] }))

    const result = await execute('font.importTags', {})

    expect(result).toMatchObject({ ok: false })
    expect(fsMock.files.get(TAGS)).toBe(OLD_TAGS)
  })

  it('取消确认 → 不写盘', async () => {
    dialog.open = '/tmp/in.json'
    fsMock.files.set(
      '/tmp/in.json',
      JSON.stringify({ tags: [{ text: '新标签', xz: false, arr: [] }] }),
    )

    // 取消走失败通道（红色 toast）——与 `action.importWarehouse` / `style.pickColorToGroup` 同口径
    await expect(
      execute('font.importTags', { onConfirm: async () => false }),
    ).resolves.toMatchObject({ ok: false, reason: '取消操作' })

    expect(fsMock.files.get(TAGS)).toBe(OLD_TAGS)
    expect(fsMock.files.has(`${TAGS}.bak`)).toBe(false)
  })

  it('取消文件对话框 → 不写盘', async () => {
    dialog.open = null

    await expect(execute('font.importTags', {})).resolves.toMatchObject({ ok: false })

    expect(fsMock.files.get(TAGS)).toBe(OLD_TAGS)
  })

  it('星级混用类型不丢：字符串 "3" 与数字 2 原样写入', async () => {
    dialog.open = '/tmp/in.json'
    fsMock.files.set(
      '/tmp/in.json',
      JSON.stringify({
        tags: [{ text: '标签', xz: false, arr: [] }],
        stars: [
          { name: 'OPPOSans', star: '3' },
          { name: 'Verdana', star: 2 },
        ],
      }),
    )

    await expect(execute('font.importTags', {})).resolves.toEqual({ ok: true })

    // 逐字比对：不能被规范化成全数字或全字符串
    expect(fsMock.files.get(STARS)).toBe(
      '[{"name":"OPPOSans","star":"3"},{"name":"Verdana","star":2}]',
    )
  })

  it('纯标签数组 → 只覆盖标签，评分不动', async () => {
    dialog.open = '/tmp/tags-only.json'
    fsMock.files.set(
      '/tmp/tags-only.json',
      JSON.stringify([{ text: '只有标签', xz: false, arr: [] }]),
    )

    await expect(execute('font.importTags', {})).resolves.toEqual({ ok: true })

    expect(JSON.parse(fsMock.files.get(TAGS)!)).toEqual([{ text: '只有标签', xz: false, arr: [] }])
    expect(fsMock.files.get(STARS)).toBe(OLD_STARS)
    // 评分没被覆盖 → 没有它的 `.bak`
    expect(fsMock.files.has(`${STARS}.bak`)).toBe(false)
  })
})

describe('font.exportTags', () => {
  it('导出标签与评分，不含字体文件；`star` 类型原样带走', async () => {
    dialog.save = '/tmp/out.json'

    await expect(execute('font.exportTags', {})).resolves.toEqual({ ok: true })

    const written = fsMock.files.get('/tmp/out.json')!
    expect(JSON.parse(written)).toEqual({
      tags: [
        { text: '中-黑', xz: false, arr: ['微软雅黑'] },
        { text: '英-宋', xz: false, arr: ['Verdana'] },
      ],
      stars: [
        { name: 'OPPOSans', star: '3' },
        { name: 'Verdana', star: 2 },
      ],
    })
    // 逐字比对：不能把 "3" 变成 3
    expect(written).toContain('"star":"3"')
    expect(written).toContain('"star":2')
  })

  it('取消确认 → 不弹保存对话框、不写盘', async () => {
    dialog.save = '/tmp/out.json'

    await expect(
      execute('font.exportTags', { onConfirm: async () => false }),
    ).resolves.toMatchObject({ ok: false, reason: '取消操作' })

    expect(fsMock.files.has('/tmp/out.json')).toBe(false)
  })

  it('取消保存对话框 → 不写盘', async () => {
    dialog.save = null

    await expect(execute('font.exportTags', {})).resolves.toMatchObject({ ok: false })

    expect(fsMock.files.has('/tmp/out.json')).toBe(false)
  })
})
