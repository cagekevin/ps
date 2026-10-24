import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * T-105：读取原语必须是**三态**（`ok` / `notSeen` / `error`）。
 *
 * 以前 `readTextViaJsx` 的脚本在 `fs.ts:274` 就把「文件不存在」单独标出来了，
 * 下一行 `startsWith(ERR_PREFIX) → null` 又把它和别的错误一起压成 `null`；
 * `readTextFile` 的 `catch → null` 同样。于是 `file-repo` 分不出
 * 「首次使用」和「读不到」，D-42（读坏禁止写）对「读不到」整个失效。
 *
 * 这个文件**不 mock** `@/cep/fs`：给真实实现装上 `window.require` / `window.__adobe_cep__`，
 * 测的是真代码，只把 node:fs 和 ExtendScript 换成假的。
 */
const realFs = {
  exists: true,
  text: '{}' as string,
  error: '' as string,
}

const fakeFs = {
  existsSync: () => realFs.exists,
  readFileSync: () => {
    if (realFs.error) throw new Error(realFs.error)
    return realFs.text
  },
}

/** ExtendScript 的返回值：由用例直接决定（模拟 `File` 读不到 / 不存在） */
const jsx = { reply: '' }

function installNode() {
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => {
    if (id !== 'fs') throw new Error(`用例没准备 ${id}`)
    return fakeFs
  }
}

function installCep() {
  const w = window as unknown as {
    __adobe_cep__?: { evalScript: (script: string, cb: (res: string) => void) => void }
  }
  w.__adobe_cep__ = { evalScript: (_script, cb) => cb(jsx.reply) }
}

function clearBridges() {
  delete (window as unknown as { require?: unknown }).require
  delete (window as unknown as { __adobe_cep__?: unknown }).__adobe_cep__
}

const { combineReads, readTextOutcome } = await import('@/cep/fs')

beforeEach(() => {
  realFs.exists = true
  realFs.text = '{}'
  realFs.error = ''
  jsx.reply = ''
})

afterEach(() => {
  clearBridges()
})

describe('readTextOutcome · Node 路', () => {
  it('读到了 → ok + 原文', async () => {
    installNode()

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'ok', text: '{}' })
  })

  it('查不到文件 → notSeen（观测，不是"不存在"的结论）', async () => {
    installNode()
    realFs.exists = false

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'notSeen' })
  })

  it('文件存在但读不出 → error，reason 带系统错误原文', async () => {
    installNode()
    realFs.error = 'EACCES: permission denied, open /tmp/a.json'

    const outcome = await readTextOutcome('/tmp/a.json')

    expect(outcome.status).toBe('error')
    expect(outcome.status === 'error' ? outcome.reason : '').toContain('EACCES')
  })

  it('「不存在」与「读不到」的 status 必须不同（压成两态就是 T-105 的根因）', async () => {
    installNode()
    realFs.exists = false
    const notSeen = await readTextOutcome('/tmp/a.json')

    realFs.exists = true
    realFs.error = 'EPERM: operation not permitted'
    const broken = await readTextOutcome('/tmp/a.json')

    expect(notSeen.status).not.toBe(broken.status)
  })
})

describe('readTextOutcome · jsx 路（Node 不可用）', () => {
  it('脚本标的「文件不存在」→ notSeen，不跟别的错误混', async () => {
    installCep()
    jsx.reply = `${ERR_PREFIX}文件不存在: /tmp/a.json`

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'notSeen' })
  })

  it('脚本里的其它错误 → error，reason 是 e.message 原文', async () => {
    installCep()
    jsx.reply = `${ERR_PREFIX}拒绝访问`

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({
      status: 'error',
      reason: '拒绝访问',
    })
  })

  it('两条路都说不存在才算 notSeen', async () => {
    installNode()
    installCep()
    realFs.exists = false
    jsx.reply = `${ERR_PREFIX}文件不存在: /tmp/a.json`

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'notSeen' })
  })

  it('Node 说读不到、jsx 说不存在 → 仍报 error（宁可报错，不许降级成首次使用）', async () => {
    installNode()
    installCep()
    realFs.error = 'EBUSY: resource busy or locked'
    jsx.reply = `${ERR_PREFIX}文件不存在: /tmp/a.json`

    const outcome = await readTextOutcome('/tmp/a.json')

    expect(outcome.status).toBe('error')
    expect(outcome.status === 'error' ? outcome.reason : '').toContain('EBUSY')
  })
})

/**
 * `combineReads` 是**策略**，不是观测（ADR-26 ② / 乙区 2）。
 *
 * 它只能留在原语层——数据层看不到"有两个来源"这件事——所以必须具名、可测、注释写明是策略，
 * 不许再往里塞别的规则。这几条钉的就是那一条策略本身。
 */
describe('combineReads · 多来源优先级（策略）', () => {
  it('jsx 读到内容就赢（Node 看不到也算读到了）', () => {
    expect(combineReads({ status: 'notSeen' }, { status: 'ok', text: 'x' })).toEqual({
      status: 'ok',
      text: 'x',
    })
  })

  it('Node 说读不到、jsx 说查不到 → 报 error（宁可报错，不许降级成首次使用）', () => {
    const outcome = combineReads({ status: 'error', reason: 'EACCES' }, { status: 'notSeen' })
    expect(outcome.status).toBe('error')
    expect(outcome.status === 'error' ? outcome.reason : '').toBe('EACCES')
  })

  it('两条都说查不到 → notSeen（这时才算"没有这个文件"）', () => {
    expect(combineReads({ status: 'notSeen' }, { status: 'notSeen' })).toEqual({
      status: 'notSeen',
    })
  })

  it('Node 不可用（null）时不造 error：jsx 说了算', () => {
    expect(combineReads(null, { status: 'notSeen' })).toEqual({ status: 'notSeen' })
  })
})
