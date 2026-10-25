import { jsxRead, jsxWrite } from '@/cep/transport'
import { LONG, WRITE } from './timeouts'
import type { ActionJsx } from './types'

/** 动作域真实实现 */
export function createActionJsx(): ActionJsx {
  return {
    getActionList: () =>
      jsxRead('dz_getActionList', [], {
        label: '读取 PS 动作列表',
        timeout: WRITE,
      }),

    // 动作播放可能跑很久（批处理），超时给足；原版没有进度回传，这里也不假装有
    callAction: (item) =>
      jsxWrite('dz_callAction', [item], {
        // UNVERIFIED: 进度 label 是否进用户可见 HUD 待实测；若是提示语应归 msg.*，暂标待定
        label: `执行动作 ${item.name}`,
        timeout: LONG,
      }),
  }
}
