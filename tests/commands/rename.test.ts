import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SEED } from '../helpers/cas-seed'
import { createPinia, setActivePinia } from 'pinia'
import type { RenamePreset } from '@/domain/rename'
import { readValue } from '../support/repo-read'

/**
 * 重命名排序命令 —— 落点计算已收口到 `domain/reorder.ts`（T-67）。
 *
 * 这里只验命令层还欠的三件事：
 * 1. 第 0 组「最近使用」不可拖（台账 T-67 判据④）；
 * 2. `position` 那个布尔原样透传，四分支不在命令里重写；
 * 3. 被拖组折叠随同一次写盘落下（照 `/style` 范本；判据未点名，标 UNVERIFIED）。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const { execute } = await import('@/commands/registry')
const { renameWriter } = await import('@/cep/data/rename')

function seed(): RenamePreset {
  return [
    { name: '最近使用', show: false, list: ['%n背景层', '收%nn'] },
    { name: '序列', show: true, list: ['%n', '%%n'] },
    { name: '第二组', show: true, list: ['收%nn'] },
  ]
}

async function read(): Promise<RenamePreset> {
  return readValue(await renameWriter.read())
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  await renameWriter.replace(seed(), SEED)
})

describe('rename.reorderGroup（组排序）', () => {
  it('组 2 拖到组 1 之前 → 最近使用 / 第二组 / 序列', async () => {
    await expect(
      execute('rename.reorderGroup', { from: 2, to: 1, position: 'before' }),
    ).resolves.toEqual({ ok: true })

    expect((await read()).map((group) => group.name)).toEqual(['最近使用', '第二组', '序列'])
  })

  it('被拖组落盘后折叠（照 /style 范本）', async () => {
    await execute('rename.reorderGroup', { from: 2, to: 1, position: 'before' })

    expect((await read())[1]).toMatchObject({ name: '第二组', show: false })
  })

  it('第 0 组不可拖：from 0 或 to 0 都失败，文件不变', async () => {
    await expect(
      execute('rename.reorderGroup', { from: 0, to: 1, position: 'after' }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      execute('rename.reorderGroup', { from: 1, to: 0, position: 'before' }),
    ).resolves.toMatchObject({ ok: false })

    expect((await read()).map((group) => group.name)).toEqual(['最近使用', '序列', '第二组'])
  })
})

describe('rename.reorderItem（项排序）', () => {
  it('同组内往后拖：先删后插，目标下标补偿一位', async () => {
    await expect(
      execute('rename.reorderItem', {
        fromGroup: 1,
        fromIndex: 0,
        toGroup: 1,
        toIndex: 1,
        position: 'after',
      }),
    ).resolves.toEqual({ ok: true })

    expect((await read())[1].list).toEqual(['%%n', '%n'])
  })

  it('跨组拖动会移动条目', async () => {
    await execute('rename.reorderItem', {
      fromGroup: 2,
      fromIndex: 0,
      toGroup: 1,
      toIndex: 0,
      position: 'after',
    })

    const preset = await read()
    expect(preset[1].list).toEqual(['%n', '收%nn', '%%n'])
    expect(preset[2].list).toEqual([])
  })

  it('第 0 组不可作为源或落点', async () => {
    await expect(
      execute('rename.reorderItem', {
        fromGroup: 0,
        fromIndex: 0,
        toGroup: 1,
        toIndex: 0,
        position: 'before',
      }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      execute('rename.reorderItem', {
        fromGroup: 1,
        fromIndex: 0,
        toGroup: 0,
        toIndex: 0,
        position: 'before',
      }),
    ).resolves.toMatchObject({ ok: false })

    expect((await read())[0].list).toEqual(['%n背景层', '收%nn'])
  })
})
