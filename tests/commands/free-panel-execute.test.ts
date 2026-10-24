import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { readValue } from '../support/repo-read'

/**
 * `freePanel.execute` 的嵌套执行（D-33）与区域 id 分配（D-38 / D-39）。
 *
 * 两个点值得单独测：
 * 1. 子命令**复用**父命令刚刷过的选区快照（不二次 refresh），但失败时 `code` 必须原样透传。
 *    以前 `throw new CepError('JSX', result.reason)` 把 code 写成死值，`useCommand` 里
 *    "FONT_MISSING 交给页面弹确认、不当普通错误提示"那条分支就永远走不到。
 * 2. 区域 id 不复用：`uid` 落后于 `max(id)`（旧文件、别的面板写的文件、以前的清空逻辑）时，
 *    `uid += 1` 会给出一个已经被占用的 id。
 */
const selection = vi.hoisted(() => {
  const snapshot = { hasSelection: false, typeNumber: 0 }
  return {
    snapshot,
    refresh: vi.fn(async () => snapshot),
  }
})

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(async () => 'ok'), getActionList: vi.fn() },
  font: { setFontName: vi.fn(async () => 'ok'), setNumberSize: vi.fn(async () => 'ok') },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/selection', () => ({
  refresh: selection.refresh,
  current: () => selection.snapshot,
  selectionRef: { value: selection.snapshot },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const { execute, get, register } = await import('@/commands/registry')
const { freePanelRepo } = await import('@/cep/data/free-panel')
const { createEmptyFreePanel } = await import('@/domain/free-panel')
const { useCommand } = await import('@/components/command/useCommand')
const { useFeedbackStore } = await import('@/stores/feedback')
const { CepError } = await import('@/utils/errors')

let pinia: Pinia

beforeEach(async () => {
  pinia = createPinia()
  setActivePinia(pinia)
  selection.refresh.mockClear()
  vi.clearAllMocks()
  await freePanelRepo.write(createEmptyFreePanel())
})

/** 往 block 1 里放一条旧自由面板项（key 走 `domain/free-panel-legacy` 的映射表） */
async function putItem(key: string, option: unknown = null, btnId = 1) {
  const file = createEmptyFreePanel()
  file.obj.list[0].data.push({
    icon: '',
    type: '',
    key,
    btnId,
    text: key,
    funcText: '',
    option,
    left: '',
    top: '',
    position: false,
  })
  await freePanelRepo.write(file)
}

/** 临时把某条命令换成"必抛某 code"的假实现，跑完还原 */
async function withFailingCommand(
  id: string,
  code: string,
  reason: string,
  body: () => Promise<void>,
) {
  const original = get(id)
  if (!original) throw new Error(`命令不存在：${id}`)
  register({
    ...original,
    async run() {
      throw new CepError(code as never, reason)
    },
  })
  try {
    await body()
  } finally {
    register(original)
  }
}

describe('freePanel.execute 嵌套执行（D-33）', () => {
  it('只刷新一次选区：子命令复用父命令的快照', async () => {
    await putItem('dz_useAction', { group: '修图', name: '磨皮' })
    selection.refresh.mockClear()

    const result = await execute('freePanel.execute', { blockId: 1, btnId: 1 })

    expect(result).toEqual({ ok: true })
    expect(selection.refresh).toHaveBeenCalledTimes(1)
    expect(jsx.action.callAction).toHaveBeenCalledTimes(1)
  })

  it('子命令的 requires 仍按快照检查（不刷新，但也不跳过）', async () => {
    // zt_setFontSize → fontSet.fontSize，requires: 'layer'；快照里没有选区
    await putItem('zt_setFontSize', 24)
    selection.refresh.mockClear()

    const result = await execute('freePanel.execute', { blockId: 1, btnId: 1 })

    expect(result).toMatchObject({ ok: false, reason: '请先选择一个图层' })
    expect(selection.refresh).toHaveBeenCalledTimes(1)
  })

  it('子命令失败时 code 原样透传（不能被冲成 JSX）', async () => {
    await putItem('dz_useAction', { group: '修图', name: '磨皮' })

    await withFailingCommand('action.call', 'FONT_MISSING', '字体缺失', async () => {
      const result = await execute('freePanel.execute', { blockId: 1, btnId: 1 })
      expect(result).toMatchObject({ ok: false, code: 'FONT_MISSING', reason: '字体缺失' })
    })
  })

  it('useCommand：FONT_MISSING 不弹 error toast（留给页面弹下载确认）', async () => {
    await putItem('dz_useAction', { group: '修图', name: '磨皮' })
    const feedback = useFeedbackStore()
    feedback.clear()

    await withFailingCommand('action.call', 'FONT_MISSING', '字体缺失', async () => {
      const ok = await useCommand('freePanel.execute').run({ blockId: 1, btnId: 1 })
      expect(ok).toBe(false)
      expect(feedback.toasts).toHaveLength(0)
    })
  })

  it('useCommand：其他失败照常弹 error（对照，证明上一条不是"什么都不弹"）', async () => {
    const feedback = useFeedbackStore()
    feedback.clear()

    // 区域不存在 → PARSE，没有 FONT_MISSING 语义
    const ok = await useCommand('freePanel.execute').run({ blockId: 999, btnId: 1 })

    expect(ok).toBe(false)
    expect(feedback.toasts.map((toast) => toast.type)).toEqual(['error'])
  })
})

describe('区域 id 分配（D-38 / D-39）', () => {
  it('clear 不复位 uid，新工作区的 id 也不复用旧 id', async () => {
    await execute('freePanel.addBlock', { type: 'norow' })
    await execute('freePanel.addBlock', { type: 'norow' })

    // 数字立刻取出来：测试环境走 memoryRepo，读出来的是同一份对象引用，clear 会把它的 uid 改掉
    const beforeUid = readValue(await freePanelRepo.read()).uid
    expect(beforeUid).toBe(3)

    await execute('freePanel.clear', {})

    const after = readValue(await freePanelRepo.read())
    expect(after.obj.list).toHaveLength(1)
    expect(after.uid).toBeGreaterThan(beforeUid)
    expect(after.obj.list[0].id).toBeGreaterThan(beforeUid)
  })

  it('uid 落后于 max(id) 时新增区域取 max(id)+1，不产生重复 id', async () => {
    const file = createEmptyFreePanel()
    file.uid = 1 // 故意落后：旧文件 / 别的面板写过的文件都可能这样
    file.obj.list.push({ ...file.obj.list[0], id: 7, data: [] })
    await freePanelRepo.write(file)

    await execute('freePanel.addBlock', { type: 'norow' })

    const next = readValue(await freePanelRepo.read())
    expect(next.obj.list.map((block) => block.id)).toEqual([1, 7, 8])
    expect(next.uid).toBe(8)
  })

  it('删到空时的兜底区域也用新 id', async () => {
    const file = createEmptyFreePanel()
    file.uid = 5
    file.obj.list[0].id = 5
    await freePanelRepo.write(file)

    await execute('freePanel.removeBlock', { blockId: 5 })

    const next = readValue(await freePanelRepo.read())
    expect(next.obj.list).toHaveLength(1)
    expect(next.obj.list[0].id).toBe(6)
    expect(next.uid).toBe(6)
  })

  it('连续 addBlock 的 id 严格递增（不回头吃已删掉的 id）', async () => {
    await execute('freePanel.addBlock', { type: 'norow' }) // 2
    await execute('freePanel.removeBlock', { blockId: 2 })
    await execute('freePanel.addBlock', { type: 'norow' }) // 3

    const next = readValue(await freePanelRepo.read())
    expect(next.obj.list.map((block) => block.id)).toEqual([1, 3])
  })
})
