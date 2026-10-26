import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installHostRequire, removeHostRequire } from '../helpers/host-stub'
import { hasNode } from '@/cep/node'
import { createRequire } from 'node:module'

/**
 * T1：库文件（`sj_ku*` / `sj_dz*`）的 CAS。
 *
 * 为什么单开一个文件：`installFakeFs` 只支持**文本**写，而库文件走 `writeBase64File`（字节）。
 * 这里用最小的内存 fs（支持 Buffer），专测一件事：
 * **比对的是 base64，不是文本** —— 用 `readTextSync` 比二进制会把「比不了」误判成「没被改过」。
 *
 * 判据来源：两个面板同时开着一份库文件时，后写不许静默覆盖前写。
 */

const realRequire = createRequire(import.meta.url)

/** 已落盘的文件（路径 → 字节） */
const store = new Map<string, Buffer>()
/** 正在写 tmp 的内容（rename 时搬进 `store`） */
const pending = new Map<string, unknown>()

/** `true` ⇒ 下一次落盘被**写坏**（内容被改一个字节），用来造"回读不一致" */
let corruptNextWrite = false
/** `true` ⇒ 所有读抛 EACCES（造"存在但读不到"，与 ENOENT 严格区分） */
let failRead = false

const fakeFs = {
  mkdirSync: () => {},
  writeFileSync: (p: string, data: unknown) => {
    if (corruptNextWrite) {
      corruptNextWrite = false
      pending.set(p, Buffer.from('被写坏的字节'))
      return
    }
    pending.set(p, data)
  },
  renameSync: (from: string, to: string) => {
    if (!pending.has(from)) throw Object.assign(new Error(`ENOENT: ${from}`), { code: 'ENOENT' })
    const data = pending.get(from) as Buffer
    pending.delete(from)
    store.set(to, data)
  },
  readFileSync: (p: string) => {
    if (failRead) throw Object.assign(new Error(`EACCES: ${p}`), { code: 'EACCES' })
    const value = store.get(p)
    if (!value) throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' })
    return value
  },
  unlinkSync: (p: string) => {
    if (!store.has(p)) throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' })
    store.delete(p)
  },
  // 实现不许再用 existsSync 判存在性（T-109）：它对"存在但 stat 不到"也返回 false
  existsSync: () => {
    throw new Error('用例：实现不许再用 existsSync（T-109）')
  },
}

const { writeBase64File, readBefore } = await import('@/cep/disk-write')

const target = '/user/sj_kuStyle.kux'
const b64 = (text: string) => Buffer.from(text).toString('base64')

/** 取错误的判别码（`CepError.code`） */
function codeOf(fn: () => void): string {
  try {
    fn()
    return ''
  } catch (e) {
    return (e as { code?: string }).code ?? ''
  }
}

afterEach(() => {
  removeHostRequire()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

beforeEach(() => {
  store.clear()
  pending.clear()
  corruptNextWrite = false
  installHostRequire((id: string) => (id === 'fs' ? fakeFs : realRequire(id)))
  failRead = false
  store.set(target, Buffer.from('别的面板写的'))
})

describe('writeBase64File · 库文件被别的面板改过（T1）', () => {
  it('磁盘已不是我以为的那一份 → 抛 CONFLICT，且**一个字节都不写**', () => {
    const before = store.get(target)!.toString()

    const code = codeOf(() =>
      writeBase64File(target, b64('我这份'), {
        cas: { mode: 'compare', expected: { status: 'ok', text: b64('我以为的原文') } },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    )

    expect(code).toBe('CONFLICT')
    expect(store.get(target)!.toString()).toBe(before)
  })

  it('磁盘仍是我以为的那一份 → 正常写入（CAS 不是"永远拒绝"）', () => {
    store.set(target, Buffer.from('原文'))

    writeBase64File(target, b64('新内容'), {
      cas: { mode: 'compare', expected: { status: 'ok', text: b64('原文') } },
      backup: { mode: 'none', why: '用例：只看 CAS' },
    })

    expect(store.get(target)!.toString()).toBe('新内容')
  })

  it('比对的是 base64：同一份字节换个编码器也判 same（不会因为"读成文本"而误判）', () => {
    const original = '原始二进制内容'
    store.set(target, Buffer.from(original))

    expect(() =>
      writeBase64File(target, b64('新内容'), {
        cas: {
          mode: 'compare',
          expected: { status: 'ok', text: Buffer.from(original).toString('base64') },
        },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    ).not.toThrow()
  })

  it('expected: absent = "这个路径上应当没有文件"：文件在 → CONFLICT', () => {
    const code = codeOf(() =>
      writeBase64File(target, b64('新内容'), {
        cas: { mode: 'compare', expected: { status: 'absent' } },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    )

    expect(code).toBe('CONFLICT')
  })

  /**
   * `verifyReadBack` 在**字节版**也必须真的生效。
   *
   * 这条是补 2026-10-26 自查的第 ② 条：T1 时 `writeBytesCore` 没有回读步骤，
   * 传 `verifyReadBack: true` 编译能过、运行被忽略 —— 一个自己造出来的「可忽略字段」。
   */
  it('verifyReadBack: true → 回读一致则正常返回', () => {
    store.set(target, Buffer.from('旧'))

    expect(() =>
      writeBase64File(target, b64('新'), {
        cas: { mode: 'skip', why: '用例：只看回读' },
        backup: { mode: 'none', why: '用例：只看回读' },
        verifyReadBack: true,
      }),
    ).not.toThrow()

    expect(store.get(target)!.toString()).toBe('新')
  })

  it('verifyReadBack: true → 回读不一致就抛（坏字节留在盘上，由调用方回滚）', () => {
    store.set(target, Buffer.from('旧'))
    corruptNextWrite = true

    expect(() =>
      writeBase64File(target, b64('新'), {
        cas: { mode: 'skip', why: '用例：只看回读' },
        backup: { mode: 'none', why: '用例：只看回读' },
        verifyReadBack: true,
      }),
    ).toThrow(/回读不一致/)

    // 回读校验只负责"发现"，不负责"回滚" —— 盘上确实是坏字节
    expect(store.get(target)!.toString()).toBe('被写坏的字节')
  })

  it('backup: keep → 原文写进 <path>.bak，且 .bak 里是**旧字节**', () => {
    store.set(target, Buffer.from('旧库文件'))

    writeBase64File(target, b64('新库文件'), {
      cas: { mode: 'skip', why: '用例：只看备份' },
      backup: { mode: 'keep' },
    })

    expect(store.get(`${target}.bak`)!.toString()).toBe('旧库文件')
    expect(store.get(target)!.toString()).toBe('新库文件')
  })

  /**
   * **字节版的「读不到 ⇒ 不许写」**（2026-10-26 自查补的第 3 条）。
   *
   * 文本版由 `disk-write-backup-cas.test.ts` 守着；字节版此前只有 CAS / 备份**成功**的用例，
   * 「`backup: keep` 但原文读不到」这条会静默跳过 `.bak` 继续写 —— 库文件没有第二份。
   * 判据：`backupBytesStep` 里 `before` 省略 ⇒ `base64Before` 现读，读不到（非 ENOENT）抛。
   */
  it('`backup: keep` 且原文读不到（EACCES）→ 抛，且一个字节都不写、不留 `.bak`', () => {
    store.set(target, Buffer.from('旧库文件'))
    failRead = true

    const code = codeOf(() =>
      writeBase64File(target, b64('新库文件'), {
        cas: { mode: 'skip', why: '用例：只看可读性' },
        backup: { mode: 'keep' },
      }),
    )

    expect(code).toBe('IO')
    failRead = false
    expect(store.get(target)!.toString()).toBe('旧库文件')
    expect(store.has(`${target}.bak`)).toBe(false)
  })

  /**
   * `readBefore` = **`DiskBefore` 的唯一构造入口**（业务层要用原文只能走它）。
   *
   * 钉住三条：读到给 `ok`+字节 / 明确没有给 `absent` / **读不到抛**（不许自己判 `status`）。
   */
  it('readBefore(bytes)：读到 → ok+base64；ENOENT → absent；EACCES → 抛 IO', () => {
    store.set(target, Buffer.from('旧库文件'))
    expect(readBefore(target, 'bytes')).toEqual({ status: 'ok', text: b64('旧库文件') })

    store.delete(target)
    expect(readBefore(target, 'bytes')).toEqual({ status: 'absent' })

    store.set(target, Buffer.from('旧库文件'))
    failRead = true
    const code = codeOf(() => readBefore(target, 'bytes'))
    failRead = false

    expect(code).toBe('IO')
  })

  it('对照：原文确实不存在（ENOENT）→ 照常写，不留 `.bak`', () => {
    store.delete(target)

    writeBase64File(target, b64('新库文件'), {
      cas: { mode: 'skip', why: '用例：只看可读性' },
      backup: { mode: 'keep' },
    })

    expect(store.get(target)!.toString()).toBe('新库文件')
    expect(store.has(`${target}.bak`)).toBe(false)
  })
})
