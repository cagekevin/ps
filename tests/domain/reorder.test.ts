import { describe, expect, it } from 'vitest'
import {
  applyItemDrop,
  applyListDrop,
  dropInsertIndex,
  isSameSlot,
  type DropMove,
} from '@/domain/reorder'

/**
 * 落点纯函数 —— 原版四分支 splice（`app.v4.js:50053-50065` 项 / `:50095-50107` 组）。
 *
 * 原版代码（项，`t` = 源组、`e` = 源下标、`moveEndIndex` = 落点、`n` = 那个布尔）：
 * ```js
 * list[t].splice(e, 1)
 * if (e > moveEndIndex[1] || t != moveEndIndex[0]) {
 *   if (n) splice(moveEndIndex[1], 0, item)      // 插前
 *   else   splice(moveEndIndex[1] + 1, 0, item)  // 插后
 * } else if (n) splice(moveEndIndex[1] - 1, 0, item)
 * else          splice(moveEndIndex[1], 0, item)
 * ```
 * 这里逐条对照。
 */
describe('dropInsertIndex：四分支', () => {
  it('同组向前（0 → 2）：插前 = 1、插后 = 2（源元素先删，目标前移一位）', () => {
    const base = { from: { group: 0, index: 0 }, to: { group: 0, index: 2 } }
    expect(dropInsertIndex({ ...base, position: 'before' })).toBe(1)
    expect(dropInsertIndex({ ...base, position: 'after' })).toBe(2)
  })

  it('同组向后（2 → 0）：插前 = 0、插后 = 1（目标在源前面，不受删除影响）', () => {
    const base = { from: { group: 0, index: 2 }, to: { group: 0, index: 0 } }
    expect(dropInsertIndex({ ...base, position: 'before' })).toBe(0)
    expect(dropInsertIndex({ ...base, position: 'after' })).toBe(1)
  })

  it('跨组：插前 = 目标下标、插后 = 目标下标 + 1', () => {
    const base = { from: { group: 0, index: 1 }, to: { group: 1, index: 3 } }
    expect(dropInsertIndex({ ...base, position: 'before' })).toBe(3)
    expect(dropInsertIndex({ ...base, position: 'after' })).toBe(4)
  })

  it('跨组但下标相同也按跨组算（不套同组向前那 -1）', () => {
    expect(
      dropInsertIndex({
        from: { group: 0, index: 1 },
        to: { group: 2, index: 1 },
        position: 'before',
      }),
    ).toBe(1)
  })
})

describe('applyListDrop：组排序', () => {
  const groups = ['A', 'B', 'C', 'D']

  it('同组向前插后：A 拖到 C 后面 → B C A D', () => {
    const list = [...groups]
    expect(applyListDrop(list, 0, 2, 'after')).toBe(2)
    expect(list).toEqual(['B', 'C', 'A', 'D'])
  })

  it('同组向后插前：D 拖到 B 前面 → A D B C', () => {
    const list = [...groups]
    expect(applyListDrop(list, 3, 1, 'before')).toBe(1)
    expect(list).toEqual(['A', 'D', 'B', 'C'])
  })

  it('原位：返回 -1 且数组不变', () => {
    const list = [...groups]
    expect(applyListDrop(list, 2, 2, 'after')).toBe(-1)
    expect(list).toEqual(groups)
  })

  it('越界抛错，不静默跳过', () => {
    expect(() => applyListDrop([...groups], 4, 0, 'before')).toThrow('不存在')
    expect(() => applyListDrop([...groups], 0, -1, 'before')).toThrow('不存在')
    expect(() => applyListDrop([...groups], 0, 1.5, 'before')).toThrow('不存在')
  })
})

describe('applyItemDrop：项排序（可跨组）', () => {
  function lists(): string[][] {
    return [
      ['a0', 'a1', 'a2'],
      ['b0', 'b1'],
    ]
  }

  it('同组向前插后：a0 → a1 之后 → a1 a0 a2', () => {
    const data = lists()
    const move: DropMove = {
      from: { group: 0, index: 0 },
      to: { group: 0, index: 1 },
      position: 'after',
    }
    expect(applyItemDrop(data, move)).toBe(1)
    expect(data[0]).toEqual(['a1', 'a0', 'a2'])
    expect(data[1]).toEqual(['b0', 'b1'])
  })

  it('同组向前插前：a2 → a0 之前 → a2 a0 a1', () => {
    const data = lists()
    applyItemDrop(data, {
      from: { group: 0, index: 2 },
      to: { group: 0, index: 0 },
      position: 'before',
    })
    expect(data[0]).toEqual(['a2', 'a0', 'a1'])
  })

  it('跨组插后：a1 → b0 之后 → 源组少一项、目标组多一项', () => {
    const data = lists()
    expect(
      applyItemDrop(data, {
        from: { group: 0, index: 1 },
        to: { group: 1, index: 0 },
        position: 'after',
      }),
    ).toBe(1)
    expect(data[0]).toEqual(['a0', 'a2'])
    expect(data[1]).toEqual(['b0', 'a1', 'b1'])
  })

  it('跨组插前：b0 → a2 之前', () => {
    const data = lists()
    applyItemDrop(data, {
      from: { group: 1, index: 0 },
      to: { group: 0, index: 2 },
      position: 'before',
    })
    expect(data[0]).toEqual(['a0', 'a1', 'b0', 'a2'])
    expect(data[1]).toEqual(['b1'])
  })

  it('原位返回 -1，两组都不变', () => {
    const data = lists()
    expect(
      applyItemDrop(data, {
        from: { group: 0, index: 1 },
        to: { group: 0, index: 1 },
        position: 'before',
      }),
    ).toBe(-1)
    expect(data).toEqual(lists())
  })

  it('组越界 / 项越界都抛错', () => {
    expect(() =>
      applyItemDrop(lists(), {
        from: { group: 9, index: 0 },
        to: { group: 0, index: 0 },
        position: 'before',
      }),
    ).toThrow('不存在')

    expect(() =>
      applyItemDrop(lists(), {
        from: { group: 0, index: 0 },
        to: { group: 1, index: 2 },
        position: 'before',
      }),
    ).toThrow('不存在')
  })
})

describe('isSameSlot', () => {
  it('同组同下标才算原位', () => {
    expect(isSameSlot({ group: 0, index: 1 }, { group: 0, index: 1 })).toBe(true)
    expect(isSameSlot({ group: 0, index: 1 }, { group: 1, index: 1 })).toBe(false)
    expect(isSameSlot({ group: 0, index: 1 }, { group: 0, index: 2 })).toBe(false)
  })
})
