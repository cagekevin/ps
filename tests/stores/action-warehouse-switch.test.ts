import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DATA_FILES } from '@/cep/env'

/**
 * **切换动作仓库后，动作列表必须换成新仓库的内容。**
 *
 * 为什么单立这一条：`stores/action.ts` 只靠两个订阅刷新 ——
 *   `actionLibraryRepo.onChange → applyLibrary`（库内容）
 *   `actionIndexRepo.onChange   → applyIndex`（仓库列表）
 * 而 `applyIndex` 只做「换 warehouses / 换 activeIndex / 切 Repo 路径」，
 * **不重读库内容**；`selectActionFile` 也只改一个 `currentFile` 变量、不 emit。
 * 于是"切仓库"只触发了 index 那一路 ⇒ 仓库名变了、动作列表可能还是上一个仓库的。
 *
 * 这条测试就是那个不变量的**唯一凭证**：它绿，说明 `applyIndex` 里重读了库；
 * 它红，说明用户切完仓库看到的还是旧动作。
 *
 * 环境：`@/cep/node` 打桩到真实 `fs`，`userDir()` 指到 `mkdtemp` 临时目录，
 * 数据层 / store 全走真实实现（不 mock repo）。
 */
const tmp = vi.hoisted(() => ({ dir: '' }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
  nodeRequire: (id: string) =>
    id === 'fs' ? fs : id === 'path' ? path : id === 'buffer' ? { Buffer } : undefined,
  toPosix: (p: string) => p,
}))

vi.mock('@/cep/paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/paths')>()
  return { ...actual, userDir: () => tmp.dir }
})

// 关键：`dataRepo` 在 `hasCep()` 为 false 时走 `memoryRepo(seed)`（永远 SEED、不落盘）。
// 测试要的是**真实 fileRepo**，所以这里必须报"在 CEP 里"。
vi.mock('@/cep/transport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/cep/transport')>()
  return { ...actual, hasCep: () => true }
})

const { selectWarehouse } = await import('@/cep/data/actions')
const { bindActionData, useActionStore } = await import('@/stores/action')

const INDEX_FILE = () => path.join(tmp.dir, DATA_FILES.actionLibrary)
const libFile = (name: string) => path.join(tmp.dir, name)

function group(name: string) {
  return { groupName: name, show: true, list: [{ group: name, name: `${name}-动作` }] }
}

beforeEach(() => {
  tmp.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-action-'))
  fs.writeFileSync(
    INDEX_FILE(),
    JSON.stringify({
      index: 0,
      list: [
        { name: '仓库一', fileName: 'sj_dz_a.json' },
        { name: '仓库二', fileName: 'sj_dz_b.json' },
      ],
    }),
    'utf8',
  )
  fs.writeFileSync(libFile('sj_dz_a.json'), JSON.stringify([group('A组')]), 'utf8')
  fs.writeFileSync(libFile('sj_dz_b.json'), JSON.stringify([group('B组')]), 'utf8')
  setActivePinia(createPinia())
})

afterAll(() => {
  fs.rmSync(tmp.dir, { recursive: true, force: true })
})

describe('切换动作仓库', () => {
  it('切到仓库二后，动作列表换成仓库二的内容（不是上一个仓库的）', async () => {
    bindActionData()
    const store = useActionStore()

    await store.load()
    expect(store.groups.map((g) => g.groupName)).toEqual(['A组'])

    selectWarehouse(1)

    // 选中态跟着变（这条一直是对的：`applyIndex` 会跑）
    expect(store.isActiveWarehouse(1)).toBe(true)
    // 动作内容也必须跟着变 —— 这是本文件存在的理由
    expect(store.groups.map((g) => g.groupName)).toEqual(['B组'])
  })
})
