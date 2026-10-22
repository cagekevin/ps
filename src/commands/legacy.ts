import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { Command } from './types'

/** 旧自由面板 key 白名单；只放已经核对过原版签名的 */
const ALLOWED = new Set([
  'cy_swapWireframeFill',
  'cy_openDirectory',
  'cy_BatchExportLayer',
  'cy_batchExportLayer',
  'cy_BatchExportSecondLayer',
  'cy_batchExportSecondLayer',
  'cy_ExportImage',
  'cy_exportImage',
])

export const legacyCommands: Command<unknown>[] = [
  defineCommand({
    id: 'legacy.call',
    title: '执行旧自由面板功能',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { key, args, label }) {
      if (!ALLOWED.has(key)) {
        throw new CepError('PARSE', `旧自由面板 key 未开放：${key}`)
      }
      await ctx.jsx.legacy.call(key, args, label)
    },
  }),
]
