import { beforeEach, describe, expect, it, vi } from 'vitest'

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
}))

vi.mock('@/cep/fs', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
  readTextSmart: async (path: string) => fsMock.files.get(path) ?? null,
  writeTextFileAtomic: (path: string, text: string) => {
    if (fsMock.failAtomic) return false
    fsMock.files.set(path, text)
    return true
  },
  writeTextFile: (path: string, text: string) => {
    fsMock.files.set(path, text)
  },
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
}))

const { styleIndexRepo, addKuGroup, addKuItem, deleteKuItem, sendKuItemToSwatch } =
  await import('@/cep/data/style-library-repo')

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
})

describe('备份（ADR-12）', () => {
  it('改库前把原文复制成 <库文件>.bak，原文件被新内容覆盖', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexRepo.write(INDEX_VALUE)

    await addKuGroup('color', '新组')

    expect(fsMock.files.get(`${COLOR_LIB}.bak`)).toBe(before)
    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ name: string }>
    expect(groups.map((g) => g.name)).toEqual(['灰白', '新组'])
  })

  it('文件本来不存在（首次使用）→ 不产生空备份', async () => {
    await styleIndexRepo.write(INDEX_VALUE)

    await addKuGroup('color', '新组')

    expect(fsMock.files.has(`${COLOR_LIB}.bak`)).toBe(false)
    const groups = JSON.parse(fsMock.files.get(COLOR_LIB) ?? '[]') as Array<{ name: string }>
    expect(groups.map((g) => g.name)).toEqual(['新组'])
  })
})

describe('索引里没有库文件名：先写库文件，再补索引（照 action-archive 顺序）', () => {
  it('生成 sj_kuCol<16 位大写 hex>.json，写成功后索引才登记', async () => {
    await styleIndexRepo.write({ index: 0, list: [{ name: '新仓库' }] })

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
    const index = await styleIndexRepo.read()
    expect(index.value.list[0].color).toBe(fileName?.replace(`${USER}/`, ''))
  })

  it('写库失败（原子写返回 false）→ 抛错，索引不登记，不留半截文件', async () => {
    await styleIndexRepo.write({ index: 0, list: [{ name: '新仓库' }] })
    fsMock.failAtomic = true

    await expect(addKuGroup('color', '第一组')).rejects.toThrow('写入失败')

    const index = await styleIndexRepo.read()
    expect(index.value.list[0].color).toBeUndefined()
    expect([...fsMock.files.keys()].some((path) => path.includes('sj_kuCol'))).toBe(false)
  })
})

describe('不静默兜底', () => {
  it('库文件不是合法 JSON → 抛错，原件一个字节都不动', async () => {
    seedLib('{坏掉的')
    await styleIndexRepo.write(INDEX_VALUE)

    await expect(addKuGroup('color', '新组')).rejects.toThrow('不是合法 JSON')

    expect(fsMock.files.get(COLOR_LIB)).toBe('{坏掉的')
    expect(fsMock.files.has(`${COLOR_LIB}.bak`)).toBe(false)
  })

  it('库文件顶层不是数组 → 抛错，不覆盖', async () => {
    seedLib('{"arrFileData":[],"store":{}}')
    await styleIndexRepo.write(INDEX_VALUE)

    await expect(addKuGroup('color', '新组')).rejects.toThrow('顶层不是数组')

    expect(fsMock.files.get(COLOR_LIB)).toBe('{"arrFileData":[],"store":{}}')
  })

  it('索引里一个仓库都没有（= 索引不可用）→ 抛错，不写库文件（不猜路径、不写到别处）', async () => {
    await styleIndexRepo.write({ index: 0, list: [] })

    await expect(addKuGroup('color', '新组')).rejects.toThrow('仓库索引不可用')

    expect([...fsMock.files.keys()].some((path) => path.includes('sj_kuCol'))).toBe(false)
  })

  it('项不是对象 → 抛错，不动文件', async () => {
    const before = JSON.stringify([{ name: '灰白', show: true, list: [] }])
    seedLib(before)
    await styleIndexRepo.write(INDEX_VALUE)

    await expect(addKuItem('color', 0, 'not-an-object')).rejects.toThrow('项必须是非空对象')

    expect(fsMock.files.get(COLOR_LIB)).toBe(before)
  })
})

describe('串行队列（D-12：连点两次不能丢更新）', () => {
  it('并发两次 addKuItem 都落盘', async () => {
    seedLib(JSON.stringify([{ name: '灰白', show: true, list: [] }]))
    await styleIndexRepo.write(INDEX_VALUE)

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
    await styleIndexRepo.write(INDEX_VALUE)

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
    await styleIndexRepo.write(INDEX_VALUE)
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
    await styleIndexRepo.write(INDEX_VALUE)
    fsMock.failAtomic = true

    await expect(sendKuItemToSwatch('color', 0, 0)).rejects.toThrow('色板文件写入失败')
  })
})
