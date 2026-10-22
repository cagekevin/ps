import type { FreePanelItem } from './free-panel'

/**
 * 自由面板旧数据 key → 命令 id + payload。
 *
 * 旧 key 来自原版 `handleFreePanelEvent`（app.v4.js:17021-17260）。
 * 只映射**已经确认参数形状**的项；未知 key 返回 null，由命令层报错。
 */
export interface LegacyCommand {
  id: string
  payload: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function adaptFreePanelItem(item: FreePanelItem): LegacyCommand | null {
  const option = item.option

  switch (item.key) {
    case 'dz_useAction':
      return { id: 'action.call', payload: option }

    case 'zt_translate': {
      const config = asRecord(option)
      return {
        id: 'fontSet.translate',
        payload: {
          from: typeof config.from === 'string' ? config.from : 'auto',
          to: typeof config.to === 'string' ? config.to : 'auto',
          replace: config.delete !== false,
        },
      }
    }

    case 'zt_createButton':
      return { id: 'fontSet.createButton', payload: { config: option } }

    case 'zt_copyFontInfo':
      return { id: 'fontSet.copyFont', payload: undefined }

    case 'zt_pasteFontInfo':
      return { id: 'fontSet.pasteFont', payload: { keeps: option } }

    case 'zt_switchFontDirection':
      return { id: 'fontSet.switchDirection', payload: undefined }

    case 'zt_setFontSize':
      return { id: 'fontSet.fontSize', payload: { value: Number(option) } }

    case 'zt_setFontLeading':
      return { id: 'fontSet.leading', payload: { value: Number(option) } }

    case 'zt_setFontTracking':
      return { id: 'fontSet.tracking', payload: { value: Number(option) } }

    case 'zt_setLeftRightAlign':
      return { id: 'fontSet.align', payload: { axis: 'h', index: Number(option) } }

    case 'zt_setUpDownAlign':
      return { id: 'fontSet.align', payload: { axis: 'v', index: Number(option) } }

    case 'zt_changeTextBranchMerge':
      return { id: 'fontSet.split', payload: { mode: Number(option) } }

    case 'cy_swapWireframeFill':
      return {
        id: 'legacy.call',
        payload: { key: 'cy_swapWireframeFill', args: [] },
      }

    case 'cy_exportOpenFolder':
      return {
        id: 'legacy.call',
        payload: { key: 'cy_openDirectory', args: [] },
      }

    case 'cy_batchExportLayer':
      return {
        id: 'legacy.call',
        payload: {
          key: 'cy_BatchExportLayer',
          args: option == null ? [] : [option],
        },
      }

    case 'cy_batchExportSecondLayer':
      return {
        id: 'legacy.call',
        payload: {
          key: 'cy_BatchExportSecondLayer',
          args: option == null ? [] : [option],
        },
      }

    case 'cy_exportImage':
      return {
        id: 'legacy.call',
        payload: {
          key: 'cy_ExportImage',
          args: option == null ? [] : [option],
        },
      }

    default:
      return null
  }
}
