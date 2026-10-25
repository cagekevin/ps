import { jsxRead } from '@/cep/transport'
import { READ } from './timeouts'
import type { LayerJsx } from './types'

/** 图层域真实实现。选区状态的解释放在 selection/，这里只取原始值 */
export function createLayerJsx(): LayerJsx {
  return {
    isSelectLayer: () =>
      jsxRead('Layer_isSelectLayer', [], {
        label: '查询是否有选中图层',
        timeout: READ,
      }),

    getTypeNumber: () =>
      jsxRead('Layer_getTypeNumber', [], {
        label: '查询图层类型',
        timeout: READ,
      }),
  }
}
