import { describe, expect, it } from 'vitest'
import { adaptFreePanelItem } from '@/domain/free-panel-legacy'
import type { FreePanelItem } from '@/domain/free-panel'

function item(key: string, option: unknown): FreePanelItem {
  return {
    icon: '',
    type: '',
    key,
    btnId: 1,
    text: key,
    funcText: '',
    option,
    left: '',
    top: '',
    position: false,
  }
}

describe('free-panel legacy adapter', () => {
  it('dz_useAction → action.call，payload 原样', () => {
    const option = { group: '常用', name: 'ps批量导出' }
    expect(adaptFreePanelItem(item('dz_useAction', option))).toEqual({
      id: 'action.call',
      payload: option,
    })
  })

  it('zt_translate 的 delete → replace', () => {
    expect(
      adaptFreePanelItem(item('zt_translate', { from: 'auto', to: 'en', delete: false })),
    ).toEqual({
      id: 'fontSet.translate',
      payload: { from: 'auto', to: 'en', replace: false },
    })
  })

  it('zt_createButton 包成 config', () => {
    const option = { type: 2, isLine: false, padding: '10,20' }
    expect(adaptFreePanelItem(item('zt_createButton', option))).toEqual({
      id: 'fontSet.createButton',
      payload: { config: option },
    })
  })

  it('cy_exportOpenFolder → cy_openDirectory', () => {
    expect(adaptFreePanelItem(item('cy_exportOpenFolder', null))).toEqual({
      id: 'legacy.call',
      payload: { key: 'cy_openDirectory', args: [] },
    })
  })

  it('cy_batchExportLayer 把 option 作为参数', () => {
    const option = { path: 'D:/out' }
    expect(adaptFreePanelItem(item('cy_batchExportLayer', option))).toEqual({
      id: 'legacy.call',
      payload: { key: 'cy_BatchExportLayer', args: [option] },
    })
  })

  it('未知 key 返回 null', () => {
    expect(adaptFreePanelItem(item('cy_unknown', null))).toBeNull()
  })
})
