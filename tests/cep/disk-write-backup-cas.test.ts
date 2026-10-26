import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasNode } from '@/cep/node'
import { installFakeFs } from '../helpers/fake-fs'

/**
 * 落盘入口的两件「前置」：**备份**与 **CAS**，以及它们的共同输入 `DiskBefore`。
 *
 * 四条判据（2026-10-26 收口后）：
 * 1. `backup: keep` 省略 `before` ⇒ 自己读一次，读到就写 `.bak`；
 * 2. `backup: keep` 且**原文读不到** ⇒ **抛**，一个字节都不写（旧行为是静默跳过 `.bak` 继续写）；
 * 3. CAS 比的是 `DiskBefore`：`absent` 只等于 `absent`，`ok` 比原文；
 * 4. 原文不是可用 JSON 且 `quarantineOnCorrupt` ⇒ 另存 `.corrupt-*`，不写 `.bak`。
 *
 * 为什么单独建文件：这些行为在 `Repo` 之外（`cloud/ledger` / `log-file` / `commands` 的导出）
 * 也要成立，而命令层用例把落盘 mock 掉了 ⇒ 只有这里真跑。
 */

const disk = installFakeFs()

const { writeDiskSync } = await import('@/cep/disk-write')

const TARGET = '/out/a.json'

afterEach(() => {
  disk.uninstall()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

beforeEach(() => {
  disk.files.clear()
  disk.install()
  disk.seed(TARGET, '旧内容')
})

describe('writeDiskSync · 备份与 CAS 的前置形状', () => {
  it('正常写：读原文 → 备份 `.bak` → 原子写', () => {
    writeDiskSync(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看落盘' },
      backup: { mode: 'keep' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
    expect(disk.read(`${TARGET}.bak`)).toBe('旧内容')
  })

  /**
   * **读不到 ≠ 没有原文**：旧写法里 `previous === null` 同时表示这两种，
   * 于是「读不到」静默跳过 `.bak`，用户以为有退路、其实没有（TD-18-195）。
   */
  it('`backup: keep` 且原文读不到 → 抛，且一个字节都不写、不留 `.bak`', () => {
    disk.failRead = true

    expect(() =>
      writeDiskSync(TARGET, '新内容', {
        cas: { mode: 'skip', why: '用例：只看可读性' },
        backup: { mode: 'keep' },
      }),
    ).toThrow(expect.objectContaining({ code: 'IO' }))

    disk.failRead = false
    expect(disk.writes).toHaveLength(0)
    expect(disk.read(TARGET)).toBe('旧内容')
  })

  it('CAS 不一致 → CONFLICT，原文不动', () => {
    expect(() =>
      writeDiskSync(TARGET, '新内容', {
        cas: { mode: 'compare', expected: { status: 'ok', text: '我以为的原文' } },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    ).toThrow(expect.objectContaining({ code: 'CONFLICT' }))

    expect(disk.read(TARGET)).toBe('旧内容')
  })

  it('CAS 一致 → 正常写入（不是"永远冲突"）', () => {
    writeDiskSync(TARGET, '新内容', {
      cas: { mode: 'compare', expected: { status: 'ok', text: '旧内容' } },
      backup: { mode: 'none', why: '用例：只看 CAS' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
  })

  /**
   * `expected: { status: 'absent' }` = 「这个路径上应当还没有文件」。
   * 文件已经被别人写出来 ⇒ 必须 `CONFLICT`，不许拿种子盖掉用户数据。
   */
  it('声明「应当没有文件」但文件已存在 → CONFLICT，不写', () => {
    expect(() =>
      writeDiskSync(TARGET, '种子', {
        cas: { mode: 'compare', expected: { status: 'absent' } },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    ).toThrow(expect.objectContaining({ code: 'CONFLICT' }))

    expect(disk.read(TARGET)).toBe('旧内容')
  })

  it('声明「应当没有文件」且确实没有 → 正常写入', () => {
    const fresh = '/out/fresh.json'

    writeDiskSync(fresh, '种子', {
      cas: { mode: 'compare', expected: { status: 'absent' } },
      backup: { mode: 'none', why: '用例：只看 CAS' },
    })

    expect(disk.read(fresh)).toBe('种子')
  })

  /**
   * 原文不是可用 JSON ⇒ 另存 `.corrupt-<ts>`，**不写 `.bak`**（ADR-0026 ②）。
   */
  it('原文不是可用 JSON → 另存 `.corrupt-*`，不写 `.bak`', () => {
    writeDiskSync(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看隔离分支' },
      backup: { mode: 'keep', before: { status: 'ok', text: '{这不是合法 JSON' } },
      quarantineOnCorrupt: true,
    })

    expect(disk.files.has(`${TARGET}.bak`)).toBe(false)
    const quarantined = [...disk.files.keys()].filter((key) => key.includes('.corrupt-'))
    expect(quarantined).toHaveLength(1)
    expect(disk.read(quarantined[0])).toBe('{这不是合法 JSON')
  })

  it('`backup: none` → 不写 `.bak`', () => {
    writeDiskSync(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看备份开关' },
      backup: { mode: 'none', why: '用例：明确不备份' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
    expect(disk.files.has(`${TARGET}.bak`)).toBe(false)
  })
})
