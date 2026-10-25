import { describe, expect, it } from 'vitest'
import { isArrayOf, isRecord, isUnknownArray } from '@/utils/guards'
import { readStyleWarehouseIndex } from '@/domain/style-library'

/**
 * TD-09-17：`isRecord` 只留一份（原来 `domain/ku-io`、`domain/style-library`、
 * `data/style-library-repo`、`data/style-library-io` 各写一遍）。
 * 这条用例钉住它的语义 + 至少一个真实消费者，改坏唯一那份会红。
 */
describe('isRecord', () => {
  it('普通对象算，数组/null/原始值不算', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord([{ a: 1 }])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord('x')).toBe(false)
    expect(isRecord(42)).toBe(false)
  })

  it('真实消费者：索引结构不对时给默认值 + 说明为什么（不是当数据用）', () => {
    const read = readStyleWarehouseIndex([])
    // 数组不是索引：`list` 落到默认仓库，且 degraded 说明原因（不许静默当数据）
    expect(read.value.list).toHaveLength(1)
    expect(read.degraded).not.toBe('')
  })
})
/**
 * `Array.isArray(x: unknown)` 在 TS 里收窄成 `any[]` —— `any` 会从这儿流进类型世界。
 * 这两个守卫把谓词写成 `unknown[]` / `T[]`，运行时判据与 `Array.isArray` 完全一致。
 */
describe('isUnknownArray', () => {
  it('只判"是不是数组"，元素形状不管（这才是 Array.isArray 的原语义）', () => {
    expect(isUnknownArray([])).toBe(true)
    expect(isUnknownArray([1, null, 'x', {}])).toBe(true)
    expect(isUnknownArray({ length: 0 })).toBe(false)
    expect(isUnknownArray('[]')).toBe(false)
    expect(isUnknownArray(null)).toBe(false)
  })
})

describe('isArrayOf', () => {
  it('逐元素证明：只要有一个元素不满足，整体就不算', () => {
    expect(isArrayOf([{}, {}], isRecord)).toBe(true)
    expect(isArrayOf([], isRecord)).toBe(true)
    expect(isArrayOf([{}, 1], isRecord)).toBe(false)
    expect(isArrayOf([null], isRecord)).toBe(false)
    expect(isArrayOf([[]], isRecord)).toBe(false)
    expect(isArrayOf({ 0: {} }, isRecord)).toBe(false)
  })
})
