import { describe, expect, it } from 'vitest'
import { sortQuickFont, toQuickFont } from '@/domain/quick-font'
import type { QuickFont } from '@/domain/font-set-config'

/**
 * 三个平行数组的**长度契约**。
 *
 * 以前没有契约：`asArray` 在缺字段时给 `[]`，`sortQuickFont` 按 zz 的下标去取 mz/hjm，
 * 取到 `undefined` 直接进 `string[]`，然后被 **JSON 写进用户的 `sj_fontSet.json`**
 * （`JSON.stringify` 把 undefined 变成 null），报错要等到几天后点「应用」才出现。
 *
 * 现在的行为是**拒绝**，理由见 `requireAligned` 的注释（截断＝替生产者编造对齐方式 + 不可逆丢字重）。
 */
function quick(over: Partial<QuickFont> = {}): QuickFont {
  return {
    family: 'MiSans',
    name: 'MiSans',
    scriptName: 'MiSans-Regular',
    zz: ['Regular', 'Bold'],
    mz: ['MiSans', 'MiSans Bold'],
    hjm: ['MiSans-Regular', 'MiSans-Bold'],
    ...over,
  }
}

describe('quick-font 平行数组长度契约', () => {
  it('等长：照常排序（按权重顺序重排三个数组）', () => {
    const sorted = sortQuickFont(quick({ zz: ['Bold', 'Regular'] }))
    expect(sorted.zz).toEqual(['Regular', 'Bold'])
    expect(sorted.mz).toEqual(['MiSans Bold', 'MiSans']) // 跟着 zz 一起换位
    expect(sorted.hjm).toEqual(['MiSans-Bold', 'MiSans-Regular'])
  })

  it('hjm 短一格 → 拒绝，并点名家族名与三个长度', () => {
    expect(() => sortQuickFont(quick({ hjm: ['MiSans-Regular'] }))).toThrow(/MiSans/)
    expect(() => sortQuickFont(quick({ hjm: ['MiSans-Regular'] }))).toThrow(/2\/2\/1/)
    expect(() => sortQuickFont(quick({ hjm: ['MiSans-Regular'] }))).toThrow(/已拒绝写入快选/)
  })

  it('mz 是空数组（缺字段的典型表现）→ 拒绝，不产出 null', () => {
    expect(() => sortQuickFont(quick({ mz: [] }))).toThrow(/数量不一致/)
  })

  it('toQuickFont 同样走这条契约（从系统字体转快选项时就拦住）', () => {
    expect(() =>
      toQuickFont({
        family: 'X',
        weights: ['Regular', 'Bold'],
        names: ['X'],
        postScriptNames: ['X-Regular', 'X-Bold'],
        star: 0,
      }),
    ).toThrow(/X/)
  })
})
