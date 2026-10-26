import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installHostRequire, removeHostRequire } from '../helpers/host-stub'
import { hasNode } from '@/cep/node'

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

// 导出文件的写已收进唯一落盘入口 `writeDiskSync`（`saveExportedText` 已删；旧 async `writeDisk` 亦已删）
const { writeDiskSync } = await import('@/cep/disk-write')

function installRequire() {
  installHostRequire((id: string) => (id === 'fs' ? fakeFs : realRequire(id)))
}

beforeEach(() => {
  installRequire()
  writes.length = 0
  behavior.failRename = false
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-fs-'))
})

afterEach(() => {
  removeHostRequire()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('writeDiskSync（原子写：tmp 名唯一 / 不留 tmp / 失败必抛）', () => {
  it('落盘内容正确，且不在目录里留下 tmp', async () => {
    const target = path.join(dir, 'sj_appFreePanel.json')

    writeDiskSync(target, '{"a":1}', {
      backup: { mode: 'none' as const, why: '测试：新建文件' },
      cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
    })

    expect(fs.readFileSync(target, 'utf8')).toBe('{"a":1}')
    expect(fs.readdirSync(dir)).toEqual(['sj_appFreePanel.json'])
  })

  it('每次调用的 tmp 名都不同，且不再是固定的 <目标>.tmp', async () => {
    const target = path.join(dir, 'sj_appFreePanel.json')

    writeDiskSync(target, '{"a":2}', {
      backup: { mode: 'none' as const, why: '测试：新建文件' },
      cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
    })
    writeDiskSync(target, '{"a":3}', {
      backup: { mode: 'none' as const, why: '测试：新建文件' },
      cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
    })

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

  it('别的进程正在写的 <目标>.tmp 不会被我们 rename 走', async () => {
    const target = path.join(dir, 'sj_appFreePanel.json')
    const otherProcessTmp = `${target}.tmp`
    fs.writeFileSync(otherProcessTmp, '对方进程写到一半的内容', 'utf8')

    writeDiskSync(target, '{"a":4}', {
      backup: { mode: 'none' as const, why: '测试：新建文件' },
      cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
    })

    expect(fs.readFileSync(otherProcessTmp, 'utf8')).toBe('对方进程写到一半的内容')
    expect(fs.readFileSync(target, 'utf8')).toBe('{"a":4}')
  })

  it('rename 失败时抛（带原因），并清掉自己的 tmp', () => {
    const target = path.join(dir, 'sj_appFreePanel.json')
    behavior.failRename = true

    // 失败必须**抛**（boolean 说不出为什么，调用方只能猜着退回普通写）
    expect(() =>
      writeDiskSync(target, '{"a":5}', {
        backup: { mode: 'none' as const, why: '测试：新建文件' },
        cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
      }),
    ).toThrow('EACCES')
    expect(fs.readdirSync(dir)).toEqual([])
  })

  it('无 node（未装 window.require）时抛，不静默', () => {
    removeHostRequire()
    expect(() =>
      writeDiskSync(path.join(dir, 'x.json'), '{}', {
        backup: { mode: 'none' as const, why: '测试：新建文件' },
        cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
      }),
    ).toThrow('Node 不可用')
  })
})

describe('writeDiskSync（导出到用户选的路径）', () => {
  it('写入用户选的路径，同样不留 tmp', async () => {
    const out = path.join(dir, '导出', '字体.json')

    writeDiskSync(out, '{}', {
      backup: { mode: 'none' as const, why: '测试：新建文件' },
      cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
    })

    expect(fs.readFileSync(out, 'utf8')).toBe('{}')
    expect(fs.readdirSync(path.dirname(out))).toEqual(['字体.json'])
  })

  it('失败时抛错（不许假装写成功），临时文件不留', () => {
    const out = path.join(dir, '导出.json')
    behavior.failRename = true

    expect(() =>
      writeDiskSync(out, '[]', {
        backup: { mode: 'none' as const, why: '测试：新建文件' },
        cas: { mode: 'skip' as const, why: '测试：不涉及并发' },
      }),
    ).toThrow(expect.objectContaining({ code: 'IO' }))
    expect(fs.readdirSync(dir)).toEqual([])
  })
})
