import { CepError } from '@/utils/errors'
import { assertJsxOk, asJsxResult } from '@/utils/jsx-result'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 自定义页（`/custom`）命令。
 *
 * 两条：
 * - `custom.generate`：生成框架。原版链路 `zdy_checkStatus` → `zdy_mergeRectangles` → `zdy_generate`
 *   （`docs/页面/04-自定义.md:143`）。
 * - `custom.mergeRectangles`：合并矩形。原版链路 `zdy_checkMergeRectangles` → `zdy_mergeRectangles`。
 *
 * UNVERIFIED: 四个 jsx 函数的参数形状与返回结构全部未实测
 * （`docs/页面/04-自定义.md:60-62`；C-7 定案：按最宽松联合落地）。
 * 因此这里只判成败（经 `utils/jsx-result`），**不读任何字段**；
 * 失败文案取 jsx 的 `msg`，没有就用兜底。
 *
 * 「空选区直接失败不调 jsx」在这里做（`docs/组件库/页面契约.md:295`），
 * 文案用原版的「请画出选区或矩形图层再生成框架」（`04-自定义.md:132` 文案表）。
 */

/** 空选区时的原版文案 */
export const NO_SELECTION_TEXT = '请画出选区或矩形图层再生成框架'

export const customCommands: Command<unknown>[] = [
  defineCommand({
    id: 'custom.generate',
    title: '生成框架',
    group: 'layer',
    // 选区检查在 run 里做（要原版文案），所以前置不写 layer
    requires: 'none',
    kind: 'long',
    async run(ctx, { request }) {
      if (!ctx.selection.hasSelection) {
        throw new CepError('NO_SELECTION', NO_SELECTION_TEXT)
      }

      // 1. 状态检查
      assertJsxOk(await ctx.jsx.custom.checkStatus(request), '生成失败：状态检查未通过')

      // 2. 合并矩形（原版链路的一环，`04-自定义.md:143`）
      //    失败不阻断：合并失败说明当前没有可合并的矩形，但框架仍可生成
      const merged = asJsxResult(await ctx.jsx.custom.mergeRectangles(request))
      if (!merged.ok) {
        // 记录但不抛出：原版把合并当成生成链的一步，失败不终止生成
        ctx.progress.update(undefined, '合并矩形未执行')
      }

      // 3. 生成
      assertJsxOk(await ctx.jsx.custom.generate(request), '生成框架失败')
    },
  }),

  defineCommand({
    id: 'custom.mergeRectangles',
    title: '合并矩形',
    group: 'layer',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { request }) {
      if (!ctx.selection.hasSelection) {
        throw new CepError('NO_SELECTION', NO_SELECTION_TEXT)
      }
      assertJsxOk(await ctx.jsx.custom.checkMergeRectangles(request), '合并矩形失败：检查未通过')
      assertJsxOk(await ctx.jsx.custom.mergeRectangles(request), '合并矩形失败')
    },
  }),
]
