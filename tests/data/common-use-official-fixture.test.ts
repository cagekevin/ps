import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readValue } from '../support/repo-read'

/**
 * T-94：用**官方真实文件**当 fixture 验根形状。
 *
 * 为什么必须用真文件：以前的测试用我方自己生成的 `{ info: [...] }` 当 fixture，
 * 于是"测试自己证明自己"——根形状错了也全绿，真机上官方文件读不出 14 项，页面显示空态。
 *
 * fixture 来源：`%APPDATA%/SheJiZhuLi/sj_commonFunction.json`（3489 字节，根是数组，14 项）。
 */

const state = vi.hoisted(() => ({ files: new Map<string, string>() }))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))

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
}))

const PATH = '/user/sj_commonFunction.json'
const OFFICIAL = readFileSync(
  resolve(__dirname, '../fixtures/sj_commonFunction.official.json'),
  'utf8',
)

const { commonUseRepo } = await import('@/cep/data/common-use')
const { toTiles } = await import('@/domain/common-use')

function disk(): unknown {
  return JSON.parse(state.files.get(PATH) ?? 'null')
}

beforeEach(() => {
  state.files.clear()
  state.files.set(PATH, OFFICIAL)
})

describe('官方真实文件（fixture）', () => {
  it('fixture 本身：3489 字节量级、根是数组、14 项、cya12 在最后', () => {
    const parsed = JSON.parse(OFFICIAL) as Array<{ id: string }>
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(14)
    expect(parsed[13].id).toBe('div_img_cya12')
  })

  it('读官方文件 → 14 项（页面不会再是空态）', async () => {
    const read = await commonUseRepo.read()
    const tiles = toTiles(readValue(read))

    expect(tiles).toHaveLength(14)
    expect(tiles[0].name).toBe('嵌入图片')
    expect(tiles.map((t) => t.index)).toEqual(Array.from({ length: 14 }, (_, i) => i))
  })

  it('写回（显隐）后根**仍是数组**，官方读得懂；只改那一个 isShow', async () => {
    await commonUseRepo.setShow('div_img_cya3', false)

    const after = disk()
    expect(Array.isArray(after)).toBe(true)
    const items = after as Array<{ id: string; isShow?: boolean }>
    expect(items).toHaveLength(14)
    expect(items.find((i) => i.id === 'div_img_cya3')?.isShow).toBe(false)
    // 其它 13 项逐字节不变
    const before = JSON.parse(OFFICIAL) as Array<Record<string, unknown>>
    for (let i = 0; i < before.length; i += 1) {
      if (before[i].id === 'div_img_cya3') continue
      expect(JSON.stringify(items[i])).toBe(JSON.stringify(before[i]))
    }
  })

  it('写回（排序 / 重置）后根仍是数组', async () => {
    await commonUseRepo.move(0, 2, 'after')
    expect(Array.isArray(disk())).toBe(true)

    await commonUseRepo.resetAll()
    const after = disk()
    expect(Array.isArray(after)).toBe(true)
    expect((after as unknown[]).length).toBe(14)
  })

  it('旧形状 { info: [...] } 仍读得懂，且第一次写就归一成裸数组（不丢 14 项）', async () => {
    state.files.set(PATH, JSON.stringify({ info: JSON.parse(OFFICIAL) }))

    const read = await commonUseRepo.read()
    expect(toTiles(readValue(read))).toHaveLength(14)

    await commonUseRepo.setShow('div_img_cya1', false)
    const after = disk()
    expect(Array.isArray(after)).toBe(true)
    expect((after as unknown[]).length).toBe(14)
  })
})
