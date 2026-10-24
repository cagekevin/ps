import { describe, expect, it } from 'vitest'
import { getPref, setPref, type PrefKey } from '@/cep/data/settings'

/**
 * TD-10-12：偏好键是**有名字的类型**，不是 `Record<string, unknown>`。
 *
 * 这条债的验收靠 `typecheck`：拼错键名必须红。这里是运行期的一半——
 * 真按登记过的键读写，且默认值只在"键不存在"时生效（不是"值为假"时）。
 * 键名拼错的情况由 `npm run typecheck` 覆盖（探针里贴了输出）。
 */
const KEY: PrefKey = 'font.previewMode'

describe('偏好键（PrefKey）', () => {
  it('登记过的键能写能读', () => {
    setPref(KEY, 'large')
    expect(getPref(KEY, 'small')).toBe('large')
  })

  it('没写过的键回退默认值（"不存在"才回退，不是"值为假"）', () => {
    expect(getPref('nav.hidden', ['fallback'])).toEqual(['fallback'])
    setPref('nav.hidden', [])
    expect(getPref<string[]>('nav.hidden', ['fallback'])).toEqual([])
    setPref('nav.hidden', false)
    expect(getPref<boolean>('nav.tips', true)).toBe(true)
  })

  it('键名清单本身就是"类型"：`PrefKey` 覆盖的键都能直接用（编译期）', () => {
    // 这一行只是让 tsc 把每个键都过一遍；运行期不需要断言值
    const keys: PrefKey[] = [
      'nav.hidden',
      'nav.tips',
      'nav.hoverSwitch',
      'nav.autoJump',
      'font.previewMode',
      'font.previewText',
      'styleShowTab',
      'action.guideDone',
      'cmmSwitchindex',
      'cmmShowColorSign',
      'dzShowListType',
      'commonUse.collapsed',
      'cloud.pending',
      'cloud.gasUrl',
      'cloud.autoSync',
    ]
    for (const key of keys) setPref(key, getPref(key, null))
    expect(keys).toHaveLength(15)
  })
})
