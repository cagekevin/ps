import { openFile, saveFile } from '@/cep/dialog'
import { exportKuArchive, importKuArchive, kuArchiveDefaultName } from '@/cep/data/style-library-io'
import {
  addKuGroup,
  addKuItem,
  addWarehouse,
  appendKuGroup,
  appendKuGroupToSwatch,
  appendKuItemToSwatch,
  deleteKuGroup,
  deleteKuItem,
  deleteWarehouse,
  moveKuGroupTo,
  moveKuItem,
  moveKuItemTo,
  readKuGroupId,
  readKuItem,
  renameKuGroup,
  renameKuItem,
  renameWarehouse,
  selectWarehouse,
  sendKuGroupToSwatch,
  sendKuItemToSwatch,
  setKuGroupShow,
} from '@/cep/data/style-library-repo'
import { APP_EVENT_SEBAN, classifySetd, sendAppEvent, subscribeHostEvent } from '@/cep/events'
import { type JsxOutcome } from '@/utils/jsx-result'
import { encodeText } from '@/domain/translate'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { defineCommand } from './registry'
import type { Command, CommandContext } from './types'

/**
 * 写完色板文件后通知色板面板重读。
 *
 * 官方 `sendMessageToSeBan()`（`app.v4.js:50216-50218`、`:52917`）=
 * `$cep.sendAppEvent("com.fengzi.event.seban", "GengXin")`。
 * 色板是**另一个 CEP 扩展**（独立进程、独立 ExtendScript 会话），文件改了它不会自己知道，
 * 只能靠这条 app event。色板没开时 `sendAppEvent` 返回 false，不抛错（这是正常状态，不是失败）。
 */
function notifySwatchChanged(): void {
  sendAppEvent(APP_EVENT_SEBAN, 'GengXin')
}

/**
 * 样式域命令（`/style` 第 2 段 + 第 3 段 + 第 5 段）。
 *
 * 分四类：
 * - **应用**（改 PS 文档）：颜色 / 渐变 / 字体 / 图层样式 → `ctx.jsx.style`（字体走 `ctx.jsx.font`）
 * - **添加**（从 PS 读回本地库）：前景色 / 渐变 / 字体属性 / 图层样式 → 读 jsx + 追加到库文件
 * - **编辑**（只动本地库文件）：分组 / 项的增删改、排序、发送到色板 → `cep/data/style-library-repo`
 * - **仓库**（只动仓库索引 `sj_kuStoreInfo.ini`）：切换 / 新建 / 改名 / 删除 → 同上，命令层只转参数
 *
 * 编辑类与仓库类不需要选区（`requires: 'none'`）：它们不碰 PS，改的是磁盘上的库文件与索引。
 * 写库的备份、串行队列、索引补登记全在 repo 里，命令层只做参数校验与调用。
 *
 * 本期仍不做：吸色到组（`Tool_set("eyedropperTool")` + PS 事件 `1936028772`，`app.v4.js:50299-50302`，
 * 台账 T-66；菜单项已渲染但置灰）、
 * 拖图片取色（`exportCurrentLayerToImage`，`:54639`）、仓库发送/移动（T-65）。
 * 项 / 组的拖拽排序走 `style.moveItemTo` / `style.moveGroupTo`
 * （原版 `drag` / `dragColorWrap` 的 `Callback`，页面用 `composables/useLongPressDrag` 起拖）。
 * 导入导出（第 6 段）：底栏两个按钮分别弹「导入」「导出」菜单（契约 §3.5）。
 * 本期只接 `.kux` 容器的四条命令：导入追加 / 导入替换 / 导出全部 / 导出当前。
 * 四类单库（`.kuc/.kug/.kuf/.kus`）的编解码在 `domain/ku-io.ts`，本期不单独接命令。
 *
 * **jsx 返回结构全部未实测**（jsxbin 是字节码，符号不可读）。每条命令的返回值语义标了 UNVERIFIED，
 * 因此：只判空、判 `err`，绝不读 `data` 里的具体字段。
 */

/** 吸色等待上限：事件不来时不让命令永远挂着（原版没有超时，这是安全兜底） */
const EYEDROPPER_TIMEOUT = 60_000

/**
 * 快速吸色到组（T-66）：切到吸色工具 → 等一次吸色完成 → 把当前前景色加进该颜色组。
 *
 * 事件复用 `cep/events.ts` 已有的两个：`setd` = 吸色完成、`selection` = 取消
 * （原版用的两个 stringID 就是它们，表里已有，不能再加别名，见那里的注释）。
 *
 * UNVERIFIED: PS 是否真的会在这两个时机回事件，未在真实环境验证；若事件不来，60s 后按超时退出。
 */
async function pickColorToGroup(ctx: CommandContext, groupIndex: number): Promise<void> {
  let settle: (result: 'done' | 'cancelled' | 'timeout') => void = () => {}
  const finished = new Promise<'done' | 'cancelled' | 'timeout'>((resolve) => {
    settle = resolve
  })

  const unsubscribers: Array<() => void> = []
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    // 先订阅再切工具：切工具之后用户可能立刻吸色，晚订阅会漏事件
    // 只有"改了前景色"才算吸色完成（官方 `ysDrawColorToGroup` 的判据，`app.v4.js:69413`）。
    // 以前任何 setd（改背景色 / 选文字 / 单行选区）都会把它当成吸色完成，见 T-87 的行为变更。
    unsubscribers.push(
      await subscribeHostEvent('setd', (payload) => {
        if (classifySetd(payload) === 'foregroundColor') settle('done')
      }),
    )
    unsubscribers.push(await subscribeHostEvent('selection', () => settle('cancelled')))
    timer = setTimeout(() => settle('timeout'), EYEDROPPER_TIMEOUT)

    await ctx.jsx.style.setTool('eyedropperTool')

    const result = await finished
    // 用户在 PS 里切走选区 = 主动放弃，不是故障（TD-12-22）
    if (result === 'cancelled') throw new CepError('CANCELLED', msg.command.text.stylePickCancelled)
    if (result === 'timeout') throw new CepError('TIMEOUT', msg.command.text.stylePickTimeout)
  } finally {
    if (timer) clearTimeout(timer)
    for (const off of unsubscribers) off()
  }

  // 与 `style.addColor` 同一条路径：读前景色 → 追加到该组
  const outcome = await ctx.jsx.style.getForegroundColor()
  if (!outcome.ok)
    throw new CepError(outcome.code, outcome.reason || msg.command.text.styleReadForegroundFailed)
  // 原版 `:50196` 判 `a != null`：两臂下 `data` 为空（null/undefined）就是"没读到"，不是空项
  if (outcome.data === null || outcome.data === undefined)
    throw new CepError('JSX', msg.command.text.styleReadForegroundFailed)
  addKuItem('color', groupIndex, outcome.data)
}

/** 把 jsx 两臂归一成"成功 / 失败 + 原因"；调用方只判 ok 与 data */
function check(
  result: JsxOutcome<unknown>,
  fallback: string,
): { ok: boolean; data?: unknown; msg: string } {
  if (!result.ok) return { ok: false, data: undefined, msg: result.reason || fallback }
  return { ok: true, data: result.data, msg: fallback }
}

export const styleCommands: Command<unknown>[] = [
  defineCommand({
    id: 'style.applyColor',
    title: '应用颜色',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex, modifier }) {
      // 发的是**磁盘上的原始项**：视图模型 KuItem 丢了未知键
      const item = readKuItem('color', groupIndex, itemIndex)

      switch (modifier) {
        case 'ctrl':
          await ctx.jsx.style.useShapeFill(item)
          return
        case 'shift':
          await ctx.jsx.style.setBorderColor(item)
          return
        case 'alt': {
          await ctx.jsx.style.changeStyleColor(item)
          // UNVERIFIED: 原版 `:50153` 的写回（`replaceKuItem`）暂不做——载荷是否需要存库未实测。
          // `write` 契约是 fire-and-forget（`Promise<void>`），失败由 `jsxWrite` 在生产者层抛。
          return
        }
        default:
          await ctx.jsx.style.useStyleColor(item)
      }
    },
  }),

  defineCommand({
    id: 'style.applyGradient',
    title: '应用渐变',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex }) {
      const item = readKuItem('gradient', groupIndex, itemIndex)
      // 原版 `:50791` 发的是 `t.gradient`，不是整个项
      const gradient = item.gradient
      if (!gradient) throw new CepError('PARSE', msg.command.text.styleNoGradientPayload)
      await ctx.jsx.style.useGradient(gradient)
    },
  }),

  defineCommand({
    id: 'style.applyFont',
    title: '应用字体',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex }) {
      // 原版 `useFont`（`app.v4.js:51200-51215`）：整项 `JSON.stringify` → `Xv` 编码 →
      // `ys_checkUseFont`，`err == 1` 就 `$msg.showErr` 中止，否则 `ys_useFont`。
      // 编码与两步顺序照 `commands/fontSet.ts` 的 `fontSet.pasteFont`，不另造形状。
      const item = readKuItem('font', groupIndex, itemIndex)
      const payload = encodeText(JSON.stringify(item))
      await ctx.jsx.font.checkUseFont(payload)
      await ctx.jsx.font.useFont(payload)
    },
  }),

  defineCommand({
    id: 'style.applyStyle',
    title: '应用图层样式',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex }) {
      // 原版 `:51509-51511`：深拷贝项 + groupId 后整条发给 jsxbin
      const item = readKuItem('style', groupIndex, itemIndex)
      const groupId = readKuGroupId('style', groupIndex)
      await ctx.jsx.style.useStyle(item, groupId)
    },
  }),

  defineCommand({
    id: 'style.addColor',
    title: '添加颜色',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex }) {
      // UNVERIFIED: 原版 `:50196` 只判 `a != null`；返回结构未实测
      const outcome = await ctx.jsx.style.getForegroundColor()
      if (!outcome.ok)
        throw new CepError(
          outcome.code,
          outcome.reason || msg.command.text.styleReadForegroundFailed,
        )
      if (outcome.data === null || outcome.data === undefined)
        throw new CepError('JSX', msg.command.text.styleReadForegroundFailed)
      addKuItem('color', groupIndex, outcome.data)
    },
  }),

  defineCommand({
    id: 'style.addGradient',
    title: '添加渐变',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex }) {
      // 原版 `:50755-50771`：`false` 直接返回；`err == 1` 报错；
      // 成功后包成 `{ name: "未命名", gradient: data }` 再入库
      const raw = await ctx.jsx.style.getGradientInfo()
      if (!raw.ok)
        throw new CepError(raw.code, raw.reason || msg.command.text.styleReadGradientFailed)
      if (raw.data === false) throw new CepError('JSX', msg.command.text.styleReadGradientFailed)
      const result = check(raw, msg.command.text.styleReadGradientFailed)
      if (!result.ok) throw new CepError('JSX', result.msg)

      // UNVERIFIED: `data` 的形状按 `app.v4.js:50767-50769` 是渐变项里的 gradient 载荷；
      // 这里是 `undefined`（mock/未取到时）也照样写"未命名"空壳，还是报错？
      // 原版没判，我们不补默认值 → 判空后报错，让调用方看见。
      if (result.data === null || result.data === undefined) {
        throw new CepError('JSX', msg.command.text.styleReadGradientEmpty)
      }
      addKuItem('gradient', groupIndex, {
        name: '未命名',
        gradient: result.data,
      })
    },
  }),

  defineCommand({
    id: 'style.addStyle',
    title: '添加图层样式',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex }) {
      const groupId = readKuGroupId('style', groupIndex)

      // 原版 `:51532-51536` 发 { delArr, groupId, envDir: "/SheJiZhuLi" }。
      // `delArr` 来自 `kuStyle/ls_ysDelete.json`（`getDeleteStyleId`，`:53071-53093`）——
      // 那是"删除样式后告诉 jsxbin 文档里哪些样式该删"的临时清单，本项目没有（契约 §4.4 明确别现写一份）。
      // 添加新样式不需要删任何东西 → 传空数组。
      // UNVERIFIED: `[]` 会不会让 jsxbin 误删，未实测；真机验收点见 docs/页面/06-样式.md。
      await ctx.jsx.style.addStyle({
        delArr: [],
        groupId,
        envDir: '/SheJiZhuLi',
      })
      // UNVERIFIED: 原版 `:51547` 的写回（`addKuItem`）暂不做——载荷是否需要存库未实测。
      // `write` 契约是 fire-and-forget（`Promise<void>`），失败由 `jsxWrite` 在生产者层抛。
    },
  }),

  defineCommand({
    id: 'style.pickColorToGroup',
    title: '快速吸色到组',
    group: 'style',
    requires: 'none',
    kind: 'long',
    async invoke(ctx, { kind, groupIndex }) {
      if (kind !== 'color') throw new CepError('PARSE', msg.command.text.stylePickOnlyColorLib)
      await pickColorToGroup(ctx, groupIndex)
    },
  }),

  defineCommand({
    id: 'style.addFont',
    title: '添加字体',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { groupIndex }) {
      // 原版 `addFont`（`app.v4.js:51243-51264`）：`ys_getFontInfo` → `false` **静默 return（不 toast）** /
      // `err == 1` 报错 / `err == 0` 且 `data.fonts` 为空报错「读取字体属性失败」/ 否则 `addItem(data)`。
      // jsx 用的是字体域已有的 `getFontInfo`（`cep/jsx/font.ts:53` = `ys_getFontInfo`），不新造函数名。
      //
      // **有意偏离（D-23）**：原版 `false` 分支直接 return、无任何提示；我方抛错。
      // 理由：点了「添加字体」却毫无反应（无 toast、按钮不变化）比报错更难排查，
      // 用户会以为面板卡住。偏离记录见 docs/页面/06-样式.md 段 2。
      const raw = await ctx.jsx.font.getFontInfo()
      if (!raw.ok) throw new CepError(raw.code, raw.reason || '读取字体属性失败')
      // 原版的 `false`（没有字体）现在由解码器判成"结构不认识"⇒ 已经是失败臂，不再单独判 `=== false`
      const result = check(raw, '读取字体属性失败')
      if (!result.ok) throw new CepError('JSX', result.msg)

      // UNVERIFIED: `data` 的形状按原版调用侧是 `{ fonts: [...] }`（`:51258` 读 `data.fonts.length`），
      // 其余字段未实测 → 只判 fonts 非空，然后整份原样入库（不补键、不改写）。
      const data = result.data as { fonts?: unknown } | null | undefined
      if (!data || !Array.isArray(data.fonts) || data.fonts.length === 0) {
        throw new CepError('PARSE', msg.command.text.styleReadFontAttrEmpty)
      }
      addKuItem('font', groupIndex, data)
    },
  }),

  // ---------- 第 3 段：分组 / 项的增删改（只动本地库文件，不碰 PS）----------

  defineCommand({
    id: 'style.addGroup',
    title: '新建分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, name, afterIndex }) {
      addKuGroup(kind, name, afterIndex)
    },
  }),

  defineCommand({
    id: 'style.appendGroup',
    title: '追加分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, group }) {
      // 原版 `addGroupItem(t)`（`:52470-52475`）：整份 push + `updata()`，不校验、不补字段。
      // 色板面板「发送到设计助理」发的就是 `{name, show: true, list: [...]}`（`sf.js:434-443`）。
      appendKuGroup(kind, group)
    },
  }),

  defineCommand({
    id: 'style.renameGroup',
    title: '重命名分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, name }) {
      renameKuGroup(kind, groupIndex, name)
    },
  }),

  defineCommand({
    id: 'style.deleteGroup',
    title: '删除分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex }) {
      // 原版 `:52451-52454`：删空后补一个「<库名>默认分组」，所以删完永远还有一组
      deleteKuGroup(kind, groupIndex)
    },
  }),

  defineCommand({
    id: 'style.toggleGroupShow',
    title: '显示/隐藏分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, only }) {
      // `only` 是"只显示这一组"（原版 showOnlyGroup），不是"设成显示"——别当布尔值用
      setKuGroupShow(kind, groupIndex, only === true)
    },
  }),

  defineCommand({
    id: 'style.addItem',
    title: '添加项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, item }) {
      // 项由调用方给（复制粘贴 / 色板回收 / 从别组搬）；命令不造项、不补字段
      addKuItem(kind, groupIndex, item)
    },
  }),

  defineCommand({
    id: 'style.renameItem',
    title: '重命名项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, itemIndex, name }) {
      renameKuItem(kind, groupIndex, itemIndex, name)
    },
  }),

  defineCommand({
    id: 'style.deleteItem',
    title: '删除项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, itemIndex }) {
      deleteKuItem(kind, groupIndex, itemIndex)
    },
  }),

  defineCommand({
    id: 'style.reorderItem',
    title: '上移/下移项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, itemIndex, direction }) {
      // 原版只有拖拽（`app.v4.js:50040-50070`），没有上下移菜单；这里按同一 splice 语义挪一格
      moveKuItem(kind, groupIndex, itemIndex, direction)
    },
  }),

  defineCommand({
    id: 'style.moveItemTo',
    title: '拖拽移动项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, fromGroup, fromIndex, toGroup, toIndex, position }) {
      // 原版 `drag` 的 `Callback`（`app.v4.js:50052-50069`）：跨组 / 同组向后 / 同组向前
      // 三种情况由 `position`（那个布尔）决定插前还是插后，四分支在 `domain/reorder.ts`。
      // 一次调用一次写盘：拖拽过程中页面不调它，只在 `mouseup` 后调一次。
      moveKuItemTo(kind, {
        from: { group: fromGroup, index: fromIndex },
        to: { group: toGroup, index: toIndex },
        position,
      })
    },
  }),

  defineCommand({
    id: 'style.moveGroupTo',
    title: '拖拽排序分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, from, to, position }) {
      // 原版 `dragColorWrap` 的 `Callback`（`app.v4.js:50094-50111`）；被拖组会顺带折叠，
      // 与原版 `before()` + 同一次 `updata()` 落盘的结果一致（见 repo 里的注释）
      moveKuGroupTo(kind, from, to, position)
    },
  }),

  defineCommand({
    id: 'style.sendToSwatch',
    title: '发送到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, itemIndex }) {
      // 原版 `:50349-50355`：把 `[item]` 写成色板文件全文（整份替换，不是追加），再发 app event 通知色板面板。
      sendKuItemToSwatch(kind, groupIndex, itemIndex)
      notifySwatchChanged()
    },
  }),

  defineCommand({
    id: 'style.appendItemToSwatch',
    title: '追加到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex, itemIndex }) {
      // 原版 `:50356-50364`：读回 seBan 数组 → push 该项 → 写回（与上一条的"整份替换"相反）
      appendKuItemToSwatch(kind, groupIndex, itemIndex)
      notifySwatchChanged()
    },
  }),

  defineCommand({
    id: 'style.sendGroupToSwatch',
    title: '整组发送到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex }) {
      // 原版 `:50260-50268`：`write(seBan, JSON.stringify(list))`——整组**替换**色板，不是追加
      sendKuGroupToSwatch(kind, groupIndex)
      notifySwatchChanged()
    },
  }),

  defineCommand({
    id: 'style.appendGroupToSwatch',
    title: '整组追加到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { kind, groupIndex }) {
      // 原版 `:50269-50290`：读回 → 逐项 push 该组 `list` → 写回
      appendKuGroupToSwatch(kind, groupIndex)
      notifySwatchChanged()
    },
  }),

  // ---------- 第 5 段：仓库（只动索引 `sj_kuStoreInfo.ini`）----------
  // 页面处理器对照原版 `:54987-55011`。切仓库后要重读四库，那是页面/store 的事
  // （`readStyleLibrary` 只读当前仓库），命令只管写索引。

  defineCommand({
    id: 'style.selectWarehouse',
    title: '切换仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      // 原版 `select(t)`（`:53365-53372`）：越界归 0，然后 `updata()` 落盘
      selectWarehouse(index)
    },
  }),

  defineCommand({
    id: 'style.addWarehouse',
    title: '新建仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      // 原版 `add()`（`:53357-53363`）：追加一条「未命名分组」+ 四个库文件名
      addWarehouse()
    },
  }),

  defineCommand({
    id: 'style.renameWarehouse',
    title: '重命名仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index, name }) {
      // 原版 `rename(t, e)`（`:53324-53327`）；空名在 repo 层被拒（有意偏离，见那里的注释）
      renameWarehouse(index, name)
    },
  }),

  defineCommand({
    id: 'style.deleteWarehouse',
    title: '删除仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      // 原版 `delete(t)`（`:53329-53356`）直接删磁盘文件；这里移进 `<用户目录>/.deleted-<时间戳>/`
      // （有意偏离，可恢复），回收目录由 repo 写进日志
      deleteWarehouse(index)
    },
  }),

  // ---------- 第 6 段：导入 / 导出（`.kux` 容器）----------
  //
  // 依据 `docs/生成/库文件格式契约.md`：
  // §0.1 / §2.4 容器 `{arrFileData, store}`；§3.4 导出全部 / 导出当前 / 覆盖导入 / 追加导入；
  // §3.5 06 页入口与导出文件命名；§5.2 导入前必须给内层文件名发新 id（否则覆盖本地）。
  // 四类单库（`.kuc/.kug/.kuf/.kus`）的编解码在 `domain/ku-io.ts`，本期不单独接命令。
  //
  // 用户取消对话框沿用 action / rename 的既有口径：抛「取消操作」，由 `useCommand` 统一提示。

  defineCommand({
    id: 'style.importKuReplace',
    title: '导入预设仓库（覆盖）',
    group: 'style',
    requires: 'none',
    kind: 'long',
    async invoke(ctx) {
      const path = openFile('导入样式仓库', ['kux'])
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      await importKuArchive(false, path, (detail) => ctx.progress.update(undefined, detail))
    },
  }),

  defineCommand({
    id: 'style.importKuAppend',
    title: '追加预设仓库',
    group: 'style',
    requires: 'none',
    kind: 'long',
    async invoke(ctx) {
      const path = openFile('追加样式仓库', ['kux'])
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      await importKuArchive(true, path, (detail) => ctx.progress.update(undefined, detail))
    },
  }),

  defineCommand({
    id: 'style.exportKuAll',
    title: '导出所有仓库',
    group: 'style',
    requires: 'none',
    kind: 'long',
    async invoke(ctx) {
      const defaultName = kuArchiveDefaultName(false)
      const path = saveFile('导出所有仓库', ['kux'], defaultName)
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      exportKuArchive(false, path, (detail) => ctx.progress.update(undefined, detail))
    },
  }),

  defineCommand({
    id: 'style.exportKuCurrent',
    title: '导出当前仓库',
    group: 'style',
    requires: 'none',
    kind: 'long',
    async invoke(ctx) {
      const defaultName = kuArchiveDefaultName(true)
      const path = saveFile('导出当前仓库', ['kux'], defaultName)
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      exportKuArchive(true, path, (detail) => ctx.progress.update(undefined, detail))
    },
  }),
]
