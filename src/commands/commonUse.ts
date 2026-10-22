import { subscribeHostEvent, type PhotoshopEventPayload } from '@/cep/events'
import { CepError } from '@/utils/errors'
import { assertJsxOk } from '@/utils/jsx-result'
import { log } from '@/utils/logger'
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
      assertJsxOk(await ctx.jsx.commonUse.embedImage(options), '嵌入图片失败')
    },
  }),

  defineCommand({
    id: 'commonUse.importMultipleImages',
    title: '导入多图片',
    group: 'layer',
    requires: 'none',
    kind: 'long',
    async run(ctx, { paths }) {
      if (!Array.isArray(paths) || !paths.length) {
        throw new CepError('PARSE', '没有可导入的图片')
      }
      assertJsxOk(await ctx.jsx.commonUse.importMultipleImages(paths), '导入多图片失败')
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
      // 原版进度文案：`"正在优化文档：" + (i+1) + "/" + n.length`（`05-常用.md:60`）
      ctx.progress.update(undefined, total ? `正在优化文档：1/${total}` : undefined)
      assertJsxOk(await ctx.jsx.commonUse.optimizeDoc(options), '优化文档失败')
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
    id: 'commonUse.referenceLines',
    title: '参考线',
    group: 'layer',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { action, options }) {
      assertJsxOk(await ctx.jsx.commonUse.referenceLines(action, options), '参考线操作失败')
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

// ---------- 拖入事件（T-72） ----------

/**
 * 订阅后等待第一条拖入事件的上限。
 *
 * 原版没有这一步，**属有意偏离**：PS 是否真回 `1349280544` 未在真实环境验证（UNVERIFIED(T-72)），
 * 不探测的话"接了但从没生效"和"工作正常"在日志里长得一样——这正是要防的静默失败。
 */
export const DROP_PROBE_MS = 60_000

/**
 * 拖入事件里可能带图片路径的字段名。
 * UNVERIFIED(T-72): `1349280544` 的 `eventData` 结构没有一手证据，按候选键兜住。
 */
const DROP_PATH_KEYS = ['paths', 'files', 'fileList', 'path', 'file', 'url'] as const

/**
 * 从拖入事件的 payload 里取图片路径。
 *
 * 取不到就返回空数组，交给 `commonUse.importMultipleImages` 报「没有可导入的图片」——
 * 不猜一个路径硬塞进去（宁可报错，也不静默导入错的文件）。
 */
export function parseDropPaths(payload: PhotoshopEventPayload | undefined): string[] {
  const data = payload?.eventData
  if (!data) return []

  const out: string[] = []
  for (const key of DROP_PATH_KEYS) {
    const value = data[key]
    if (typeof value === 'string') {
      if (value) out.push(value)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) if (typeof item === 'string' && item) out.push(item)
    }
  }
  return out
}

export interface DropImportWatchOptions {
  /** 收到拖入事件时调用；`paths` 可能为空（payload 未带路径，UNVERIFIED） */
  run(paths: string[]): void
  /** 探测窗口，默认 `DROP_PROBE_MS` */
  probeMs?: number
}

/**
 * 订阅 PS 拖入事件（T-72），把 payload 里的路径交给调用方去跑
 * `commonUse.importMultipleImages`。
 *
 * 为什么在命令层而不是页面：`src/pages/**` 不允许 import `@/cep/events`（ADR-16 护栏）。
 * 这里只做「事件 → 命令参数」的翻译，**不执行命令**——执行仍由页面经 `useCommand` 发起，
 * 保持命令层不依赖视图层。
 *
 * 两种失败都不抛：非 CEP 环境 / 注册失败 → 返回 no-op + warn，页面照常手点导入。
 */
export async function startDropImportWatch({
  run,
  probeMs = DROP_PROBE_MS,
}: DropImportWatchOptions): Promise<() => void> {
  let probe: ReturnType<typeof setTimeout> | undefined
  let received = false
  const clearProbe = (): void => {
    if (probe === undefined) return
    clearTimeout(probe)
    probe = undefined
  }

  let stop: () => void
  try {
    stop = await subscribeHostEvent('drop', (payload) => {
      received = true
      clearProbe()

      const paths = parseDropPaths(payload)
      if (!paths.length) {
        // P0：payload 没路径不能静默——日志留痕，命令层还会再报一次「没有可导入的图片」
        log.warn('commonUse', 'UNVERIFIED(T-72): 拖入事件未带可用图片路径', {
          eventID: payload.eventID,
        })
      }
      run(paths)
    })
  } catch (e) {
    log.warn('commonUse', '拖入事件不可用，退回手动导入', e)
    return () => {}
  }

  probe = setTimeout(() => {
    probe = undefined
    if (received) return
    log.warn(
      'commonUse',
      `UNVERIFIED(T-72): ${probeMs}ms 内未收到拖入事件 1349280544` +
        '（可能未注册成功，或 PS 不回该事件）',
    )
  }, probeMs)

  return () => {
    clearProbe()
    stop()
  }
}
