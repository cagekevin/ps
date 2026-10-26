import { describe, expect, it } from 'vitest'
import {
  RENAME_MARKS,
  addGroupAt,
  addItemAt,
  buildReplaceExpression,
  changeItemAt,
  checkExpression,
  clearMarks,
  deleteGroupAt,
  deleteItemAt,
  insertMark,
  isGroupEditable,
  parsePreset,
  pushHistory,
  renameGroupAt,
  seedPreset,
  toggleGroupAt,
  type RenamePreset,
} from '@/domain/rename'
import { isDecodeFail, type DecodeFail, type Decoded } from '@/utils/decode'

/**
 * 重命名预设的规则层（`domain/rename.ts`）。
 *
 * 断言的依据都在原版源码里：表达式标记 app.v4.js:57078、删标记顺序 :57080-57089、
 * 第 0 组守卫 :56871/:56876、历史上限 :56822-56834、旧格式 :57051-57071。
 */

function preset(): RenamePreset {
  return [
    { name: '最近使用', show: false, list: ['%n背景层', '%n'] },
    { name: '序列', show: true, list: ['%n', '%%n'] },
    { name: '第二组', show: true, list: ['收%nn'] },
  ]
}

describe('表达式标记', () => {
  it('标记全集与顺序对齐原版 :57078', () => {
    expect(RENAME_MARKS.map((item) => item.mark)).toEqual([
      '%n',
      '%nn',
      '%%n',
      '%%nn',
      '%n=',
      '###',
    ])
  })

  it('插入前先删旧标记，长标记优先（%%nn 不会被 %%n 拆坏）', () => {
    expect(insertMark('%%nn', '%n')).toBe('%n')
    expect(insertMark('收%nn', '%n')).toBe('收%n')
    expect(insertMark('a%nb', '%%n')).toBe('ab%%n')
  })

  it('clearMarks 全删而不只删第一处', () => {
    expect(clearMarks('%n-%n-%n')).toBe('--')
  })

  it('纯空白算空（原版 checkVal 先 replace(/\\s*/g, "")，:57269）', () => {
    expect(checkExpression('')).toBe('不能输入空字符哦')
    expect(checkExpression('   ')).toBe('不能输入空字符哦')
    expect(checkExpression('%n')).toBe('')
  })

  it('替换模式拼成 `原=>新`（原版 :57264）', () => {
    expect(buildReplaceExpression('文字', '文字2')).toBe('文字=>文字2')
    expect(buildReplaceExpression('文字', '')).toBe('文字=>')
  })
})

describe('第 0 组是固定组', () => {
  it('下标 0 与越界都不可编辑（原版 :56881 用 && 是 bug，我们改 ||）', () => {
    expect(isGroupEditable(0, 3)).toBe(false)
    expect(isGroupEditable(1, 3)).toBe(true)
    expect(isGroupEditable(3, 3)).toBe(false)
    expect(isGroupEditable(-1, 3)).toBe(false)
  })

  it('改名 / 删除 / 加项 / 改项 / 删项 全部拒绝组 0', () => {
    const data = preset()
    expect(() => renameGroupAt(data, 0, 'x')).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() => deleteGroupAt(data, 0)).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() => addItemAt(data, 0, '%n')).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() => changeItemAt(data, 0, 0, 'x')).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() => deleteItemAt(data, 0, 0)).toThrow(expect.objectContaining({ code: 'PARSE' }))
  })

  it('组 1 的同类操作正常生效', () => {
    const data = preset()
    expect(renameGroupAt(data, 1, '新名')[1].name).toBe('新名')
    expect(deleteGroupAt(data, 1)).toHaveLength(2)
    expect(addItemAt(data, 1, '%%nn')[1].list).toEqual(['%n', '%%n', '%%nn'])
    expect(changeItemAt(data, 1, 0, '改')[1].list[0]).toBe('改')
    expect(deleteItemAt(data, 1, 0)[1].list).toEqual(['%%n'])
  })

  it('组 0 可以展开收起（原版 latelyUsed 不设守卫，:57005）', () => {
    expect(toggleGroupAt(preset(), 0)[0].show).toBe(true)
  })
})

describe('分组与预设的序', () => {
  it('新建分组：指定下标插到后面，不指定追加（原版 :56855-56866）', () => {
    const data = preset()
    expect(addGroupAt(data, '新', 1).map((g) => g.name)).toEqual([
      '最近使用',
      '序列',
      '新',
      '第二组',
    ])
    expect(addGroupAt(data, '新').map((g) => g.name)).toEqual(['最近使用', '序列', '第二组', '新'])
  })

  it('组名为空要报错', () => {
    expect(() => addGroupAt(preset(), '   ')).toThrow('请输入组名')
  })
})

describe('最近使用（原版 addHistory，:56822-56834）', () => {
  it('去重后插到最前，最多 8 条', () => {
    let data = preset()
    data = pushHistory(data, '%n背景层')
    expect(data[0].list).toEqual(['%n背景层', '%n'])

    for (let i = 0; i < 12; i++) data = pushHistory(data, `表达式${i}`)
    expect(data[0].list).toHaveLength(8)
    expect(data[0].list[0]).toBe('表达式11')
  })
})

describe('.cmm 导入导出', () => {
  /** 只关心成功臂：失败时直接抛（带上 `fail`），不让 `undefined.xxx` 在下一行炸 */
  function unwrap<T>(out: Decoded<T> | DecodeFail): T {
    if (isDecodeFail(out)) throw new Error(`预期成功，实际失败：${out.fail}`)
    return out.value
  }

  it('导出就是 JSON.stringify（原版 :57022）', () => {
    const text = JSON.stringify(preset())
    expect(unwrap(parsePreset(text))[1].list).toEqual(['%n', '%%n'])
  })

  it('旧格式 `<z>` / `<>` 兼容读取（原版 :57051-57071）', () => {
    // 组之间用 <z>，组名与条目之间用 <>；末尾多一个 <z>，原版 pop 掉
    const legacy = '最近使用<>%n<>%%n<z>序列<z>'
    expect(unwrap(parsePreset(legacy))).toEqual([
      { name: '最近使用', show: true, list: ['%n', '%%n'] },
      { name: '序列', show: true, list: [] },
    ])
  })

  it('形状不对或不是预设 → 可枚举失败，不把坏数据当预设用', () => {
    expect(parsePreset('{"a":1}')).toMatchObject({ fail: 'shape', expected: 'object' })
    expect(parsePreset('[{"name":1}]')).toMatchObject({ fail: 'shape', expected: 'object' })
    expect(parsePreset('随便一段文字')).toMatchObject({ fail: 'notJson' })
  })
})

describe('种子数据', () => {
  it('两组：最近使用 5 条 + 序列 4 条（原版 :56807-56816）', () => {
    const seed = seedPreset()
    expect(seed).toHaveLength(2)
    expect(seed[0]).toMatchObject({ name: '最近使用', show: false })
    expect(seed[0].list).toHaveLength(5)
    expect(seed[0].list).toContain('倒叙演示%%N')
    expect(seed[1]).toMatchObject({ name: '序列', show: true })
    expect(seed[1].list).toEqual(['%n', '%%n', '%n###', '%%n###'])
  })
})
