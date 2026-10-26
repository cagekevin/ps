import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { installHostRequire, removeHostRequire } from '../helpers/host-stub'

/**
 * `dirUsage()`（T-68）：清缓存弹窗的「缓存大小」要读真实目录。
 * 和 `fs-atomic.test.ts` 同一手法——给真实实现装上 `window.require`，测真代码 + 真 node:fs。
 */
const realRequire = createRequire(import.meta.url)

let root = ''

function installRequire() {
  installHostRequire((id: string) => realRequire(id))
}

function uninstallRequire() {
  removeHostRequire()
}

const { dirUsage } = await import('@/cep/dir-usage')

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sj-dirusage-'))
  fs.mkdirSync(path.join(root, 'nested'))
  fs.writeFileSync(path.join(root, 'a.json'), 'x'.repeat(100))
  fs.writeFileSync(path.join(root, 'nested', 'b.json'), 'y'.repeat(50))
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('dirUsage', () => {
  it('递归求和文件字节与个数', () => {
    installRequire()
    expect(dirUsage(root)).toEqual({ bytes: 150, files: 2, skipped: 0 })
  })

  it('目录不存在返回 null（不是 0——0 会被显示成"空缓存"）', () => {
    installRequire()
    expect(dirUsage(path.join(root, 'missing'))).toBeNull()
  })

  it('Node 不可用返回 null', () => {
    uninstallRequire()
    expect(dirUsage(root)).toBeNull()
    installRequire()
  })
})
