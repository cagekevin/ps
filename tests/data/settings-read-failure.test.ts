import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-09-23：偏好文件**读不到**时不许拿默认值回写。
 *
 * 旧链路：`readTextSync` 把三态压成 `string | null` → `settings.ts` 的 `text ? … : {}`
 * 把"读不到"与"新装机没有偏好"当成同一件事 → 随后的 `persist` 把 `{}` 写回文件，
 * 用户的 `gasUrl` 与待同步队列就没了（`.bak` 也没有，因为"原文为空"）。
 *
 * 这里跑真 `settings.ts`（只把 `@/cep/fs` 换成内存实现），断言的是**可观察结果**：
 * 写盘函数有没有被调用。
 */

const fsMock = vi.hoisted(() => ({
  /** 非空 = 同步读返回 error（模拟 EACCES）。空 = 文件不存在（notSeen） */
  readError: '',
  /** 原子写是否失败 */
  writeError: '',
}))

const atomic = vi.hoisted(() => vi.fn())
const plain = vi.hoisted(() => vi.fn())
const errors: string[] = []

vi.mock('@/cep/transport', () => ({ hasCep: () => true }))
vi.mock('@/cep/fs', () => ({
  hasNode: () => true,
  userDir: () => '/user',
  readTextSync: () =>
    fsMock.readError
      ? { status: 'error' as const, reason: fsMock.readError }
      : { status: 'notSeen' as const },
  writeTextFileAtomic: atomic,
  writeTextFile: plain,
  b64ToUtf8: (v: string) => v,
  utf8ToB64: (v: string) => v,
  dirUsage: () => null,
  readTextOutcome: async () => ({ status: 'notSeen' as const }),
  readBase64Outcome: () => ({ status: 'notSeen' as const }),
  writeBase64File: () => ({ status: 'ok' as const }),
  removeFile: () => ({ ok: true as const }),
  saveExportedText: () => {},
  psScriptsDir: async () => null,
}))

const settings = await import('@/cep/data/settings')

beforeEach(() => {
  settings.__resetSettingsForTest()
  fsMock.readError = ''
  fsMock.writeError = ''
  atomic.mockReset().mockReturnValue({ status: 'ok' as const })
  plain.mockReset()
  errors.length = 0
  settings.onSettingsWriteError((message) => errors.push(message))
})

describe('偏好读不到 → 拒绝写回（TD-09-23）', () => {
  it('读返回 error 时：getPref 仍给默认值，但一个字节都不写盘', () => {
    fsMock.readError = 'EACCES: permission denied'

    expect(settings.getPref('nav.hidden', 'default')).toBe('default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    // 关键断言：默认值没有变成"用户偏好"写回文件
    expect(atomic).not.toHaveBeenCalled()
    expect(plain).not.toHaveBeenCalled()
  })

  it('拒绝写回要喊出来（写失败监听器收到一条带原因的提示）', () => {
    fsMock.readError = 'EACCES: permission denied'
    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(errors.join('\n')).toContain('偏好文件读不到')
  })

  it('首次使用（notSeen）照旧可以写：这不是"读不到"', () => {
    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(atomic).toHaveBeenCalledTimes(1)
  })

  it('原子写失败 → 报错，且**不再退回普通写**（TD-09-27）', () => {
    atomic.mockReturnValue({ status: 'error' as const, reason: 'ENOSPC: disk full' })

    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(errors.join('\n')).toContain('偏好写入失败')
    // 旧实现在这里是 `if (!atomic) writeTextFile(...)`：原子保证被摘掉，而且失败原因丢失
    expect(plain).not.toHaveBeenCalled()
  })
})
