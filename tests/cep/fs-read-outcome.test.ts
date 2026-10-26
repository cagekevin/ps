import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ERR_PREFIX } from '@/utils/errors'
import {
  installHostBridge,
  installHostRequire,
  removeHostBridge,
  removeHostRequire,
} from '../helpers/host-stub'

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
  installHostRequire((id: string) => {
    if (id !== 'fs') throw new Error(`用例没准备 ${id}`)
    return fakeFs
  })
}

function installCep() {
  installHostBridge({ evalScript: (_script, cb) => cb(jsx.reply) })
}

function clearBridges() {
  removeHostRequire()
  removeHostBridge()
}

// `fs.ts` 已拆：异步三态读在 `fs-read`，且 `readTextOutcome` 已改名 `readTextAsync`
// （与 `readTextSync` 成对）。局部保留旧名，正文 14 处断言不动。
const { readTextAsync: readTextOutcome } = await import('@/cep/fs-read')

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
    expect(
      outcome.status === 'error' && outcome.failure.kind === 'errno' && outcome.failure.code,
    ).toBe(code)
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

  it('脚本里的其它错误 → error，原始 message 留在 raw 里（不再压成一句话）', async () => {
    installCep()
    jsx.reply = `${ERR_PREFIX}拒绝访问`

    await expect(readTextOutcome('/tmp/a.json')).resolves.toEqual({
      status: 'error',
      failure: { kind: 'errno', code: 'JSX', raw: '拒绝访问' },
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
    expect(
      outcome.status === 'error' && outcome.failure.kind === 'errno' && outcome.failure.code,
    ).toBe('EBUSY')
  })
})

// 两条路的合并规则在 `fs-read.ts` 的 `combineReads`（**具名策略**，不是观测）：
// Node 的 `error` 压过 jsx 的 `notSeen`。上面「jsx 路」那 4 条断言测的正是它：
// jsx 读到就赢 / Node 读不到 + jsx 查不到 → error / 两条都查不到 → notSeen。
// 策略本身没有消失，只是不再单独导出 —— 所以断言合并到行为层，不再测那个符号。
