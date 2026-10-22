import { hasCep } from '@/cep/transport'
import { createActionJsx } from './action'
import { createEnvJsx } from './env'
import { createFontJsx } from './font'
import { createLayerJsx } from './layer'
import { createLegacyJsx } from './legacy'
import { createMockJsx } from './mock'
import type { JsxPort } from './types'

/**
 * 按环境选一次实现。**页面与 ps.ts 只从这里拿 jsx**，不再各自判断环境。
 *
 * `createJsxPort` 导出给测试用；生产只读 `jsx` 常量。
 */
export function createJsxPort(inCep: boolean): JsxPort {
  if (!inCep) return createMockJsx()
  return {
    font: createFontJsx(),
    layer: createLayerJsx(),
    env: createEnvJsx(),
    action: createActionJsx(),
    legacy: createLegacyJsx(),
  }
}

export const jsx: JsxPort = createJsxPort(hasCep())
export type { JsxPort } from './types'
