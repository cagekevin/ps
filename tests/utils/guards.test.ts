import { describe, expect, it } from 'vitest'
import { isRecord } from '@/utils/guards'
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
