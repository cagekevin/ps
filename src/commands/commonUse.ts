import { buildOptionPatch, FLIP_DIRECTIONS, type FlipDirection } from '@/domain/common-use'
import { CepError } from '@/utils/errors'
import { assertJsxOk } from '@/utils/jsx-result'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'
import { commonUseRepo } from '@/cep/data/common-use'
import { readCommonUseOptions } from '@/cep/data/legacy-settings'
import type { RepoRead } from '@/cep/data/types'
import { subscribeHostEvent, type HostEventName } from '@/cep/events'
import {
  COMMON_USE_SETTING_KEYS,
  updateCommonUseOptions,
  type CommonUseSettingKey,
} from '@/cep/data/legacy-settings'
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
      // 分别对应设置里的 `cyLinkObject` / `cyDeleteNext`，由调用方（子面板/命令）传入。
      // `path` 为空时先走 `cy_getImagePath()` 选图——官方 `embedImage()` 也是先选图再嵌入
      // （`app.v4.js:38063` 起），取消（`-1`）则静默返回。
      let picked = options?.path
      if (!picked) {
        const got = await ctx.jsx.commonUse.getImagePath()
        if (got === -1) return
        picked = got as string
      }
      assertJsxOk(await ctx.jsx.commonUse.embedImage({ ...options, path: picked }), '嵌入图片失败')
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

  /**
   * 恢复"置入图片后本页有反应"（T-97-1c）。官方在组件 mounted 里按开关注册（`app.v4.js:37606-37615`、
   * 开关变化时重注册 `:38222-38225`，注册本身由 `setEvent` 按 `this.set[key]` 决定 `:37743-37749`）。
   *
   * 我方等价实现：**订阅一次，回调里读两个开关分流**——同一个 ID `1349280544` 在官方被绑了两次
   * （`dragInImage` 与 `toLinkObject`），合成一个回调行为一致且不会有双份注册。
   *
   * 分流（官方原文）：
   * - `cyOpenDranInToLinkObject` 为真 → `toLinkObject()`：`Layer_placedLayerRelinkToFile([path])`（`:37758-37761`）
   * - 否则 `cyDragInAutoEmbed` / `cyPasetImageAutoEmbed` / `cyClipMaskAutoEmbed` 各自为真 →
   *   `dragInImage()`：`cy_insertionImage([{path:"", bLink2: cyLinkObject, bDelete: cyDeleteNext}])`（`:37750-37757`）
   * - 都不勾 → 什么都不做
   */
  defineCommand({
    id: 'commonUse.watchPlaceImage',
    title: '监听置入图片',
    group: 'file',
    requires: 'none',
    kind: 'instant',
    async run(ctx) {
      await startPlaceImageWatch(ctx)
    },
  }),

  defineCommand({
    id: 'commonUse.smartToLinkSmartObject',
    title: '转链接智能对象',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      // 官方 `toLinkSmart()` → `cy_smartToLinkSmartObject([], "转链接智能对象")`（`:35882-35891`），无参
      assertJsxOk(await ctx.jsx.commonUse.smartToLinkSmartObject(), '转链接智能对象失败')
    },
  }),

  defineCommand({
    id: 'commonUse.linkSmartObjectToSmartObject',
    title: '转智能对象',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      // 官方 `linkToSmart()` → `cy_linkSmartObjectToSmartObject([], "转智能对象")`（`:35862-35871`），无参
      assertJsxOk(await ctx.jsx.commonUse.linkSmartObjectToSmartObject(), '转智能对象失败')
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

  // ---------- 4 个格子直连功能（都是无参 jsx，名字照真实 jsx 名） ----------

  defineCommand({
    id: 'commonUse.correctBlur',
    title: '修正边缘模糊',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.commonUse.correctBlur()
    },
  }),

  defineCommand({
    id: 'commonUse.layerReplace',
    title: '元素替换',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.commonUse.layerReplace()
    },
  }),

  defineCommand({
    id: 'commonUse.locationTrade',
    title: '位置对换',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.commonUse.locationTrade()
    },
  }),

  defineCommand({
    id: 'commonUse.exchangeLayerColor',
    title: '图层颜色互换',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      await ctx.jsx.commonUse.exchangeLayerColor()
    },
  }),
  // ---------- 子面板参数 + 区域显隐（写 sj_set.json，官方 17 个 cy* 键） ----------

  defineCommand({
    id: 'commonUse.setOption',
    title: '保存常用页设置',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { path, value }) {
      const root = path.split('.')[0]
      // 白名单：只认官方那 17 个键（`COMMON_USE_SETTING_KEYS`），其余拒绝——写进去就是污染别人的设置文件
      if (!COMMON_USE_SETTING_KEYS.includes(root as CommonUseSettingKey)) {
        throw new CepError('PARSE', `不认识的常用页设置项：${path}`)
      }
      // 嵌套补丁 + `assignDeep`：改 `cyExport.ext` 时 `compress` 等兄弟键逐字节不变（靶点⑤）
      await updateCommonUseOptions(buildOptionPatch(path, value))
    },
  }),
  // ---------- 常用项显隐 / 重置（写 sj_commonFunction.json，不碰 sj_set.json） ----------

  defineCommand({
    id: 'commonUse.setShow',
    title: '显示 / 隐藏常用项',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { id, show }) {
      // 只改这一项的 `isShow`，其它项与顺序由 `setShow` 内部按落盘下标处理（不重排数组）
      await commonUseRepo.setShow(id, show)
    },
  }),

  defineCommand({
    id: 'commonUse.resetAll',
    title: '重置常用项',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run() {
      // 恢复成官方种子（14 项，顺序同 `configReset()`：cya1…cya9、cya11、cya13、cya14、cya15、cya12）
      await commonUseRepo.resetAll()
    },
  }),
  defineCommand({
    id: 'commonUse.move',
    title: '拖动常用项排序',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { from, to, position }) {
      // 顺序唯一来源：`applyListDrop`（`domain/reorder`），与 `/style`、`/action` 的落点计算同源（ADR-19）
      await commonUseRepo.move(from, to, position)
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
/**
 * 「置入图片」监听（T-97-1c）。官方三个事件 → 两个处理器（`app.v4.js:37606-37615`）：
 * - `1349280544`（placeImage）→ `dragInImage` **和** `toLinkObject`
 * - `1885434740`（pasteImage）/ `1198682188`（clipMask）→ 只有 `dragInImage`
 * 开关不勾时官方**不注册**（`setEvent`，`:37743-37749`）；我方订阅一次、回调里按开关分流。
 */
export interface PlaceImageDeps {
  /**
   * 读当前设置。**必须是异步**：数据层 `readCommonUseOptions()` 是 `Promise`。
   * 这里写同步签名会让实现方被迫 `as unknown as` 把 Promise 当对象用（T-97-8 真机 bug 就是这么来的），
   * 而 `as` 能过编译、过测试、运行时静默返回 `'none'`。
   *
   * 返回值必须是 `RepoRead`：设置文件坏了时 17 个开关全缺，`ok: false` 且取不到 `.value`，
   * 消费侧就不可能替生产者捏造"一切正常"（T-101-1 / T-101-2）。
   */
  readOptions: () => Promise<RepoRead<Record<string, unknown>>>
  embedImage: (options: { path: string; bLink2: unknown; bDelete: unknown }) => Promise<unknown>
  relinkToFile: (path: string) => Promise<unknown>
}

/** 事件载荷里的路径：官方 `t.eventData.null._path` 后把反斜杠换成斜杠（`:37759`） */
export function placeImagePath(payload: unknown): string {
  const raw = (payload as { eventData?: { null?: { _path?: unknown } } } | null)?.eventData?.null
    ?._path
  return typeof raw === 'string' ? raw.replace(/\\/g, '/') : ''
}

/** 官方 `dragInImage()` 的实参：`path` 是**空串**，`bLink2`/`bDelete` 取设置原值（`:37751-37755`） */
export function buildDragInPayload(options: Record<string, unknown>) {
  return { path: '', bLink2: options.cyLinkObject, bDelete: options.cyDeleteNext }
}

/** 一条事件该走哪条路径：`'relink' | 'embed' | 'none'`（顺序即官方优先级：先 `toLinkObject`） */
export function placeImageAction(
  name: HostEventName,
  options: Record<string, unknown>,
): 'relink' | 'embed' | 'none' {
  if (name === 'placeImage' && options.cyOpenDranInToLinkObject) return 'relink'
  const key =
    name === 'placeImage'
      ? 'cyDragInAutoEmbed'
      : name === 'pasteImage'
        ? 'cyPasetImageAutoEmbed'
        : 'cyClipMaskAutoEmbed'
  return options[key] ? 'embed' : 'none'
}

/** 分派一条置入事件（导出给测试直接调，不依赖订阅时序） */
export async function dispatchPlaceImage(
  name: HostEventName,
  payload: unknown,
  deps: PlaceImageDeps,
): Promise<'relink' | 'embed' | 'none'> {
  const read = await deps.readOptions()
  // 设置文件坏了 → 开关全缺，`placeImageAction` 会一路静默走 'none'（与 T-97-8 同一个症状）。
  // 事件回调没有 `useCommand` 接住，弹不了 toast（命令层不许 import 视图层，ADR-16），
  // 所以按本文件既有口径落 error 日志（`设置页 → 打开日志` 能看到），并且**不按默认值猜**。
  if (!read.ok) {
    log.error(
      'commonUse.placeImage',
      `常用页设置文件损坏（${read.reason}），${name} 未处理：请到设置页修复 sj_set.json 后重试`,
    )
    return 'none'
  }
  const action = placeImageAction(name, read.value)
  if (action === 'relink') {
    await deps.relinkToFile(placeImagePath(payload))
    return 'relink'
  }
  if (action === 'embed') {
    await deps.embedImage(buildDragInPayload(read.value))
    return 'embed'
  }
  return 'none'
}

let stopPlaceImage: Array<() => void> | null = null

/** 订阅三个置入事件；重复调用只订阅一次（页面 mounted 与设置变化都会调） */
export async function startPlaceImageWatch(ctx: {
  jsx: {
    commonUse: {
      embedImage: PlaceImageDeps['embedImage']
      relinkToFile: PlaceImageDeps['relinkToFile']
    }
  }
}): Promise<void> {
  if (stopPlaceImage) return
  const deps: PlaceImageDeps = {
    // `readCommonUseOptions()` 是 async 且返回 `{ value, degraded }`：**必须 await 再取 `.value`**，
    // 且 `degraded` 必须原样交给 `dispatchPlaceImage`——少任何一个都会让置入静默走 `'none'`
    // （T-97-8 是前半个真因，T-101-1 是后半个）。
    readOptions: () => readCommonUseOptions(),
    embedImage: (options) => ctx.jsx.commonUse.embedImage(options),
    relinkToFile: (path) => ctx.jsx.commonUse.relinkToFile(path),
  }
  const names: HostEventName[] = ['placeImage', 'pasteImage', 'clipMask']
  stopPlaceImage = await Promise.all(
    names.map((name) =>
      subscribeHostEvent(name, (payload) => {
        // 事件回调是"发出去就没人接"的路径：这里抛错不会有 `useCommand.run` 接住，
        // 所以必须自己落日志（`设置页 → 打开日志` 能看到），不许再 `void` 静默吞掉。
        void dispatchPlaceImage(name, payload, deps).catch((e: unknown) => {
          log.warn('commonUse.placeImage', `${name} 处理失败：${describeCepError(e)}`)
        })
      }),
    ),
  )
}

/** 仅供测试清理：停止订阅 */
export function stopPlaceImageWatch(): void {
  for (const stop of stopPlaceImage ?? []) stop()
  stopPlaceImage = null
}
