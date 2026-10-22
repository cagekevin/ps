import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { md5 } from '@/utils/md5'

/** 与 Node 的标准实现对照（UTF-8，含 4 字节码点） */
function reference(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex')
}

describe('md5', () => {
  it('标准空串与短串向量', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('长串向量（跨 block）', () => {
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe(
      '9e107d9d372bb6826bd81d3542a419d6',
    )
  })

  it('中文按 UTF-8 编码', () => {
    expect(md5('你好')).toBe('7eca689f0d3389d9dea66ae112e5cfd7')
  })

  it('与 Node 标准实现一致（含代理对/表情）', () => {
    for (const text of ['设计 Assistant', '😀', 'a😀b', '𠮷野家']) {
      expect(md5(text)).toBe(reference(text))
    }
  })
})
