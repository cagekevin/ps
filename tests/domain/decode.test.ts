import { describe, expect, it } from 'vitest'
import { decodeActionLibrary, decodeActionWarehouseIndex } from '@/domain/action'
import { decodeCommonUseFile } from '@/domain/common-use'
import { decodeFreePanelFile } from '@/domain/free-panel'
import {
  decodeHierarchyFile,
  decodeQuickFontFile,
  decodeTranslateCounter,
} from '@/domain/font-set-config'
import { decodeRenamePreset } from '@/domain/rename'
import { decodeStyleWarehouseIndex } from '@/domain/style-library'

/**
 * TD-03-5 的验收：读边界只有一条形状通道，**坏形状一个字段都不许进业务**。
 *
 * 三条 P0 判据（测试规范：P0 = 白屏 / 丢数据 / 静默失败）：
 * 1. 容器不认识 → `null`（仓库转 `ok:false` + reason，用户看得见）；
 * 2. **条目不认识 → 整份 `null`**，不是丢掉坏条目后把剩下的写回磁盘（那是丢数据）；
 * 3. 合法形状（含官方旧形状 `{ info: [...] }`）→ 逐值读回，不许多加字段。
 */
describe('读边界 decode（唯一形状通道）', () => {
  it('动作仓库索引：{index,list:[{name,fileName}]} 读得懂；容器/条目坏 → 整份 null', () => {
    const ok = decodeActionWarehouseIndex({
      index: 0,
      list: [{ name: '预设', fileName: 'sj_dz1.json' }],
    })
    expect(ok?.value.list).toEqual([{ name: '预设', fileName: 'sj_dz1.json' }])

    expect(decodeActionWarehouseIndex([])).toBeNull()
    expect(decodeActionWarehouseIndex({ index: 0, list: '不是数组' })).toBeNull()
    // 条目缺 fileName → 整份拒绝（不是丢掉它继续）
    expect(decodeActionWarehouseIndex({ index: 0, list: [{ name: '预设' }] })).toBeNull()
  })

  it('动作库：裸数组与旧 {info:[...]} 都读得懂；其它 → null', () => {
    const groups = [{ groupName: 'A', show: true, list: [{ group: 'A', name: 'a' }] }]

    expect(decodeActionLibrary(groups)?.value).toEqual(groups)
    expect(decodeActionLibrary({ info: groups })?.value).toEqual(groups)
    expect(decodeActionLibrary({ a: 1 })).toBeNull()
    expect(decodeActionLibrary('x')).toBeNull()
    // 文件内容是 null 也是坏文件：不许当空库（否则 update 会把 [] 写回磁盘）
    expect(decodeActionLibrary(null)).toBeNull()
  })

  it('常用页：裸数组与官方旧形状 {info:[...]} 都读得懂；非对象条目 → 整份 null', () => {
    expect(decodeCommonUseFile([{ id: 'div_img' }])?.value).toEqual([{ id: 'div_img' }])
    expect(decodeCommonUseFile({ info: [{ id: 'div_img' }] })?.value).toEqual([{ id: 'div_img' }])
    expect(decodeCommonUseFile({})).toBeNull()
    expect(decodeCommonUseFile([{ id: 'a' }, 1])).toBeNull()
  })

  it('快捷字体 / 层级：容器必须是 {index,list:[对象]}；层级条目要 name+data[]', () => {
    expect(decodeQuickFontFile({ index: 1, list: [{ family: 'MiSans' }] })?.value.index).toBe(1)
    expect(decodeQuickFontFile({ index: 1, list: [1] })).toBeNull()
    expect(decodeQuickFontFile(null)).toBeNull()

    const preset = { name: '六级', data: [12, 14, 16, 18, 20, 24] }
    expect(decodeHierarchyFile({ index: 0, list: [preset] })?.value.list).toEqual([preset])
    expect(decodeHierarchyFile({ index: 0, list: [{ name: '六级' }] })).toBeNull()
  })

  it('翻译计数：三个字段缺一个就不认识（不补默认值）', () => {
    expect(decodeTranslateCounter({ num: 1, max: 100, time: '25202610' })?.value.num).toBe(1)
    expect(decodeTranslateCounter({ num: 1, max: 100 })).toBeNull()
    expect(decodeTranslateCounter({ num: '1', max: 100, time: 'x' })).toBeNull()
    expect(decodeTranslateCounter([])).toBeNull()
  })

  it('重命名预设：必须是 [{name,list}]；坏条目 → 整份 null', () => {
    expect(decodeRenamePreset([{ name: 'A', show: true, list: ['x'] }])?.value).toHaveLength(1)
    expect(decodeRenamePreset([{ name: 'A' }])).toBeNull()
    expect(decodeRenamePreset({ a: 1 })).toBeNull()
  })

  it('样式库索引：容器不认识 → null（不折成"新用户默认索引"）', () => {
    expect(
      decodeStyleWarehouseIndex({ index: 0, list: [{ name: '默认仓库' }] })?.value.list,
    ).toHaveLength(1)
    expect(decodeStyleWarehouseIndex({ a: 1 })).toBeNull()
    expect(decodeStyleWarehouseIndex('{}')).toBeNull()
  })

  it('自由面板：不是 {obj:{list:[...]}} 就 null（形状判据复用 readFreePanelFile）', () => {
    expect(decodeFreePanelFile({})).toBeNull()
    expect(decodeFreePanelFile({ obj: { list: '不是数组' } })).toBeNull()
    expect(decodeFreePanelFile([{ id: 1 }])).toBeNull()
  })
})
