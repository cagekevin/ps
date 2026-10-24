import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TD-09-19 / TD-16-1：仓库层**受保护的纯文本写入口**。
 *
 * 以前 `swatch.setRecentLimit` 直接 `writeTextFile('…/zuiJinShuLiang.txt')`：没有 tmp、非原子、
 * 没有 `.bak`。面板关在写中途 → 数量文件半截（原版读它时 parseInt 得到 NaN，最近色条数就乱了）。
 * 现在统一走 `writeProtectedText`：备份 → 原子写 → **回读校验**。
 */
const disk = vi.hoisted(() => ({
  files: new Map<string, string>(),
  /** 非空 = 下一次原子写失败（模拟 rename 失败 / EPERM） */
  failNext: '',
  /** 非空 = 下一次原子写"写坏"（落盘内容不是想要的） */
  corruptNext: false,
}))

vi.mock('@/cep/fs', () => ({
  readTextOutcome: async (path: string) => {
    const text = disk.files.get(path)
    return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
  },
  writeTextFileAtomic: (path: string, text: string) => {
    if (disk.failNext) {
      const reason = disk.failNext
      disk.failNext = ''
      return { status: 'error' as const, reason }
    }
    // 原子写的语义：要么整份换掉，要么一个字节都不动（tmp 不会被看见）
    disk.files.set(path, disk.corruptNext ? `${text}截断` : text)
    disk.corruptNext = false
    return { status: 'ok' as const }
  },
}))

const { writeProtectedText } = await import('@/cep/data/protected-text')

const target = (name: string) => `ROAM/FengZiSeBan/${name}`

beforeEach(() => {
  disk.files.clear()
  disk.failNext = ''
  disk.corruptNext = false
})

describe('writeProtectedText', () => {
  it('首次写（没有上一版）→ 不产生空备份，内容写对', async () => {
    await writeProtectedText(target('zuiJinShuLiang.txt'), '20')

    expect(disk.files.get(target('zuiJinShuLiang.txt'))).toBe('20')
    expect(disk.files.has(`${target('zuiJinShuLiang.txt')}.bak`)).toBe(false)
  })

  it('有上一版 → 先备份再替换（.bak = 上一版原文）', async () => {
    disk.files.set(target('zuiJinShuLiang.txt'), '12')

    await writeProtectedText(target('zuiJinShuLiang.txt'), '20')

    expect(disk.files.get(target('zuiJinShuLiang.txt'))).toBe('20')
    expect(disk.files.get(`${target('zuiJinShuLiang.txt')}.bak`)).toBe('12')
  })

  it('原子写失败（rename 失败）→ 抛，目标文件一个字节都不动', async () => {
    disk.files.set(target('zuiJinShuLiang.txt'), '12')
    disk.failNext = 'EPERM: rename 失败'

    await expect(writeProtectedText(target('zuiJinShuLiang.txt'), '20')).rejects.toThrow(/EPERM/)

    expect(disk.files.get(target('zuiJinShuLiang.txt'))).toBe('12')
  })

  it('备份失败 → 中止（不写本体，不留"看起来成功"）', async () => {
    disk.files.set(target('zuiJinShuLiang.txt'), '12')
    // 备份是第一次原子写，让它失败
    disk.failNext = 'EACCES: 备份写不了'

    await expect(writeProtectedText(target('zuiJinShuLiang.txt'), '20')).rejects.toThrow(/备份失败/)
    expect(disk.files.get(target('zuiJinShuLiang.txt'))).toBe('12')
  })

  it('写完回读不一致 → 抛（"写完能证明它没被破坏"）', async () => {
    disk.corruptNext = true

    await expect(writeProtectedText(target('zuiJinShuLiang.txt'), '20')).rejects.toThrow(
      /回读不一致/,
    )
  })
})
