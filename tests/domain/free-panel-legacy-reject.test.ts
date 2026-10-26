import { describe, expect, it } from 'vitest'
import { adaptFreePanelItem } from '@/domain/free-panel-legacy'
import { isDecodeFail } from '@/utils/decode'

/** 取成功臂：`adaptFreePanelItem` 返回 `Decoded<LegacyCommand> | DecodeFail` */
const adapt = (item: Parameters<typeof adaptFreePanelItem>[0]) => {
  const out = adaptFreePanelItem(item)
  if (isDecodeFail(out)) throw new Error(`预期成功，实际失败：${out.fail}`)
  return out.value
}

/**
 * 自由面板项是**用户数据**（`sj_appFreePanel.json`），形状不可信。
 *
 * 以前 `Number(option)` 会把 `'abc'` 算成 `NaN` 直接送进 jsx，`null`/`''` 悄悄变成 0——
 * 一个假数字带着"肯定没错"的类型跑到 PS 那一侧。现在在**入口当场拒绝**，
 * 并且理由里必须点出是哪个字段、原值是什么（否则用户只会看到"执行失败"）。
 */
describe('自由面板派发：入口形状校验', () => {
  it('option 不是数字 → 抛 PARSE，理由点出 key 与原值', () => {
    expect(() => adapt({ key: 'zt_changeTextBranchMerge', option: 'abc' } as never)).toThrow(
      /zt_changeTextBranchMerge/,
    )
    expect(() => adapt({ key: 'zt_changeTextBranchMerge', option: 'abc' } as never)).toThrow(/abc/)
    expect(() => adapt({ key: 'zt_changeTextBranchMerge', option: 'abc' } as never)).toThrow(
      /不是有效数字/,
    )
  })

  it('null / 空串也不许当成 0（那是"第 0 档"，不是"没填"）', () => {
    for (const bad of [null, '', undefined]) {
      expect(() => adapt({ key: 'zt_setFontSize', option: bad } as never)).toThrow(/不是有效数字/)
    }
  })

  it('合法数字照常通过（含数字字符串，原版面板写的就是字符串）', () => {
    expect(adapt({ key: 'zt_changeTextBranchMerge', option: '1' } as never)).toEqual({
      id: 'fontSet.split',
      payload: { mode: 1 },
    })
    expect(adapt({ key: 'zt_setFontSize', option: 24 } as never)).toEqual({
      id: 'fontSet.fontSize',
      payload: { value: 24 },
    })
  })

  it('7 字段变形：字段不是数字时点名是哪一个', () => {
    const good = {
      number: '1',
      angle: 2,
      leftRigth: 'left',
      topBottom: 'top',
      pointIndex: 3,
      scale: 4,
      opacity: 5,
    }
    expect(adapt({ key: 'zdy_customBuildTransform', option: good } as never)).toMatchObject({
      id: 'commonUse.transform',
    })

    expect(() =>
      adapt({
        key: 'zdy_customBuildTransform',
        option: { ...good, opacity: 'abc' },
      } as never),
    ).toThrow(/opacity/)
  })
})
