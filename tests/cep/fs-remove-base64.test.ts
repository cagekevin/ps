import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * T-109：`fs.ts` 自己遵守 ADR-26。
 *
 * 三处旧写法都在扔区分（`existsSync` + `catch { return null/false }`），其中最坏的是
 * `removeFile`：文件**存在但删不掉**时 `existsSync` 报 `false`，于是返回 `true`——
 * **声称删成功，文件还在**，调用方据此以为旧文件已清走。
 *
 * 这个文件**不 mock** `@/cep/fs`：给真实实现装上 `window.require`，只把 `node:fs` 换成假的。
 * **不用真实路径**（换台机器就红）。
 */
const realFs = {
  /** 非空 = 对应操作抛一个带这个 `code` 的系统错误 */
  unlinkCode: '' as string,
  readCode: '' as string,
  readdirCode: '' as string,
  base64: 'aGk=' as string,
}

const fakeFs = {
  // 实现**不许**再用 existsSync 判存在性（它对"存在但 stat 不到"也返回 false）。一调用就炸
  existsSync: () => {
    throw new Error('用例：实现不许再用 existsSync（T-109）')
  },
  unlinkSync: () => {
    if (realFs.unlinkCode) {
      throw Object.assign(new Error(`模拟 ${realFs.unlinkCode}`), { code: realFs.unlinkCode })
    }
  },
  readFileSync: () => {
    if (realFs.readCode) {
      throw Object.assign(new Error(`模拟 ${realFs.readCode}`), { code: realFs.readCode })
    }
    return Buffer.from(realFs.base64, 'base64')
  },
  readdirSync: () => {
    if (realFs.readdirCode) {
      throw Object.assign(new Error(`模拟 ${realFs.readdirCode}`), { code: realFs.readdirCode })
    }
    return []
  },
  statSync: () => ({ size: 0 }),
}

function installNode() {
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => {
    if (id === 'fs') return fakeFs
    if (id === 'path') return { join: (a: string, b: string) => `${a}/${b}` }
    throw new Error(`用例没准备 ${id}`)
  }
}

const { dirUsage, readBase64Outcome, removeFile } = await import('@/cep/fs')

beforeEach(() => {
  installNode()
  realFs.unlinkCode = ''
  realFs.readCode = ''
  realFs.readdirCode = ''
  realFs.base64 = 'aGk='
})

afterEach(() => {
  delete (window as unknown as { require?: unknown }).require
})

describe('removeFile · 不许谎报成功（判据 A）', () => {
  it('删掉了 → ok:true', () => {
    expect(removeFile('/tmp/a.json')).toEqual({ ok: true })
  })

  it('本来就不在（ENOENT）→ ok:true（幂等删除）', () => {
    realFs.unlinkCode = 'ENOENT'
    expect(removeFile('/tmp/a.json')).toEqual({ ok: true })
  })

  it.each(['EPERM', 'EACCES', 'EBUSY'])(
    '存在但删不掉（%s）→ 绝不返回 ok:true，reason 带错误码',
    (code) => {
      realFs.unlinkCode = code

      const result = removeFile('/tmp/a.json')

      expect(result.ok).toBe(false)
      expect(result.ok === false ? result.reason : '').toContain(code)
    },
  )

  it('实现不再依赖 existsSync（假 fs 的 existsSync 一被调用就抛）', () => {
    realFs.unlinkCode = 'EPERM'
    expect(removeFile('/tmp/a.json').ok).toBe(false)
  })
})

describe('readBase64Outcome · 三态', () => {
  it('读到了 → ok + base64', () => {
    expect(readBase64Outcome('/tmp/a.png')).toEqual({ status: 'ok', base64: 'aGk=' })
  })

  it('ENOENT → notSeen', () => {
    realFs.readCode = 'ENOENT'
    expect(readBase64Outcome('/tmp/a.png')).toEqual({ status: 'notSeen' })
  })

  it.each(['EPERM', 'EACCES'])('%s → error，不许出现 notSeen', (code) => {
    realFs.readCode = code

    const read = readBase64Outcome('/tmp/a.png')

    expect(read.status).toBe('error')
    expect(read.status === 'error' ? read.reason : '').toContain(code)
  })
})

describe('dirUsage · 保留两态但不用 existsSync', () => {
  it('目录读不到 → null（调用方显示「无法读取」，不区分原因）', () => {
    realFs.readdirCode = 'EACCES'
    expect(dirUsage('/user')).toBeNull()
  })

  it('目录不存在（ENOENT）→ 同样 null', () => {
    realFs.readdirCode = 'ENOENT'
    expect(dirUsage('/user')).toBeNull()
  })

  it('空目录 → { bytes: 0, files: 0 }，与「读不到」的 null 分得开', () => {
    expect(dirUsage('/user')).toEqual({ bytes: 0, files: 0 })
  })
})
