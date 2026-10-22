import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * D-42（一）：原子写的临时文件名必须**每进程、每次调用都不同**。
 *
 * 以前固定用 `${absPath}.tmp`：主面板与独立面板是两个进程、写同一份数据文件 = 同一个 tmp 名。
 * A 写到一半被 B 截断重写，A 的 rename 落盘的就是 B 的半截内容 —— 文件损坏，
 * 下次读回退默认值，比丢一条更新更严重。
 *
 * 这个文件**不 mock** `@/cep/fs`：给真实实现装上 `window.require`（它就是靠这个拿 node 内置模块），
 * 所以测的是真代码 + 真 node:fs + 真 rename，tmp 名从 `writeFileSync` 的入参里抓。
 */
const realRequire = createRequire(import.meta.url)

const behavior = { failRename: false }
const writes: string[] = []
let dir = ''

const fakeFs = {
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => fs.mkdirSync(p, opts),
  writeFileSync: (p: string, data: string) => {
    writes.push(p)
    fs.writeFileSync(p, data, 'utf8')
  },
  renameSync: (from: string, to: string) => {
    if (behavior.failRename) throw new Error('EACCES')
    fs.renameSync(from, to)
  },
  unlinkSync: (p: string) => fs.unlinkSync(p),
  existsSync: (p: string) => fs.existsSync(p),
  readFileSync: (p: string) => fs.readFileSync(p, 'utf8'),
}

function installRequire() {
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => (id === 'fs' ? fakeFs : realRequire(id))
}

const { saveExportedText, writeTextFileAtomic } = await import('@/cep/fs')

beforeEach(() => {
  installRequire()
  writes.length = 0
  behavior.failRename = false
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-fs-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  delete (window as unknown as { require?: unknown }).require
})

describe('writeTextFileAtomic', () => {
  it('落盘内容正确，且不在目录里留下 tmp', () => {
    const target = path.join(dir, 'sj_appFreePanel.json')

    expect(writeTextFileAtomic(target, '{"a":1}')).toBe(true)

    expect(fs.readFileSync(target, 'utf8')).toBe('{"a":1}')
    expect(fs.readdirSync(dir)).toEqual(['sj_appFreePanel.json'])
  })

  it('每次调用的 tmp 名都不同，且不再是固定的 `<目标>.tmp`', () => {
    const target = path.join(dir, 'sj_appFreePanel.json')

    writeTextFileAtomic(target, '{"a":2}')
    writeTextFileAtomic(target, '{"a":3}')

    const tmps = writes.filter((p) => p !== target)
    expect(tmps).toHaveLength(2)
    expect(tmps[0]).not.toBe(tmps[1])
    for (const tmp of tmps) {
      // 旧的固定名会让两个进程互相截断同一份 tmp
      expect(tmp).not.toBe(`${target}.tmp`)
      expect(tmp.startsWith(target)).toBe(true)
      expect(tmp.endsWith('.tmp')).toBe(true)
    }
  })

  it('别的进程正在写的 `<目标>.tmp` 不会被我们 rename 走', () => {
    const target = path.join(dir, 'sj_appFreePanel.json')
    const otherProcessTmp = `${target}.tmp`
    fs.writeFileSync(otherProcessTmp, '对方进程写到一半的内容', 'utf8')

    expect(writeTextFileAtomic(target, '{"a":4}')).toBe(true)

    // 旧实现会把自己的内容写进这个同名文件再 rename，对方那半截就丢了
    expect(fs.readFileSync(otherProcessTmp, 'utf8')).toBe('对方进程写到一半的内容')
    expect(fs.readFileSync(target, 'utf8')).toBe('{"a":4}')
  })

  it('rename 失败时返回 false，并清掉自己的 tmp', () => {
    const target = path.join(dir, 'sj_appFreePanel.json')
    behavior.failRename = true

    expect(writeTextFileAtomic(target, '{"a":5}')).toBe(false)
    expect(fs.readdirSync(dir)).toEqual([])
  })

  it('无 node（未装 window.require）时返回 false，不抛', () => {
    delete (window as unknown as { require?: unknown }).require
    expect(writeTextFileAtomic(path.join(dir, 'x.json'), '{}')).toBe(false)
  })
})

describe('saveExportedText', () => {
  it('写入用户选的路径，同样不留 tmp', () => {
    const out = path.join(dir, '导出', '字体.json')

    saveExportedText(out, '{}')

    expect(fs.readFileSync(out, 'utf8')).toBe('{}')
    expect(fs.readdirSync(path.dirname(out))).toEqual(['字体.json'])
  })

  it('失败时抛错（不许假装写成功），临时文件不留', () => {
    const out = path.join(dir, '导出.json')
    behavior.failRename = true

    expect(() => saveExportedText(out, '[]')).toThrow()
    expect(fs.readdirSync(dir)).toEqual([])
  })
})
