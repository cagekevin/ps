import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasNode } from '@/cep/node'
import { installFakeFs } from '../helpers/fake-fs'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * `writeDisk`（async）的四条路。
 *
 * 为什么单独建文件：它只有 2 个调用点（`rename` / `font` 的导出），都要用户在系统对话框
 * 选路径，命令层的用例把它们 mock 掉了 ⇒ 这个入口**一行都没被执行过**。
 *
 * 与 `writeDiskSync` 的差别只有"怎么读原文"（`readTextAsync` 会先试 Node、再试 jsx），
 * 但 `requireReadable` / CAS / 备份三件事在异步版上必须同样成立。
 */

const disk = installFakeFs()

vi.mock('@/cep/transport', () => ({
  hasCep: () => true,
  // jsx 兜底的"文件不存在"哨兵：带 `ERR:` 前缀才算哨兵，否则被当成正文
  evalScriptRaw: async () => `${ERR_PREFIX}文件不存在: `,
}))

const { writeDisk } = await import('@/cep/disk-write')

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

describe('writeDisk（async）· 与同步版同四条判据', () => {
  it('正常写：读原文 → 备份 `.bak` → 原子写', async () => {
    await writeDisk(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看落盘' },
      backup: { mode: 'keep' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
    expect(disk.read(`${TARGET}.bak`)).toBe('旧内容')
  })

  /**
   * **`backup: none` 也要判可读** —— 这是 `requireReadable` 独立于备份的那条分支。
   * 用 `backup: keep` 测不出它（那条路本来就会读原文）。
   */
  it('`requireReadable` + `backup: none` + 读不到 → 抛，且一个字节都不写', async () => {
    disk.failRead = true

    await expect(
      writeDisk(TARGET, '新内容', {
        cas: { mode: 'skip', why: '用例：只看可读性' },
        backup: { mode: 'none', why: '用例：不备份，但仍要求原文可读' },
        requireReadable: true,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'IO' }))

    expect(disk.writes).toHaveLength(0)
  })

  it('CAS 不一致 → CONFLICT，原文不动', async () => {
    await expect(
      writeDisk(TARGET, '新内容', {
        cas: { mode: 'compare', expected: '我以为的原文' },
        backup: { mode: 'none', why: '用例：只看 CAS' },
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })

    expect(disk.read(TARGET)).toBe('旧内容')
  })

  it('CAS 一致 → 正常写入（异步版不是"永远冲突"）', async () => {
    await writeDisk(TARGET, '新内容', {
      cas: { mode: 'compare', expected: '旧内容' },
      backup: { mode: 'none', why: '用例：只看 CAS' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
  })

  /**
   * 原文不是可用 JSON ⇒ 另存 `.corrupt-<ts>`，**不写 `.bak`**（ADR-0026 ②）。
   *
   * 这条在同步版由 `style-library-real-fs` 间接覆盖，异步版此前**没有用例**。
   */
  it('原文不是可用 JSON → 另存 `.corrupt-*`，不写 `.bak`（异步版同样）', async () => {
    await writeDisk(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看隔离分支' },
      backup: { mode: 'keep', previous: '{这不是合法 JSON' },
      quarantineOnCorrupt: true,
    })

    expect(disk.files.has(`${TARGET}.bak`)).toBe(false)
    const quarantined = [...disk.files.keys()].filter((key) => key.includes('.corrupt-'))
    expect(quarantined).toHaveLength(1)
    expect(disk.read(quarantined[0])).toBe('{这不是合法 JSON')
  })

  it('`backup: none` → 不写 `.bak`（备份开关在异步版同样生效）', async () => {
    await writeDisk(TARGET, '新内容', {
      cas: { mode: 'skip', why: '用例：只看备份开关' },
      backup: { mode: 'none', why: '用例：明确不备份' },
    })

    expect(disk.read(TARGET)).toBe('新内容')
    expect(disk.files.has(`${TARGET}.bak`)).toBe(false)
  })
})
