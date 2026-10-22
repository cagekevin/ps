import { describe, expect, it } from 'vitest'
import { adaptFreePanelItem } from '@/domain/free-panel-legacy'
import type { FreePanelItem } from '@/domain/free-panel'

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

describe('自由面板 → 常用页命令映射', () => {
  it('embed 映射到 commonUse.embedImage', () => {
    expect(adaptFreePanelItem(item('commonUse.embed', { autoEmbedOnDrop: true }))).toEqual({
      id: 'commonUse.embedImage',
      payload: { options: { autoEmbedOnDrop: true } },
    })
  })

  it('customChange 映射到 commonUse.transform，参数原样带出', () => {
    const params = [1, 0, '0px', '0px', 0, 100, 0]
    expect(adaptFreePanelItem(item('commonUse.customChange', { params }))).toEqual({
      id: 'commonUse.transform',
      payload: { params },
    })
  })

  it('spacing 映射到 commonUse.distribute', () => {
    expect(adaptFreePanelItem(item('commonUse.spacing', { params: [0, 10, 1] }))).toEqual({
      id: 'commonUse.distribute',
      payload: { params: [0, 10, 1] },
    })
  })

  it('export 映射到 commonUse.exportImages', () => {
    expect(
      adaptFreePanelItem(item('commonUse.export', { mode: 'first', options: { a: 1 } })),
    ).toEqual({
      id: 'commonUse.exportImages',
      payload: { mode: 'first', options: { a: 1 } },
    })
  })

  it('reference 映射到 commonUse.referenceLines', () => {
    expect(adaptFreePanelItem(item('commonUse.reference', { action: 'clear' }))).toEqual({
      id: 'commonUse.referenceLines',
      payload: { action: 'clear', options: undefined },
    })
  })
})
