import { CepError } from '@/utils/errors'
import { assertJsxOk } from '@/utils/jsx-result'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 常用页（`/commonUse`）命令。
 *
 * C-1 定案（`docs/组件库/页面契约.md:490`）：**能力全部进命令层**，
 * 父网格与 7 个子面板都只调命令——同一操作只有一个入口。
 *
 * 复用自由面板（`freePanel.*`）的能力**不在这里重复实现**：
 * 导出图层 / 导出图片 / 打开目录走 `legacy.call`（白名单见 `commands/legacy.ts`），
 * 由 `commands/commonUse.ts` 复用它的白名单，不新开一条直通通道。
 *
 * UNVERIFIED：本域 jsx 的参数形状与返回结构大多未实测
 * （依据见 `src/cep/jsx/commonUse.ts` 头部三档）。
 * 命令层因此只经 `utils/jsx-result` 判成败，**不读任何返回字段**。
 */

/** 翻转 6 向（原版 `CommonUse.md:67-91` 的常量表：左右/上下/左/右/下/上） */
export const FLIP_DIRECTIONS = ['左右', '上下', '左', '右', '下', '上'] as const

export type FlipDirection = (typeof FLIP_DIRECTIONS)[number]

/** 放大预设（`docs/页面/05-常用.md:42`：`[105,110,150,200]`） */
export const ENLARGE_PRESETS = [105, 110, 150, 200] as const
/** 整体放大预设（`:42`：`[101,102,103,120,140,250,300,350,400,500]`） */
export const ENLARGE_ALL_PRESETS = [101, 102, 103, 120, 140, 250, 300, 350, 400, 500] as const
/** 缩小预设（`:42`：`[95,90,80,50]`） */
export const NARROW_PRESETS = [95, 90, 80, 50] as const
/** 整体缩小预设（`:42`：`[99,98,97,70,60,50,33,25,20,10]`） */
export const NARROW_ALL_PRESETS = [99, 98, 97, 70, 60, 50, 33, 25, 20, 10] as const

/** 变换参数顺序（`docs/页面/05-常用.md:57`） */
export const TRANSFORM_KEYS = [
  'number',
  'angle',
  'leftRigth',
  'topBottom',
  'pointIndex',
  'scale',
  'opacity',
] as const

/** 分布参数顺序（`docs/页面/05-常用.md:63`） */
export const DISTRIBUTE_KEYS = ['t', 'width', 'mode'] as const

export const commonUseCommands: Command<unknown>[] = [
  // ---------- 缩放 / 翻转 ----------

  defineCommand({
    id: 'commonUse.zoom',
    title: '缩放',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { scale }) {
      const value = Number(scale)
      if (!Number.isFinite(value) || value <= 0) {
        throw new CepError('PARSE', '倍数必须是正数')
      }
      assertJsxOk(await ctx.jsx.commonUse.zoom(value), '缩放失败')
    },
  }),

  defineCommand({
    id: 'commonUse.flip',
    title: '翻转',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { direction }) {
      if (!FLIP_DIRECTIONS.includes(direction as FlipDirection)) {
        throw new CepError('PARSE', `翻转方向不支持：${direction}`)
      }
      assertJsxOk(await ctx.jsx.commonUse.flip(direction), '翻转失败')
    },
  }),

  // ---------- 嵌入 / 导入 ----------

  defineCommand({
    id: 'commonUse.embedImage',
    title: '嵌入图片',
    group: 'layer',
    requires: 'none',
    kind: 'long',
    async run(ctx, { options }) {
      // 官方实参 `{path, bLink2, bDelete}`（`app.v4.js:38070-38074`）：`bLink2`/`bDelete`
      // 分别对应设置里的 `cyLinkObject` / `cyDeleteNext`，由调用方（子面板/命令）传入
      assertJsxOk(await ctx.jsx.commonUse.embedImage(options), '嵌入图片失败')
    },
  }),

  defineCommand({
    id: 'commonUse.embedMultipleImages',
    title: '嵌入多图片',
    group: 'layer',
    requires: 'none',
    kind: 'long',
    async run(ctx) {
      // 官方 `cy_embedMultipleImage` 无参（`:37902`）
      assertJsxOk(await ctx.jsx.commonUse.embedMultipleImages(), '嵌入多图片失败')
    },
  }),

  defineCommand({
    id: 'commonUse.importMultipleImages',
    title: '导入多图片',
    group: 'layer',
    requires: 'none',
    kind: 'long',
    async run(ctx, { path, toLinkObject }) {
      // `path` 未给时先走 `cy_getImagePath()`；官方用 `!== -1` 判取消并**静默返回**（`:38096-38106`）。
      // 取到的 path **原样透传**，不做任何加工（数组/单张两种形状都对）。
      let picked = path
      if (picked === undefined) {
        picked = await ctx.jsx.commonUse.getImagePath()
        if (picked === -1) return
      }
      assertJsxOk(
        await ctx.jsx.commonUse.importMultipleImages({ path: picked, toLinkObject }),
        '导入多图片失败',
      )
    },
  }),

  // ---------- 优化 ----------

  defineCommand({
    id: 'commonUse.optimizeDoc',
    title: '批量优化文档',
    group: 'file',
    requires: 'none',
    kind: 'long',
    async run(ctx, { options, total }) {
      // 单文档优化：官方 `cy_optimizeDoc([配置])`（`:38057`）。
      // 文件夹批量（`cy_batchOptimizeDoc` + 前端循环）在 T-86b 落成 `commonUse.optimizeFolder`
      ctx.progress.update(undefined, total ? `正在优化文档：1/${total}` : undefined)
      assertJsxOk(await ctx.jsx.commonUse.optimizeOnce(options), '优化文档失败')
      ctx.progress.update(1, total ? `正在优化文档：${total}/${total}` : undefined)
    },
  }),

  // ---------- 变换 / 参考线 / 分布 ----------

  defineCommand({
    id: 'commonUse.transform',
    title: '自定义变换',
    group: 'layer',
    requires: 'layer',
    kind: 'long',
    async run(ctx, { params }) {
      if (!Array.isArray(params) || params.length !== TRANSFORM_KEYS.length) {
        throw new CepError('PARSE', '变换参数不完整')
      }
      assertJsxOk(await ctx.jsx.commonUse.transform(params), '生成变换失败')
    },
  }),

  defineCommand({
    id: 'commonUse.referenceGuide',
    title: '参考线工具',
    group: 'layer',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { options }) {
      // 官方 key `cy_useGride` → jsx `cy_createSafeAreaGuide`（`:17168`）
      assertJsxOk(await ctx.jsx.commonUse.referenceGuide(options), '参考线工具失败')
    },
  }),

  defineCommand({
    id: 'commonUse.referenceSlice',
    title: '清除参考线 / 切片',
    group: 'layer',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { options }) {
      // 官方 key `cy_clearCutGuide` → jsx `cy_guideFunction`（`:17171`）
      assertJsxOk(await ctx.jsx.commonUse.referenceSlice(options), '参考线操作失败')
    },
  }),

  defineCommand({
    id: 'commonUse.distribute',
    title: '按间距分布',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { params }) {
      if (!Array.isArray(params) || params.length !== DISTRIBUTE_KEYS.length) {
        throw new CepError('PARSE', '分布参数不完整')
      }
      assertJsxOk(await ctx.jsx.commonUse.distribute(params), '按间距分布失败')
    },
  }),

  // ---------- 导出（复用 legacy 白名单，不新开直通通道） ----------

  defineCommand({
    id: 'commonUse.exportImages',
    title: '导出图片',
    group: 'file',
    requires: 'none',
    kind: 'long',
    async run(ctx, { mode, options }) {
      // 三种导出形态对应三条既有白名单 key（`docs/架构/dataflow.md:296-300`）
      const key =
        mode === 'first'
          ? 'cy_BatchExportLayer'
          : mode === 'second'
            ? 'cy_BatchExportSecondLayer'
            : 'cy_ExportImage'
      await ctx.jsx.legacy.call(key, options == null ? [] : [options], '导出图片')
    },
  }),

  defineCommand({
    id: 'commonUse.openExportFolder',
    title: '打开所在目录',
    group: 'file',
    requires: 'none',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.legacy.call('cy_openDirectory', [], '打开所在目录')
    },
  }),

  defineCommand({
    id: 'commonUse.swapWireframeFill',
    title: '填充线框互换',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.legacy.call('cy_swapWireframeFill', [], '填充线框互换')
    },
  }),
]
