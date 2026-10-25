import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyFreePanel, type FreePanelFile } from '@/domain/free-panel'
import type { Repo } from '@/cep/data/types'

/**
 * T-99-2 / D-40：自由面板投影里的 `degraded`。
 *
 * 钉一条：**读坏时业务层拿到的是空列表**（不是 fallback 的空区域），且 `degraded` 有值——
 * 页面靠它把"文件坏了"显示出来，而不是显示成"面板是空的"。
 *
 * 真实接线（磁盘 → `file-repo` → 归一器 → `degraded`）在 `tests/data/free-panel-repo.test.ts`，
 * 这里只钉投影这一层，所以把 repo 换成假对象。
 */

// 类型参数不是装饰：`vi.fn()` 不写参数时 `mockResolvedValue` 收 `any`，
// 旧形状 `{ value, degraded }` / 漏 `ok` 都能编译过，运行时静默走失败分支。
const repo = vi.hoisted(() => ({
  read: vi.fn<Repo<FreePanelFile>['read']>(),
  onChange: vi.fn(),
}))

vi.mock('@/cep/data/free-panel', () => ({ freePanelRepo: repo, freePanelWriter: repo }))

const { useFreePanelStore } = await import('@/stores/free-panel')

const block = {
  id: 1,
  zIndex: 0,
  showIcon: false,
  showNumber: 2,
  showText: true,
  type: 'norow',
  children: [],
  data: [],
}

beforeEach(() => {
  setActivePinia(createPinia())
  repo.read.mockReset()
})

describe('free-panel store · degraded', () => {
  it('读坏时 blocks 为空列表，degraded 带原因', async () => {
    repo.read.mockResolvedValue({
      ok: false,
      reason: '内容结构不认识',
      // 坏读臂必带默认值（T-102）。本条要钉的正是"投影**不**用这个默认区域"（`stores/free-panel.ts:26`）
      fallback: createEmptyFreePanel(),
    })

    const store = useFreePanelStore()
    await store.load()

    expect(store.degraded).toBe('内容结构不认识')
    expect(store.blocks).toEqual([])
  })

  it('正常读取时 blocks 是文件里的区域，degraded 为空', async () => {
    repo.read.mockResolvedValue({
      ok: true,
      value: { uid: 1, btnId: 0, obj: { version: '1.0', type: 'row', list: [block] } },
    })

    const store = useFreePanelStore()
    await store.load()

    expect(store.degraded).toBe('')
    expect(store.blocks).toHaveLength(1)
  })
})
