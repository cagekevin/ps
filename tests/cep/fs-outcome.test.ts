// @vitest-environment node
import { createRequire } from 'node:module'
import { installHostRequire, removeHostRequire } from '../helpers/host-stub'
import { hasNode } from '@/cep/node'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * 1a · `fs.ts` 观测原语的三态契约（共同地基）。
 *
 * 判据只有三条，全部作用在**真假 FS**上（给真实实现装 `window.require`，不 mock `@/cep/fs`）：
 * 1. **只认 `ENOENT` 是"查不到"**：`EACCES` / `EBUSY` / `EISDIR` 一律进 `error` 并带原因；
 * 2. 同步读 `readTextSync` 也是三态（旧的两态把 `EPERM` 压成"没有"）；
 * 3. `dirUsage` 少算的文件数必须**数出来**（`skipped`），不许拿空 catch 吞掉。
 */
const realRequire = createRequire(import.meta.url)

const fake = {
  /** 路径 → 内容；不在表里的一律 ENOENT */
  files: new Map<string, string>(),
  /** 这些路径读的时候抛 EACCES（"文件在、但读不到"） */
  denied: new Set<string>(),
  /** dirUsage 用：这个路径 stat 失败（算不进 bytes） */
  statFail: new Set<string>(),
  entries: new Map<string, string[]>(),
}

function installRequire() {
  const fs = {
    readFileSync: (p: string) => {
      if (fake.denied.has(p)) {
        const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
        throw error
      }
      const text = fake.files.get(p)
      if (text === undefined) {
        throw Object.assign(new Error(`ENOENT: no such file, open '${p}'`), { code: 'ENOENT' })
      }
      return text
    },
    readdirSync: (p: string) => {
      const names = fake.entries.get(p)
      if (!names) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return names.map((name) => ({
        name,
        isDirectory: () => false,
        isFile: () => true,
      }))
    },
    mkdirSync: () => {},
    writeFileSync: (p: string, data: string) => {
      fake.files.set(p, String(data))
    },
    renameSync: (from: string, to: string) => {
      const data = fake.files.get(from)
      if (data === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      fake.files.set(to, data)
      fake.files.delete(from)
    },
    unlinkSync: (p: string) => {
      fake.files.delete(p)
    },
    statSync: (p: string) => {
      if (fake.statFail.has(p)) {
        throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
      }
      return { size: (fake.files.get(p) ?? '').length }
    },
  }
  installHostRequire((id: string) => (id === 'fs' ? fs : realRequire(id)))
}

const { readTextSync } = await import('@/cep/fs-read')

afterEach(() => {
  removeHostRequire()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

beforeEach(() => {
  installRequire()
  fake.files.clear()
  fake.denied.clear()
  fake.statFail.clear()
  fake.entries.clear()
})

describe('readTextSync · 三态（不是 string | null）', () => {
  it('读到内容 → ok', () => {
    fake.files.set('/u/a.json', '{"a":1}')
    expect(readTextSync('/u/a.json')).toEqual({ status: 'ok', text: '{"a":1}' })
  })

  it('ENOENT → notSeen（"查不到"，可当首次使用）', () => {
    expect(readTextSync('/u/missing.json')).toEqual({ status: 'notSeen' })
  })

  it('EACCES → error + 原因（旧的两态在这里压成 null，于是"读不到"被当成"没有"）', () => {
    fake.denied.add('/u/secret.json')
    const read = readTextSync('/u/secret.json')
    // 断到**结构**：是 errno 臂、码是 EACCES、原始现场没被丢掉
    expect(read).toEqual({
      status: 'error',
      failure: { kind: 'errno', code: 'EACCES', raw: expect.anything() },
    })
  })

  it('无 Node → error（不是 notSeen：没有 Node 不等于文件不存在）', () => {
    // 这一例要"没有 Node"⇒ 临时卸掉（下一例由 beforeEach 的 installNode() 重装）
    removeHostRequire()

    const read = readTextSync('/u/a.json')

    // 断语义不断措辞：文案归 `domain/messages.ts` 管，这里只钉两件事 ——
    // ① 是 error（不是 notSeen / ok）；② 原因说的是"没有 Node"，不是"文件不存在"。
    expect(read).toEqual({ status: 'error', failure: { kind: 'noNode' } })
  })
})

// 「写原语失败必须带原因」的覆盖已随写原语搬到 `tests/cep/fs-atomic.test.ts`（那里测 `writeDisk`）。
