import { FLIP_DIRECTIONS, type FlipDirection } from '@/domain/common-use'
import { CepError } from '@/utils/errors'
import { assertJsxOk } from '@/utils/jsx-result'
import { getCommonUseCollapsed, setCommonUseCollapsed } from '@/cep/data/settings'
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

// 固定表（方向 / 预设倍率）在 `domain/common-use.ts`——页面也要用；**不在这里 re-export**，
// 否则页面又能值导入命令层（T-88a 教训，守卫 `scripts/page-boundary.mjs` 会拦）。

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

/** 单文件失败明细：部分成功时**不许**用"整体成功"糊过去 */
export interface BatchFailure {
  file: string
  code: string
  reason: string
}

export interface BatchOutcome {
  ok: boolean
  /** 成功处理的文件数（分母由调用方给 files.length） */
  done: number
  failed: BatchFailure[]
}

/**
 * `cy_getPsdForFolder` 的返回形状未实测（只在 `jsx返回结构复原.md` 记为 B/A 档"有数据"），
 * 所以两种常见形状都认：字符串数组，或带 `path`/`file`/`fullName` 的对象数组。认不出就丢，
 * 最终由调用方按"空列表"报错——不拿假数据往下跑。
 */
function toFileList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const files: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      files.push(item)
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const path = record.path ?? record.file ?? record.fullName
      if (typeof path === 'string') files.push(path)
    }
  }
  return files
}

/**
 * 逐文件跑一遍，**一个失败不中断**：原版是前端裸 `for`（`:36024-36046` / `:17123-17161`），
 * 中途抛错就整批停、且前面成功的也没个说法。这里收集失败明细，最后交给调用方决定怎么报。
 */
async function runPerFile(
  files: string[],
  work: (file: string) => Promise<void>,
  progress: { update: (progress?: number, detail?: string) => void },
  label: (index: number, total: number) => string,
): Promise<BatchOutcome> {
  const failed: BatchFailure[] = []
  let done = 0
  for (let i = 0; i < files.length; i++) {
    progress.update(i / files.length, label(i, files.length))
    try {
      await work(files[i])
      done += 1
    } catch (e) {
      failed.push({
        file: files[i],
        code: e instanceof CepError ? e.code : 'JSX',
        reason: e instanceof Error ? e.message : String(e),
      })
    }
  }
  // 末次进度由循环最后一次 `update` 给（i = total-1 时已是 100%），不再补一次
  return { ok: failed.length === 0, done, failed }
}

/**
 * 部分成功**必须抛**：`{ok:true}` 只允许"全成"。
 * 文案要能看出比例（"成功 6/10，失败 4 张"），不是一句"导出失败"。
 */
function assertAllSucceeded(outcome: BatchOutcome, total: number, action: string): void {
  if (outcome.failed.length === 0) return
  const first = outcome.failed[0]
  throw new CepError(
    'JSX',
    `${action}成功 ${outcome.done}/${total}，失败 ${outcome.failed.length} 张（${first.file}：${first.reason}）`,
  )
}

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
    id: 'commonUse.optimizeOnce',
    title: '优化文档',
    group: 'file',
    requires: 'none',
    kind: 'long',
    async run(ctx, { options }) {
      // 单文档优化：官方 `cy_optimizeDoc([配置])`（`:38057`）
      ctx.progress.update(undefined, '正在优化文档')
      assertJsxOk(await ctx.jsx.commonUse.optimizeOnce(options), '优化文档失败')
      ctx.progress.update(1, '正在优化文档：1/1')
    },
  }),

  defineCommand({
    id: 'commonUse.optimizeFolder',
    title: '批量优化文件夹',
    group: 'file',
    requires: 'none',
    kind: 'long',
    async run(ctx, { options }) {
      // 官方是**前端循环**（`:36024-36046`）：先 `cy_getPsdForFolder()`（无参，jsx 自己弹选目录），
      // 再逐张 `cy_batchOptimizeDoc([配置, 文件])`。循环搬到命令层（C-1），页面不再自己 for。
      const files = toFileList(await ctx.jsx.commonUse.getPsdList())
      if (!files.length) throw new CepError('PARSE', '文件夹内没有PSD文件')

      const outcome = await runPerFile(
        files,
        (file) => ctx.jsx.commonUse.optimizeFolder(options, file).then(() => undefined),
        ctx.progress,
        (i, total) => `正在优化文档：${i + 1}/${total}`,
      )
      assertAllSucceeded(outcome, files.length, '优化文档')
    },
  }),

  defineCommand({
    id: 'commonUse.exportPsdFolder',
    title: '批量导出 PSD 图片',
    group: 'file',
    requires: 'none',
    kind: 'long',
    async run(ctx, { options, confirmed }) {
      // 官方 `:17123-17161`：同样先取列表，再逐张 `cy_BacthExportPsdToImage([文件, 选项])`（注意官方拼错 Bacth）。
      // `> 30` 张原版弹确认（`:17157-17158` 文案「文件夹内超过30个psd，导出时间较长是否继续？」）；
      // 命令层不引 UI，改为**没有 `confirmed` 就抛**，由页面显示 CepModal 后再带 `confirmed: true` 重试。
      const files = toFileList(await ctx.jsx.commonUse.getPsdList())
      if (!files.length) throw new CepError('PARSE', '文件夹内没有PSD文件')
      if (files.length > 30 && confirmed !== true) {
        throw new CepError(
          'PARSE',
          `文件夹内超过30个psd，导出时间较长是否继续？（共 ${files.length} 张）`,
        )
      }

      const outcome = await runPerFile(
        files,
        (file) => ctx.jsx.commonUse.exportPsdImage(file, options).then(() => undefined),
        ctx.progress,
        // 原版文案把顺序写反了（`:17137` 是 `长度/(i+1)`），这里按正常顺序
        (i, total) => `正在导出：${i + 1}/${total}`,
      )
      assertAllSucceeded(outcome, files.length, '导出')
    },
  }),

  // ---------- 折叠态（我们自己的偏好，不写官方 sj_set.json） ----------

  defineCommand({
    id: 'commonUse.setCollapsed',
    title: '展开 / 收起',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { id, collapsed }) {
      // 落 `sj_v5_ui.json`（`data/settings.ts` 的 `commonUse.collapsed`）；`sj_set.json` 一个字节不碰
      setCommonUseCollapsed({ ...getCommonUseCollapsed(), [id]: collapsed })
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
