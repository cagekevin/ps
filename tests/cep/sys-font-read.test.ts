import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-09-3：SysFont2.json 的读取必须是**三态**，不许把"读不到"折成"没有字体"。
 *
 * 旧实现 `return []`（读失败 / 坏 JSON 都折成空表）：字体管理页只剩一个空列表，
 * 用户以为"这台机器没有系统字体"，而真正该做的是看错误原因、重试。
 */

const fs = vi.hoisted(() => ({ readTextOutcome: vi.fn() }))
const meta = vi.hoisted(() => ({
  readFontStars: vi.fn(async () => ({ ok: true, stars: {} })),
}))

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))
vi.mock('@/cep/fs-read', () => ({
  readTextOutcome: fs.readTextOutcome,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => '/user',
}))
vi.mock('@/cep/data/font-meta', () => meta)

const { readSysFontFile } = await import('@/cep/data/sys-font')

beforeEach(() => {
  fs.readTextOutcome.mockReset()
  meta.readFontStars.mockClear()
})

describe('readSysFontFile 三态', () => {
  it('读到了 → ok + 列表', async () => {
    fs.readTextOutcome.mockResolvedValue({
      status: 'ok',
      text: JSON.stringify({
        length: 1,
        arr: [{ name: 'MiSans', zz: ['Regular'], mz: ['MiSans'], hjm: ['MiSans-Regular'] }],
      }),
    })

    const read = await readSysFontFile()

    expect(read.status).toBe('ok')
    expect(read.status === 'ok' && read.list[0].family).toBe('MiSans')
  })

  it('文件不在 → none（首次使用，不是失败）', async () => {
    fs.readTextOutcome.mockResolvedValue({ status: 'notSeen' })

    await expect(readSysFontFile()).resolves.toEqual({ status: 'none' })
  })

  it('读不到（权限/IO）→ error + 原因，不是空列表', async () => {
    fs.readTextOutcome.mockResolvedValue({ status: 'error', reason: 'EACCES: 拒绝访问' })

    const read = await readSysFontFile()

    expect(read).toEqual({ status: 'error', reason: 'EACCES: 拒绝访问' })
  })

  it('坏 JSON → error，不是空列表', async () => {
    fs.readTextOutcome.mockResolvedValue({ status: 'ok', text: '{ 不是 json' })

    const read = await readSysFontFile()

    expect(read.status).toBe('error')
  })
})
