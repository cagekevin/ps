import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * TD-12-22：`CommandOutcome.ok === 'cancelled'` 这条臂必须**真的有产出、也真的有消费**。
 *
 * 以前它是死码：全仓没有一处产出，于是"用户点了取消"被写成 PARSE（吸色）/ NETWORK（云同步），
 * `useCommand` 拿它当失败弹出来——用户自己按的「取消」，界面回他一句故障。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))
const cloud = vi.hoisted(() => ({
  engine: {
    getStatus: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    pushUnits: vi.fn(),
  },
  queue: { pendingUnits: () => [], busy: () => false },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({
  jsx: {
    font: {},
    layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
    env: { setEnv: vi.fn() },
    action: {},
    style: {},
    rename: {},
    legacy: {},
    commonUse: {},
  },
}))
vi.mock('@/cep/cloud/setup', () => ({ cloudEngine: cloud.engine, cloudSyncQueue: cloud.queue }))

await import('@/commands')
const { CepError } = await import('@/utils/errors')
const { execute, register } = await import('@/commands/registry')
const { useCommand } = await import('@/components/command/useCommand')
const { useFeedbackStore } = await import('@/stores/feedback')
const { log } = await import('@/utils/logger')

/**
 * 不清空注册表：`@/commands` 在文件顶部已经把真命令注册好了（`cloud.download` 要用），
 * 清掉就等于把被测对象删了。测试用唯一 id，不与真命令撞。
 */
register({
  id: 'test.cancel',
  title: '会被取消的命令',
  group: 'system',
  requires: 'none',
  kind: 'instant',
  async invoke() {
    throw new CepError('CANCELLED', '用户取消了')
  },
})

beforeEach(() => {
  setActivePinia(createPinia())
  // logger 的清场用「模块重载」做（`vi.resetModules()` 放在文件顶部，见下），
  // 所以这里不再有专门的清场函数 —— logger 的导出面只有 `log` 一个东西。
  vi.clearAllMocks()
})

describe('取消臂：产出点', () => {
  it('命令抛 CANCELLED → 结果是 ok:cancelled，不是 ok:false', async () => {
    const result = await execute('test.cancel')

    expect(result).toEqual({ ok: 'cancelled' })
  })

  it('取消记 info，不记 warn（它不是失败）', async () => {
    await execute('test.cancel')

    const dumped = log.dump()
    expect(dumped).toContain('已被用户取消')
    expect(dumped).not.toContain('失败')
  })

  it('云同步：引擎回 cancelled（用户在确认框点了取消）→ ok:cancelled', async () => {
    cloud.engine.download.mockResolvedValue({
      ok: false,
      count: 0,
      hasCloud: true,
      cancelled: true,
      error: '取消操作',
    })

    const result = await execute('cloud.download', {
      onConfirm: async () => ({ ok: true, data: true }),
    })

    expect(result).toEqual({ ok: 'cancelled' })
  })
})

describe('取消臂：消费点', () => {
  it('useCommand 遇到 cancelled 不弹失败提示', async () => {
    const feedback = useFeedbackStore()
    feedback.clear()
    const cmd = useCommand('test.cancel')

    const ok = await cmd.invoke()

    expect(ok).toBe(false)
    expect(feedback.toasts).toHaveLength(0)
  })

  it('对照：普通失败照常弹（证明上一条不是"什么都不弹"）', async () => {
    register({
      id: 'test.fail',
      title: '会失败的命令',
      group: 'system',
      requires: 'none',
      kind: 'instant',
      async invoke() {
        throw new CepError('JSX', '脚本炸了')
      },
    })
    const feedback = useFeedbackStore()
    feedback.clear()

    await useCommand('test.fail').invoke()

    expect(feedback.toasts).toHaveLength(1)
  })
})
