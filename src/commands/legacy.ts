import type { JsxName } from '@/cep/jsx/names'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { defineCommand } from './registry'
import type { Command } from './types'

/** 旧自由面板 key 白名单；只放已经核对过原版签名的 */
const ALLOWED = new Set<JsxName>([
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
  /**
   * 旧自由面板 key 的直通执行。
   *
   * **有意偏离（D-25）**：原版走 `$cep.jsxHistory(key, args, label)`，把一次调用包成一个
   * 有名字的撤销步骤；我们只 `jsxCall`，等于让 jsx 内部自己产生撤销步骤。
   * 差异只在**撤销粒度 / 历史面板里那一步叫什么**，落盘结果和用户数据都不受影响。
   *
   * 为什么不补历史包装：
   * - `$cep.jsxHistory` 的实现落在 jsxbin 里（面板侧只有 `key: "jsxHistory"` 壳，`docs/原版/01-原版源码/panel/js/app.v4.js:4894`）；
   *   `public/lib/all.decrypted.js` 实际是 jsxbin（`@JSXBIN@` 开头，编码不可读），grep 不出函数体；
   *   所以"原版到底把 label 传进哪一层"没有一手证据，写出来的包装只能是猜。
   * - 自己包 `app.activeDocument.suspendHistory(label, script)` 对白名单里的 `cy_openDirectory`
   *   会直接抛错（它不碰文档，没有 activeDocument），为了一个撤销分组把能用的调用改坏不划算。
   * 台账登记为「有意偏离」，判据见 D-25。
   */
  defineCommand({
    id: 'legacy.call',
    title: '执行旧自由面板功能',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { key, args, label }) {
      if (!ALLOWED.has(key)) {
        throw new CepError('PARSE', msg.command.fn.legacyKeyNotOpen(key))
      }
      await ctx.jsx.legacy.call(key, args, label)
    },
  }),
]
