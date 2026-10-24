import { describe, expect, it } from 'vitest'
import { adaptFreePanelItem, LEGACY_KEY_ALIASES } from '@/domain/free-panel-legacy'
import type { FreePanelItem } from '@/domain/free-panel'
import { get } from '@/commands/registry'
import '@/commands'

/**
 * 常用页 ↔ 自由面板映射（T-86a 收编官方 key）。
 *
 * 两类断言：
 * 1. 官方 key（`cy_*` / `zdy_*`）→ 命令 id + payload 形状；
 * 2. **悬空引用闸门**：表里每条映射的 id 都必须已被 `defineCommand` 注册——
 *    否则 `/freePanel` 点下去只会得到一句骗人的「key 未适配」。
 */

function item(key: string, option: unknown): FreePanelItem {
  return {
    icon: '',
    type: '',
    key,
    btnId: 1,
    text: 'x',
    funcText: '',
    option,
    left: '',
    top: '',
    position: false,
  }
}

const OFFICIAL_KEYS = [
  'cy_embedImage',
  'cy_embedMultipleImage',
  'cy_importMultipleImage',
  'cy_optimizeDoc',
  'zdy_customBuildTransform',
  'cy_exportImage',
  'cy_batchExportLayer',
  'cy_batchExportSecondLayer',
  'cy_useGride',
  'cy_clearCutGuide',
  'cy_distributedByPitch',
]

describe('官方 key → 常用页命令', () => {
  it('cy_embedImage → commonUse.embedImage，option 原样（官方就是 {path,bLink2,bDelete}）', () => {
    const option = { path: 'C:/a.png', bLink2: -1, bDelete: false }
    expect(adaptFreePanelItem(item('cy_embedImage', option))).toEqual({
      id: 'commonUse.embedImage',
      payload: { options: option },
    })
  })

  it('cy_embedMultipleImage → commonUse.embedMultipleImages，无参', () => {
    expect(adaptFreePanelItem(item('cy_embedMultipleImage', null))).toEqual({
      id: 'commonUse.embedMultipleImages',
      payload: undefined,
    })
  })

  it('cy_importMultipleImage → commonUse.importMultipleImages，path 原样透传', () => {
    expect(
      adaptFreePanelItem(
        item('cy_importMultipleImage', { path: ['a.png', 'b.png'], toLinkObject: true }),
      ),
    ).toEqual({
      id: 'commonUse.importMultipleImages',
      payload: { path: ['a.png', 'b.png'], toLinkObject: true },
    })
  })

  it('zdy_customBuildTransform → commonUse.transform，7 个具名字段按定序拼成数组', () => {
    const option = {
      number: 2,
      angle: 15,
      leftRigth: '10px',
      topBottom: '5px',
      pointIndex: 3,
      scale: 100,
      opacity: 0,
    }
    expect(adaptFreePanelItem(item('zdy_customBuildTransform', option))).toEqual({
      id: 'commonUse.transform',
      payload: { params: [2, 15, '10px', '5px', 3, 100, 0] },
    })
  })

  it('三个导出 key 走同一个命令、不同 mode', () => {
    expect(adaptFreePanelItem(item('cy_exportImage', { a: 1 }))).toEqual({
      id: 'commonUse.exportImages',
      payload: { mode: 'image', options: { a: 1 } },
    })
    expect(adaptFreePanelItem(item('cy_batchExportLayer', null))).toEqual({
      id: 'commonUse.exportImages',
      payload: { mode: 'first', options: undefined },
    })
    expect(adaptFreePanelItem(item('cy_batchExportSecondLayer', null))).toEqual({
      id: 'commonUse.exportImages',
      payload: { mode: 'second', options: undefined },
    })
  })

  it('cy_useGride / cy_clearCutGuide 拆成两条命令', () => {
    expect(adaptFreePanelItem(item('cy_useGride', undefined))).toEqual({
      id: 'commonUse.referenceGuide',
      payload: { options: undefined },
    })
    expect(adaptFreePanelItem(item('cy_clearCutGuide', { w: 100 }))).toEqual({
      id: 'commonUse.referenceSlice',
      payload: { options: { w: 100 } },
    })
  })

  it('cy_distributedByPitch → commonUse.distribute，数组原样、非数组包一层', () => {
    expect(adaptFreePanelItem(item('cy_distributedByPitch', [0, 10, 1]))).toEqual({
      id: 'commonUse.distribute',
      payload: { params: [0, 10, 1] },
    })
    expect(adaptFreePanelItem(item('cy_distributedByPitch', 42))).toEqual({
      id: 'commonUse.distribute',
      payload: { params: [42] },
    })
  })

  it('未知 key 返回 null（由命令层报「key 未适配」）', () => {
    expect(adaptFreePanelItem(item('unknown.key', null))).toBeNull()
  })
})

describe('旧自造 key 的别名表', () => {
  it('7 条旧 key 全部指向官方 key', () => {
    expect(Object.keys(LEGACY_KEY_ALIASES)).toHaveLength(7)
    for (const [oldKey, officialKey] of Object.entries(LEGACY_KEY_ALIASES)) {
      expect(OFFICIAL_KEYS, `${oldKey} 应指向官方 key`).toContain(officialKey)
    }
  })

  it('旧 key 仍能解析出命令（不然用户机器上的旧项会变成「key 未适配」）', () => {
    const mapped = adaptFreePanelItem(item('commonUse.optimization', { optimizeAll: true }))
    expect(mapped).toEqual({
      id: 'commonUse.optimizeOnce',
      payload: { options: { optimizeAll: true } },
    })
  })
})

/**
 * 每个 key 喂一份**形状合法**的 option。
 *
 * 以前这里一律喂 `null`：`Number(null)` 算出 0 也能通过，于是"形状不合法"被掩盖了。
 * TD-12-24 之后数字位必须是真数字，闸门要审的是"映射指向的命令是否存在"，
 * 所以喂合法样本，别让校验挡住闸门本身（校验自己有专门用例：`free-panel-legacy-reject`）。
 */
const SAMPLE_OPTION: Record<string, unknown> = {
  zt_setFontSize: 24,
  zt_setFontLeading: 24,
  zt_setFontTracking: 0,
  zt_setLeftRightAlign: 0,
  zt_setUpDownAlign: 0,
  zt_changeTextBranchMerge: 1,
  zdy_customBuildTransform: {
    number: 1,
    angle: 0,
    leftRigth: '',
    topBottom: '',
    pointIndex: 0,
    scale: 1,
    opacity: 1,
  },
}

describe('悬空引用闸门：表里每个 id 都必须已注册', () => {
  it('11 个官方 key 解析出的 id 全部被 defineCommand 注册', () => {
    const missing: string[] = []
    for (const key of OFFICIAL_KEYS) {
      const mapped = adaptFreePanelItem(item(key, SAMPLE_OPTION[key] ?? null))
      expect(mapped, `${key} 应能解析`).toBeTruthy()
      if (!mapped || !get(mapped.id)) missing.push(`${key} → ${mapped?.id}`)
    }
    expect(missing, `这些映射指向了不存在的命令：\n${missing.join('\n')}`).toEqual([])
  })
})
