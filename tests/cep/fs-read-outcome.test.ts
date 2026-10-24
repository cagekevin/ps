import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * T-105 / T-108：读取原语必须是**三态**（`ok` / `notSeen` / `error`），而且 `notSeen` 要精确。
 *
 * T-105 把两态拆成三态，但判"查不到"用的是 `existsSync` —— 它对**存在但读不到**的文件
 * 也返回 `false`（实测本机 `C:\Windows\System32\config\SAM`：`accessSync` 报 `EPERM`，
 * `existsSync` 报 `false`），于是权限问题又被判成"首次使用"，`update` 照样能覆盖。
 * T-108 改成只认 `ENOENT`，其余错误码一律 `error`。
 *
 * 这个文件**不 mock** `@/cep/fs`：给真实实现装上 `window.require` / `window.__adobe_cep__`，
 * 测的是真代码，只把 node:fs 和 ExtendScript 换成假的。**不用真实路径**（换台机器就红）。
 */
const realFs = {
  text: '{}' as string,
  /** 非空 = `readFileSync` 抛一个带这个 `code` 的系统错误（模拟 ENOENT / EPERM / EACCES / EBUSY） */
  code: '' as string,
}

const fakeFs = {
  // T-108：实现**不许**再用 existsSync 判存在性。让它一被调用就炸，钉住这一点
  existsSync: () => {
    throw new Error('用例：实现不许再用 existsSync 判存在性（T-108）')
  },
  readFileSync: () => {
    if (realFs.code) throw Object.assign(new Error(`模拟 ${realFs.code}`), { code: realFs.code })
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
  realFs.text = '{}'
  realFs.code = ''
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

  it('ENOENT → notSeen（只有这一个码算"查不到"）', async () => {
    installNode()
    realFs.code = 'ENOENT'

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'notSeen' })
  })

  it.each(['EPERM', 'EACCES', 'EBUSY'])('%s → error，绝不许出现 notSeen', async (code) => {
    installNode()
    realFs.code = code

    const outcome = await readTextOutcome('/tmp/a.json')

    expect(outcome.status).toBe('error')
    expect(outcome.status === 'error' ? outcome.reason : '').toContain(code)
  })

  it('存在但读不到（EPERM）与查不到（ENOENT）的 status 必须不同', async () => {
    installNode()
    realFs.code = 'ENOENT'
    const absent = await readTextOutcome('/tmp/a.json')

    realFs.code = 'EPERM'
    const unreadable = await readTextOutcome('/tmp/a.json')

    expect(absent.status).not.toBe(unreadable.status)
  })

  it('实现不再依赖 existsSync（假 fs 的 existsSync 一被调用就抛）', async () => {
    installNode()
    realFs.code = 'EPERM'

    // 这条会红如果实现回退成"先 existsSync 判存在"——那正是 T-108 的缝
    await expect(readTextOutcome('/tmp/a.json')).resolves.toMatchObject({ status: 'error' })
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
    realFs.code = 'ENOENT'
    jsx.reply = `${ERR_PREFIX}文件不存在: /tmp/a.json`

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({ status: 'notSeen' })
  })

  it('Node 说读不到、jsx 说不存在 → 仍报 error（宁可报错，不许降级成首次使用）', async () => {
    installNode()
    installCep()
    realFs.code = 'EBUSY'
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
