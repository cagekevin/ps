// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveKuGroups } from '@/domain/ku-format'
import { sortQuickFont } from '@/domain/quick-font'
import {
  addGroupAt,
  deleteGroupAt,
  pushHistory,
  renameGroupAt,
  toggleGroupAt,
} from '@/domain/rename'
import type { RenamePreset } from '@/domain/rename'

/**
 * domain 里"裸数组取值"的**边界**。
 *
 * 判据不是"加一堆 `?? 默认值`"，而是每条取值都要能回答：越界时会发生什么，谁保证它不可达。
 * 结论分两类，两类都在这里钉住：
 *  · **调用点已保证不可达**（有不变式/守卫）→ 用一条越界用例证明它给的是"拒绝"而不是崩溃或静默；
 *  · 没保证的 → 补守卫（本轮没有需要补的，全部有守卫）。
 */

const decode = (s: string) => Buffer.from(s, 'base64').toString('utf8')

describe('ku-format：扁平清单为空 / 容器里没有库文件', () => {
  it('空数组 → 当成"空库"而不是报错（`[0]` 是 undefined，形态判断不崩）', () => {
    expect(resolveKuGroups([], decode)).toEqual({ value: [] })
  })

  it('组数组里有非对象项 → 报 `badItem` + 个数，不是把 42 当组交下去', () => {
    // 顶层是数组、元素不是对象 ⇒ 是"项坏了"，不是"不是数组"。
    // 断 `badItem` + `count`：说得出坏了几项，才不用人去猜是形态错还是内容错。
    expect(resolveKuGroups([42], decode)).toMatchObject({ fail: 'badItem', count: 1 })
    expect(resolveKuGroups([{ name: 'a', list: [] }, null], decode)).toMatchObject({
      fail: 'badItem',
      count: 2,
    })
  })

  it('正常组数组 → 原样交出', () => {
    const groups = [{ name: 'a', show: true, list: [] }]

    expect(resolveKuGroups(groups, decode)).toEqual({ value: groups })
  })

  it('容器里没有库文件 → emptyContent（"没有内容"，不是"期望数组"）', () => {
    const container = { arrFileData: [{ name: '旁路图.kup', data: '' }] }

    expect(resolveKuGroups(container, decode)).toEqual({ fail: 'emptyContent' })
  })
})

describe('rename：分组下标越界', () => {
  const preset: RenamePreset = [
    { name: '最近使用', show: true, list: [] },
    { name: '我的组', show: true, list: [] },
  ]

  it('renameGroupAt 越界 → PARSE，不是 "Cannot set properties of undefined"', () => {
    expect(() => renameGroupAt(preset, 9, 'x')).toThrow(/分组/)
    expect(() => renameGroupAt(preset, 9, 'x')).not.toThrow(/Cannot set/)
  })

  it('renameGroupAt 第 0 组（固定组）→ 拒绝', () => {
    expect(() => renameGroupAt(preset, 0, 'x')).toThrow(/固定组/)
  })

  it('deleteGroupAt / toggleGroupAt 越界 → PARSE', () => {
    expect(() => deleteGroupAt(preset, 9)).toThrow(/分组/)
    expect(() => toggleGroupAt(preset, 9)).toThrow(/分组/)
  })

  it('addGroupAt 的 afterIndex 越界 → 追加到末尾（不 splice 到不存在的下标）', () => {
    const next = addGroupAt(preset, '新组', 99)
    expect(next).toHaveLength(3)
    expect(next[2].name).toBe('新组')
  })

  it('pushHistory 的分组数组为空 → PARSE（不写 undefined.list）', () => {
    expect(() => pushHistory([], 'a+b')).toThrow(/最近使用分组缺失/)
  })
})

describe('quick-font：下标来自自身映射，恒在界内', () => {
  it('三个等长数组排序后长度不变（order 只由 zz 的长度生成）', () => {
    const sorted = sortQuickFont({
      family: 'X',
      name: 'X',
      scriptName: 'X-R',
      zz: ['Bold', 'Regular'],
      mz: ['X B', 'X R'],
      hjm: ['X-B', 'X-R'],
    })
    expect(sorted.zz).toHaveLength(2)
    expect(sorted.mz).toHaveLength(2)
    expect(sorted.hjm).toHaveLength(2)
  })
})
