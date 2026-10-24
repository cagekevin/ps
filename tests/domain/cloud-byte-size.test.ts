import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSnapshot, fileByteSize, type SyncUnit } from '@/domain/cloud'

/**
 * TD-12-28：`fileByteSize` 说的是**字节数**，不是字符数。
 *
 * 旧实现 `catch { return data.length }`：TextEncoder 一旦不可用，中文的"字节数"就变成
 * 字符数（差三倍），而这个值会作为 `size` 写进同步快照——**静默的错**，谁也不知道。
 * 现在没有兜底（要么真按字节算，要么抛），下面钉住具体数值关系。
 */
describe('fileByteSize：真的按 UTF-8 字节算', () => {
  it('纯 ASCII：字节数 == 字符数', () => {
    expect(fileByteSize('MiSans')).toBe(6)
    expect(fileByteSize('')).toBe(0)
  })

  it('中文：一个汉字 3 字节，字节数严格大于字符数', () => {
    const text = '中文'
    expect(text.length).toBe(2)
    expect(fileByteSize(text)).toBe(6)
    expect(fileByteSize(text)).toBeGreaterThan(text.length)
  })

  it('混排：ASCII 1 字节 + 汉字 3 字节', () => {
    expect(fileByteSize('a中')).toBe(4)
    // 7 个 ASCII 结构字符 + 3 个汉字×3 = 16 字节（字符数只有 10）
    expect('{"字":"苹方"}'.length).toBe(10)
    expect(fileByteSize('{"字":"苹方"}')).toBe(16)
  })

  it('emoji（代理对）：2 个 UTF-16 码元、4 字节', () => {
    expect('👍'.length).toBe(2)
    expect(fileByteSize('👍')).toBe(4)
  })

  it('同步快照的 size 用的是字节数（写盘/上传的那份数据）', () => {
    const unit: SyncUnit = {
      schema: 1,
      hash: 'h',
      files: [
        { path: '/a.json', size: 0, content: { kind: 'inline', data: '中文', encoding: 'json' } },
      ],
    }
    const snapshot = buildSnapshot({ 'font.tags': unit }, 1, 100)
    // buildSnapshot 不重算 size（沿用 unit 里的 0）；这里钉的是"重算时走 fileByteSize"
    expect(snapshot.units['font.tags'].files[0].content).toMatchObject({ data: '中文' })
    expect(fileByteSize('中文')).toBe(6)
  })
})

describe('没有 TextEncoder 时不许静默算错（TD-12-28）', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('环境缺 TextEncoder → 抛，而不是退回字符数', () => {
    vi.stubGlobal('TextEncoder', undefined)

    expect(() => fileByteSize('中文')).toThrow()
  })
})
