import { jsxWrite } from '@/cep/transport'
import { LONG } from './timeouts'
import type { LegacyJsx } from './types'

/**
 * 自由面板旧 jsx key 的直通实现。
 *
 * 只用于已经确认过原版调用签名的 key；调用方必须先过白名单。
 */
export function createLegacyJsx(): LegacyJsx {
  return {
    call: (key, args, label) =>
      jsxWrite(key, args, {
        label: label ?? key,
        timeout: LONG,
      }),
  }
}
