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
    expect(kuShapeOf(JSON.parse(GROUPS))).toMatchObject({ value: { shape: 'groups' } })
  })

  it('扁平清单 → flat；容器 → container', () => {
    expect(kuShapeOf([{ name: 'a', data: B64 }])).toMatchObject({ value: { shape: 'flat' } })
    expect(kuShapeOf({ arrFileData: [{ name: 'a', data: B64 }], store: {} })).toMatchObject({
      value: { shape: 'container' },
    })
  })

  it('既不是数组也没有 arrFileData → 可枚举的失败（不再是一句 null）', () => {
    expect(kuShapeOf({ store: {} })).toMatchObject({ fail: 'shape', field: 'arrFileData' })
    expect(kuShapeOf('文字')).toMatchObject({ fail: 'shape', field: '' })
  })

  it('数组里混了非对象 → badItem 带个数（`[42]` 不是"三个组"）', () => {
    expect(kuShapeOf([42])).toMatchObject({ fail: 'badItem', count: 1 })
  })
})

describe('ku-format 载荷提取', () => {
  it('groups 直接用', () => {
    const read = resolveKuGroups(JSON.parse(GROUPS), decode)

    expect(read).toMatchObject({ value: [{ name: 'gray' }] })
  })

  it('flat 取 [0] 的 data', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: B64 }], decode)

    expect(read).toMatchObject({ value: [{ name: 'gray' }] })
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

    expect(read).toMatchObject({ value: [{ name: 'gray' }] })
  })

  /**
   * 收口后失败是**判别联合**：原来四种原因（内层读不到 / 结构不认识 / 不是 JSON / 有非对象项）
   * 都被压成 `{ groups: null, note: '一句话' }`，调用方只能统一报"读不懂"。
   */
  it('data 是布尔 false → emptyContent（不许当空库）', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: false }], decode)

    expect(read).toEqual({ fail: 'emptyContent' })
  })

  it('容器里没有库文件 → emptyContent', () => {
    const read = resolveKuGroups(
      { arrFileData: [{ name: 'kuStyle/YS1.psd', data: false }] },
      decode,
    )

    expect(read).toEqual({ fail: 'emptyContent' })
  })

  it('内层不是合法 JSON → notJson（与「容器里没有库文件」不再同形）', () => {
    const read = resolveKuGroups([{ name: 'sj_kuSty1.ini', data: btoa('not json') }], decode)

    expect(read).toEqual({ fail: 'notJson' })
  })
})

describe('decodeKuData', () => {
  it('非字符串 / 空串 → `emptyContent`（可枚举的"没有内容"，不是 null）', () => {
    expect(decodeKuData(false, decode)).toEqual({ fail: 'emptyContent' })
    expect(decodeKuData(0, decode)).toEqual({ fail: 'emptyContent' })
    expect(decodeKuData(undefined, decode)).toEqual({ fail: 'emptyContent' })
    expect(decodeKuData('', decode)).toEqual({ fail: 'emptyContent' })
    expect(decodeKuData('  \n ', decode)).toEqual({ fail: 'emptyContent' })
  })

  it('带换行的 base64 也能解（三份样本两种形态并存）', () => {
    const wrapped = B64.replace(/(.{10})/g, '$1\n')
    expect(decodeKuData(wrapped, decode)).toEqual({ value: GROUPS })
  })
})
