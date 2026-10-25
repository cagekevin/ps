import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 偏好文件**读不到**时不许拿默认值回写。
 *
 * 旧链路：`readTextSync` 把三态压成 `string | null` → `settings.ts` 的 `text ? … : {}`
 * 把"读不到"与"新装机没有偏好"当成同一件事 → 随后的 `persist` 把 `{}` 写回文件，
 * 用户的 `gasUrl` 与待同步队列就没了（`.bak` 也没有，因为"原文为空"）。
 *
 * 这里跑真 `settings.ts`（只把 `@/cep/fs` 换成内存实现），断言的是**可观察结果**：
 * 写盘函数有没有被调用。
 */

import { installFakeFs } from '../helpers/fake-fs'
import { ERR_PREFIX } from '@/utils/errors'

/** 假的是操作系统（不是 mock `@/cep/fs`）—— 写原语在 `disk-write`，mock fs 拦不住它 */
const disk = installFakeFs()
vi.mock('@/cep/transport', () => ({
  hasCep: () => true,
  // jsx 兜底的"文件不存在"哨兵（带 `ERR:` 前缀才算哨兵，否则被当成正文）
  evalScriptRaw: async () => `${ERR_PREFIX}文件不存在: `,
}))

/** 写失败监听器收到的提示（断言"拒绝写回要喊出来"） */
const errors: string[] = []

const settings = await import('@/cep/data/settings')

beforeEach(() => {
  settings.__resetSettingsForTest()
  disk.install()
  disk.failRead = false
  disk.failWrite = false
  errors.length = 0
  settings.onSettingsWriteError((message) => errors.push(message))
})

describe('偏好读不到 → 拒绝写回（TD-09-23）', () => {
  it('读返回 error 时：getPref 仍给默认值，但一个字节都不写盘', () => {
    disk.failRead = true

    expect(settings.getPref('nav.hidden', 'default')).toBe('default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    // 关键断言：默认值没有变成"用户偏好"写回文件
    expect(disk.writes).toHaveLength(0)
  })

  it('拒绝写回要喊出来（写失败监听器收到一条带原因的提示）', () => {
    disk.failRead = true
    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(errors.join('\n')).toContain('偏好文件读不到')
  })

  it('首次使用（notSeen）照旧可以写：这不是"读不到"', () => {
    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(disk.writes).toHaveLength(1)
  })

  it('原子写失败 → 报错，且**不再退回普通写**（TD-09-27）', () => {
    disk.failWrite = 'ENOSPC: disk full'

    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(errors.join('\n')).toContain('偏好写入失败')
    // 原子写失败 ⇒ **目标文件一个字节都没被写**（`.bak` 可能已经落地，那是备份，不算本体）
    // 旧实现在这里是 `if (!atomic) writeTextFile(...)`：原子保证被摘掉，而且失败原因丢失
    expect(disk.writes.filter((w) => !w.path.endsWith('.bak'))).toHaveLength(0)
  })
})
