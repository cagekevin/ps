import { describe, expect, it } from 'vitest'
import { decodeKuData, kuShapeOf, resolveKuGroups } from '@/domain/ku-format'

/** 测试内的 base64 解码（真实现是 cep/fs.b64ToUtf8，这里只要"能把载荷还原成文本"） */
function decode(base64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
}

const GROUPS = '[{"name":"gray","show":true,"list":[]}]'
const B64 = btoa(GROUPS)

describe('ku-format 形态分派', () => {
  it('裸组数组 → groups', () => {
    expect(kuShapeOf(JSON.parse(GROUPS))).toMatchObject({ shape: 'groups' })
  })

  it('扁平清单 → flat；容器 → container', () => {
    expect(kuShapeOf([{ name: 'a', data: B64 }])).toMatchObject({ shape: 'flat' })
    expect(kuShapeOf({ arrFileData: [{ name: 'a', data: B64 }], store: {} })).toMatchObject({
      shape: 'container',
    })
  })

  it('既不数组也没 arrFileData → null', () => {
    expect(kuShapeOf({ store: {} })).toBeNull()
    expect(kuShapeOf('文字')).toBeNull()
  })
})

describe('ku-format 载荷提取', () => {
  it('groups 直接用', () => {
    const read = resolveKuGroups(JSON.parse(GROUPS), decode)
    expect(read.groups).toHaveLength(1)
    expect(read.note).toBe('')
  })

  it('flat 取 [0] 的 data', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: B64 }], decode)
    expect(read.groups?.[0]).toMatchObject({ name: 'gray' })
  })

  it('container 只认 sj_ku* 前缀，跳过旁路图', () => {
    const read = resolveKuGroups(
      {
        arrFileData: [
          { name: 'kuStyle/YS1.psd', data: false },
          { name: 'sj_kuSty1.ini', data: B64 },
        ],
        store: {},
      },
      decode,
    )
    expect(read.groups?.[0]).toMatchObject({ name: 'gray' })
  })

  it('data 是布尔 false → 跳过并给 note（不许当空库）', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: false }], decode)
    expect(read.groups).toBeNull()
    expect(read.note).toContain('读取失败')
  })

  it('容器里没有库文件 → note', () => {
    const read = resolveKuGroups(
      { arrFileData: [{ name: 'kuStyle/YS1.psd', data: false }] },
      decode,
    )
    expect(read.groups).toBeNull()
    expect(read.note).toContain('没有样式库文件')
  })

  it('内层不是合法 JSON → note', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: btoa('not json') }], decode)
    expect(read.groups).toBeNull()
    expect(read.note).toContain('不是合法 JSON')
  })
})

describe('decodeKuData', () => {
  it('非字符串一律拒（布尔 false 直接 base64 解码会抛）', () => {
    expect(decodeKuData(false, decode)).toBeNull()
    expect(decodeKuData(0, decode)).toBeNull()
    expect(decodeKuData(undefined, decode)).toBeNull()
    expect(decodeKuData('', decode)).toBeNull()
  })

  it('带换行的 base64 也能解（三份样本两种形态并存）', () => {
    const wrapped = B64.replace(/(.{10})/g, '$1\n')
    expect(decodeKuData(wrapped, decode)).toBe(GROUPS)
  })
})
