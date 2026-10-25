import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * TD-09-15：库文件（`sj_ku*` / `sj_dz*`）写入必须**原子**。
 *
 * 旧实现 `writeBase64File` 是 `fs.writeFileSync(目标)` 直写：进程被杀 / 磁盘满就留半截文件，
 * 而库文件是用户资产里最贵的 —— 半截 JSON 会让整库读不回来、回退默认值。
 *
 * 这里不 mock `@/cep/fs`：装真 `window.require`，用真 `node:fs` + 真 rename，
 * 失败由 fake fs 注入（rename 抛 / write 抛），断言的是**目标文件**的最终字节。
 */
const realRequire = createRequire(import.meta.url)

const behavior = { failRename: false, failWrite: false, writeError: 'ENOSPC' }
const writes: string[] = []
let dir = ''

const fakeFs = {
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => fs.mkdirSync(p, opts),
  writeFileSync: (p: string, data: unknown) => {
    if (behavior.failWrite) {
      throw Object.assign(new Error(`${behavior.writeError}: no space left on device`), {
        code: behavior.writeError,
      })
    }
    writes.push(p)
    fs.writeFileSync(p, data as Uint8Array)
  },
  renameSync: (from: string, to: string) => {
    if (behavior.failRename) {
      throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
    }
    fs.renameSync(from, to)
  },
  unlinkSync: (p: string) => fs.unlinkSync(p),
  existsSync: (p: string) => fs.existsSync(p),
  readFileSync: (p: string) => fs.readFileSync(p),
}

function installRequire() {
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => (id === 'fs' ? fakeFs : realRequire(id))
}

const { writeBase64File } = await import('@/cep/disk-write')

beforeEach(() => {
  installRequire()
  writes.length = 0
  behavior.failRename = false
  behavior.failWrite = false
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psz-fs-b64-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  delete (window as unknown as { require?: unknown }).require
})

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

describe('writeBase64File · 原子写（不留半截）', () => {
  it('往返字节一致：写出的文件与 base64 解码结果逐字节相同', () => {
    const target = path.join(dir, 'sj_kuCol1111111111111111.ini')
    const payload = b64('{"arrFileData":[],"store":{"index":0,"list":[]}}')

    expect(writeBase64File(target, payload)).toEqual({ status: 'ok' })

    const written = fs.readFileSync(target)
    expect(written.equals(Buffer.from(payload, 'base64'))).toBe(true)
    // 落盘后目录里只有目标文件，没有这次写留下的 tmp
    expect(fs.readdirSync(dir)).toEqual(['sj_kuCol1111111111111111.ini'])
  })

  it('rename 失败 → 目标保持原样（不是半截），且清掉自己的 tmp', () => {
    const target = path.join(dir, 'sj_kuSty2222222222222222.ini')
    fs.writeFileSync(target, 'ORIGINAL USER ASSET')
    behavior.failRename = true

    const result = writeBase64File(target, b64('NEW CONTENT'))

    expect(result.status).toBe('error')
    expect(result.status === 'error' && result.reason).toContain('EACCES')
    // 关键：旧版直写会先把目标改成 "NEW CONTENT" 的一半；原子写必须让原文件完好无损
    expect(fs.readFileSync(target, 'utf8')).toBe('ORIGINAL USER ASSET')
    expect(fs.readdirSync(dir)).toEqual(['sj_kuSty2222222222222222.ini'])
  })

  it('写入中途失败（ENOSPC）→ 目标保持原样，不留 tmp', () => {
    const target = path.join(dir, 'sj_dz3333333333333333.ini')
    fs.writeFileSync(target, 'PREVIOUS WAREHOUSE')
    behavior.failWrite = true

    const result = writeBase64File(target, b64('NEW WAREHOUSE'))

    expect(result.status).toBe('error')
    expect(result.status === 'error' && result.reason).toContain('ENOSPC')
    expect(fs.readFileSync(target, 'utf8')).toBe('PREVIOUS WAREHOUSE')
    expect(fs.readdirSync(dir)).toEqual(['sj_dz3333333333333333.ini'])
  })

  it('目标本来不存在且写入失败 → 不会凭空出现一个空/半截文件', () => {
    const target = path.join(dir, 'sj_kuFon4444444444444444.ini')
    behavior.failRename = true

    expect(writeBase64File(target, b64('NEW')).status).toBe('error')

    expect(fs.existsSync(target)).toBe(false)
    expect(fs.readdirSync(dir)).toEqual([])
  })
})
