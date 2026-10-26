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

    // D-42 收进落盘入口后，文案由 `msg.data.fn.fileReadFailedAbortWrite` 给：
    // 「<path> 读不到，已中止写入（<reason>）」
    expect(errors.join('\n')).toContain('读不到')
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

    expect(errors.join('\n')).toContain('写入失败')
    // 原子写失败 ⇒ **目标文件一个字节都没被写**（`.bak` 可能已经落地，那是备份，不算本体）
    // 旧实现在这里是 `if (!atomic) writeTextFile(...)`：原子保证被摘掉，而且失败原因丢失
    expect(disk.writes.filter((w) => !w.path.endsWith('.bak'))).toHaveLength(0)
  })
})

/**
 * 两个面板同时开着时，偏好文件会被两边各写一份。
 *
 * 旧实现 `{ previous: null }` = **不比对原文**，后写直接抹掉前写，两边 UI 都显示"已保存"。
 * 现在 `settings` 拿会话开始时读到的原文做 CAS：磁盘已不是那一份 ⇒ 抛 `CONFLICT`、**不写**。
 *
 * 一条用例同时钉三件事：
 * ① 磁盘保留别的面板写的内容（没被覆盖）；
 * ② 用户听到的是"正被其他面板修改"，不是"写入失败"（码不能被包成 `IO`）；
 * ③ 冲突时连一次写也没发生（不是写了再回滚）。
 */
describe('偏好被别的面板改过 → 不覆盖（D-26 同口径）', () => {
  it('会话读完原文后磁盘被改：本次写放弃、别的面板的内容保留、提示说"正被其他面板修改"', () => {
    disk.files.clear()

    // 1. 本会话建立基准：读一次（文件不存在，基准 = null）→ 写一次（成功，基准推进到这份文本）
    settings.getPref('nav.hidden', 'default')
    settings.setPref('nav.hidden', 'mine')
    settings.flushPrefs()

    // 原子写先落 tmp 再 rename ⇒ `writes` 里是 tmp 名，真实路径要从内存盘上取
    const path = [...disk.files.keys()].find((key) => !key.endsWith('.tmp'))
    expect(path).toBeTypeOf('string')
    const target = path as string
    expect(disk.read(target)).toBeTypeOf('string')

    // 2. 另一个面板随后整份改了同一文件（`seed` 不计入本进程的 writes 记录）
    const otherPanel = JSON.stringify({ __version: 1, 'nav.hidden': 'written-by-other-panel' })
    disk.seed(target, otherPanel)

    // 3. 本会话再写一次
    errors.length = 0
    const writesBefore = disk.writes.length
    settings.setPref('nav.hidden', 'mine-again')
    settings.flushPrefs()

    // ① 磁盘上仍是另一个面板写的
    expect(disk.read(target)).toBe(otherPanel)
    // ② 提示说的是"被其他面板修改"，不是"写入失败"
    expect(errors.join('\n')).toContain('正被其他面板修改')
    expect(errors.join('\n')).not.toContain('偏好写入失败')
    // ③ 冲突没有落盘：第 2 次写连一次 `writeFileSync` 都没发生（不是写了再回滚）
    expect(disk.writes.length).toBe(writesBefore)
  })

  /**
   * T3b 删掉 `refuseIfReadFailed` 时引入的回归（2026-10-26 自查发现）。
   *
   * 读失败时 `cache` 被填成 `{}`（给 UI 默认值）。此时磁盘上一整份偏好读不到，
   * 内存里只有空壳 —— 任何一次写都会把**空壳 + 本次改动**写回去，其他键全丢。
   *
   * 「写前读得到」（`requireReadable`）拦不住这件事：它保证的是**写的那一刻**能读，
   * 保证不了**写出去的基底是完整的**。两件事，两个判据。
   *
   * 现在的行为（`refuseIfReadFailed` 已恢复）：**本次会话一个字节都不写**，并喊出原因。
   */
  it('读失败一次后恢复：本次会话仍不写（否则 {} 空壳会丢其他键）', () => {
    disk.files.clear()

    // 1. 先建立一份有内容的偏好文件（另一个键是用户数据）
    settings.getPref('nav.hidden', 'default')
    settings.setPref('cloud.gasUrl', 'https://example.com/gas')
    settings.flushPrefs()
    const path = [...disk.files.keys()].find((key) => !key.endsWith('.tmp')) as string
    const original = disk.read(path)!
    expect(JSON.parse(original)).toHaveProperty('cloud.gasUrl')

    // 2. 新会话，读失败（cache 被填成空壳）
    settings.__resetSettingsForTest()
    disk.failRead = true
    expect(settings.getPref('nav.hidden', 'default')).toBe('default')
    disk.failRead = false

    // 3. 读恢复后改一个键 —— 仍**不该写**
    errors.length = 0
    settings.setPref('nav.hidden', 'changed')
    settings.flushPrefs()

    expect(disk.read(path)).toBe(original)
    expect(errors.join('\n')).toContain('偏好文件读不到')
  })
})
