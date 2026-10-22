import { jsxCall } from '@/cep/transport'
import type { LegacyJsx } from './types'

/**
 * 自由面板旧 jsx key 的直通实现。
 *
 * 只用于已经确认过原版调用签名的 key；调用方必须先过白名单。
 */
export function createLegacyJsx(): LegacyJsx {
  return {
    call: (key, args, label) =>
      jsxCall(key, args, {
        label: label ?? key,
        timeout: 300000,
      }),
  }
}
