import { describe, expect, it, vi } from 'vitest'
import { isRecord } from '@/utils/guards'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

/**
 * T-113：`dataRepo()` 必须**在第一次使用时**才定实现，不许在模块加载时定死。
 *
 * 为什么这条值得单独一个文件：13 个仓库都在 import 期构造。只要它是急求值的
 * （`return hasCep() ? fileRepo : memoryRepo`），测试把 CEP 桥装晚一步就会静默走
 * `memoryRepo`——**永不失败**，于是"喂 EPERM 也不会红"，用例全绿但测的不是真实接线。
 * T-111 第一版就是这么绿的。
 *
 * 所以仓库必须在**模块顶层**建（照抄 `data/*.ts` 的写法），而不是在用例里现建——
 * 现建的话急求值和懒求值表现一样，测不出区别（第一版这个文件就是这么写的，白测）。
 */
const env = vi.hoisted(() => ({ cep: false }))

vi.mock('@/cep/transport', () => ({ hasCep: () => env.cep }))

const disk = vi.hoisted(() => ({ text: '{"a":1}' }))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/fs-read', () => ({
  readTextOutcome: async () => ({ status: 'ok' as const, text: disk.text }),
  readTextSync: () => ({ status: 'ok' as const, text: disk.text }),
  writeTextFile: () => undefined,
  writeTextFileAtomic: () => ({ status: 'ok' as const }),
}))

// import 时 `hasCep()` 还是 false —— 这正是急求值实现被定死的时刻
const { dataRepo } = await import('@/cep/data/data-repo')

interface Shape {
  a: number
}

/** 与 `data/*.ts` 一样：decode 是必填参数，形状不认识要说出原因（不是 `as`、也不是 `null`） */
function decodeShape(raw: unknown): Decoded<Shape> | DecodeFail {
  if (!isRecord(raw)) return shapeFail('', 'object', raw)
  if (typeof raw.a !== 'number') return shapeFail('a', 'number', raw.a)
  return { value: { a: raw.a } }
}

/** 模块顶层建仓库 = `data/*.ts` 的真实写法 */
const lateBridge = dataRepo<Shape>(
  () => '/user/x.json',
  () => ({ a: 0 }),
  decodeShape,
)
const noBridge = dataRepo<Shape>(
  () => '/user/y.json',
  () => ({ a: 0 }),
  decodeShape,
)
const fixedOnce = dataRepo<Shape>(
  () => '/user/z.json',
  () => ({ a: 0 }),
  decodeShape,
)

describe('dataRepo · 首次使用时才定实现（T-113）', () => {
  it('import 之后才装桥，仍然走文件仓库（急求值实现在这里只会给 seed）', async () => {
    env.cep = true

    const read = await lateBridge.read()

    expect(read.ok).toBe(true)
    // 文件仓库读到磁盘内容 `{a:1}`；内存仓库只会给 seed `{a:0}`
    expect(read.ok === true ? read.value : null).toEqual({ a: 1 })
  })

  it('没装桥 → 内存仓库 + dev 种子（浏览器 dev 的既有行为）', async () => {
    env.cep = false

    const read = await noBridge.read()

    expect(read.ok).toBe(true)
    expect(read.ok === true ? read.value : null).toEqual({ a: 0 })
  })

  it('同一实例只选一次：读之后装桥也不换仓库（队列 / 监听表不分裂）', async () => {
    env.cep = false
    const first = await fixedOnce.read()

    env.cep = true
    const second = await fixedOnce.read()

    expect(first.ok === true ? first.value : null).toEqual({ a: 0 })
    expect(second.ok === true ? second.value : null).toEqual({ a: 0 })
  })
})
