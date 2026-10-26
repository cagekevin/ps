// 是什么：色板面板（独立 CEP 面板 `#/seBan`）的命令 + 主面板侧的接收端
// 唯一入口：色板页面（刀3）只经 `useCommand` 调；上色本身由主面板执行，色板只发事件
// 替代了什么：原版面板 `%APPDATA%/fz.FengZi3Hao/js/sf.js` 的全局函数（`:377-480`）
// 谁在用：`pages/seBan/*`（刀3）；`bindSeBanReceiver()` 由 `main.ts` 在主面板调用
// 禁止：页面不许 import 本文件的值；不许在这里做 UI（prompt / alert 归页面）

import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { openUrlInDefaultBrowser } from '@/cep/open-url'
import { appendCustomItem, readCustomItems, setRecentLimit } from '@/cep/data/swatch-repo'
import { APP_EVENT_SEBAN, onAppEvent, sendAppEvent } from '@/cep/events'
import { readCommonUseOptions } from '@/cep/data/legacy-settings'
import { log } from '@/utils/logger'
import { execute, executeInherited, defineCommand } from './registry'
import type { Command, CommandOutcome } from './types'

/**
 * 官方「打开作者站酷」的目标地址。title 写的是"作者站酷"，URL 却是 pszhuli.com
 * （`sf.js:394-396`）—— **照抄行为**，不纠正。
 */
const AUTHOR_SITE = 'http://pszhuli.com'

/**
 * 本扩展的 jsx 里**没有** `sb_GetColorObject` / `sb_cy_HuoQuYanSe` / `sb_SheZhiXingZhuang`。
 *
 * 它们是色板面板自带的 `jsx/main.jsx`（明文 819 行，`%APPDATA%/fz.FengZi3Hao/jsx/`），
 * 由那个扩展自己 `$.evalFile` 加载（`sf.js:23-24`）；我们的 `lib/all.decrypted.js`
 * 是**主面板**的 jsxbin，里面没有 `sb_*`（主面板源码 73946 行里一次都没调过它们）。
 *
 * 因此按钮 4 / 6 在「`main.jsx` 随本面板分发并 evalFile」之前无法真正执行。
 * 按 `docs/页面/11-色板面板.md` 刀1 的退路口径：**不许置灰、不许静默无效**，
 * 点了必须报错并说清原因（可见失败）。谁把 `main.jsx` 接上，就把下面两处换成真调用。
 */
function requireSebanJsx(fn: string): never {
  throw new CepError('JSX', msg.command.fn.swatchSebanJsxMissing(fn))
}

/**
 * 把 `executeInherited` 的结果还原成抛错（与 `commands/freePanel.ts:316-317` 同一口径）：
 * 子命令自己的 `code` 原样抛回去，否则 `useCommand` 的 `FONT_MISSING` 一类分支会失效。
 * `CommandOutcome.code` 是 `CepErrorCode`（R3 起必填）——直接传给 `CepError`，不需要转换。
 */
function assertInherited(result: CommandOutcome): void {
  // `code` 已是必填的 `CepErrorCode`（R3）⇒ 不再需要 `?? 'JSX'` + `as`
  if (result.status === 'error') throw new CepError(result.fail, result.reason)
}

/** 色板项的形状（`main.jsx:287-298` 产出）：`{ name, color: { hex, c, m, y, k, isFill? } }` */
function assertSwatchItem(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== 'object' || !('color' in (item as Record<string, unknown>))) {
    throw new CepError('PARSE', msg.command.text.swatchItemNoColor)
  }
  return item as Record<string, unknown>
}

/** 色板 → 主面板的唯一通道（官方 `sf.js` 发、`app.v4.js:17878` 收） */
function sendSwatchEvent(
  type: 'setColor' | 'setWireframeColor',
  item: Record<string, unknown>,
): void {
  if (!sendAppEvent(APP_EVENT_SEBAN, { type, data: item })) {
    throw new CepError('INIT', msg.command.text.swatchAppEventUnavailable)
  }
  // 发出去不代表有人收：主面板没开这条事件是空转，官方同样不报错。
  // 所以这里不判"主面板在不在"，只在面板上把失败原因显示出来（刀3 的 toast）。
}

export const swatchCommands: Command<unknown>[] = [
  // ---------- 按钮 1：添加前景色 ----------

  defineCommand({
    id: 'seban.addForegroundColor',
    title: '添加前景色',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx) {
      // 官方 `TianJia`（`sf.js:377-382`）→ `sb_GetColorObject()` = `sb_ZhuanHuanYanSeDuiXiang(app.foregroundColor)`
      // （`main.jsx:99-102` / `:287-298`）→ `{name:"未命名", color:{hex,c,m,y,k}}`。
      // 主面板里等价的那条是 `ys_getForegroundColor()`（`app.v4.js:50193`，样式页"添加颜色"同一条），
      // 名字在原版派发表里能命中，所以走它而不是 `sb_*`。
      // UNVERIFIED：两条 jsx 的字段是否逐字一致未实测；本命令只要求"是个带 color.hex 的对象"。
      const fgOutcome = await ctx.jsx.style.getForegroundColor()
      if (fgOutcome.status !== 'ok') {
        throw new CepError(
          fgOutcome.fail,
          fgOutcome.reason || msg.command.text.styleReadForegroundFailed,
        )
      }
      if (fgOutcome.data === null || fgOutcome.data === undefined)
        throw new CepError('JSX', msg.command.text.styleReadForegroundFailed)

      const { added } = appendCustomItem(fgOutcome.data)
      // 官方命中 hex 时**静默不加**，只把已有色块闪三下（`sf.js:346-364`）。
      // 闪色块是 UI（刀3），命令层不能静默 → 抛带原因的错误，由 useCommand 弹出来。
      if (!added) throw new CepError('PARSE', msg.command.text.swatchColorAlreadyIn)
    },
  }),

  // ---------- 按钮 2：打开作者站酷 ----------

  defineCommand({
    id: 'seban.openAuthorSite',
    title: '打开作者站酷',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      openUrlInDefaultBrowser(AUTHOR_SITE)
    },
  }),

  // ---------- 按钮 3：设置（最近色保留条数） ----------

  defineCommand({
    id: 'seban.setRecentLimit',
    title: '设置',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { limit }) {
      // 官方三条文案照抄（`sf.js:404-410`）；收数从 `prompt` 挪到页面（刀3），校验留在命令层
      if (!Number.isInteger(limit))
        throw new CepError('PARSE', msg.command.text.swatchNumberRequired)
      if (limit < 0 || limit > 15) {
        throw new CepError('PARSE', msg.command.text.swatchRecentCountInvalid)
      }
      setRecentLimit(limit)
    },
  }),

  // ---------- 按钮 4：添加当前图层颜色 ----------

  defineCommand({
    id: 'seban.addLayerColor',
    title: '添加当前图层颜色(支持文本、形状图层)',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      // 官方 `TianJiaZT`（`sf.js:387-392`）→ `sb_cy_HuoQuYanSe()`（`main.jsx:216-282`）：
      // 文本图层取 `textItem.color`，形状图层读 `AGMStrokeStyleInfo` 的填充 / 线框色。
      // 主面板没有等价 jsx（`ys_getForegroundColor` 只读前景色），所以本命令暂时只能可见失败。
      requireSebanJsx('sb_cy_HuoQuYanSe')
    },
  }),

  // ---------- 按钮 5：发送到设计助理 ----------

  defineCommand({
    id: 'seban.sendToAssistant',
    title: '发送到设计助理',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { name, kind }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', msg.command.text.swatchGroupNameRequired)

      // 官方 `faSongDaoZhuLi`（`sf.js:426-460`）：`{ name: zuMing, show: true, list: GetColorArray() }`
      // → 交给主面板 `addGroupItem`。**不碰盘**（官方那段写文件的代码是注释掉的，`:446-457`）。
      // `readCustomItems()` 返回**判别联合**（`RepoRead<unknown[]>`），不是数组。
      // 直接塞进 `group.list` 会把整个 `{ok, value}` 写进库文件 —— `list` 变成对象，
      // 该组在样式库里显示不出色块（且 `decodeActionLibrary` 之类会判成坏形状）。
      // 读不到就不许发：发一个空组比不发更糟（用户以为已经发过去了）。
      const read = readCustomItems()
      if (read.status !== 'ok') throw new CepError('IO', read.reason)
      const group = { name: groupName, show: true, list: read.value }

      // 落点走本地命令（`style.appendGroup` = 官方 `addGroupItem`，`app.v4.js:52470-52475`），
      // **不**再发 `sendColor`：官方主面板与本机同装且监听同一频道，两条路都做会把同一个组追加两遍。
      // 见回报里的偏差说明。
      assertInherited(
        await executeInherited('style.appendGroup', { kind, group }, { selection: ctx.selection }),
      )
    },
  }),

  // ---------- 按钮 6：去形状填充 / 去线框 ----------

  defineCommand({
    id: 'seban.setShapeFill',
    title: '点击去掉形状图层填充，shift+点击去掉形状图层线框',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke() {
      // 官方 `SheZhiXingZhuang`（`sf.js:466-472`）→ `sb_SheZhiXingZhuang('1'|'0')`（`main.jsx:448-485`）：
      // 逐个选区改 `AGMStrokeStyleInfo` 的 `fillEnabled` / `strokeEnabled`。
      requireSebanJsx('sb_SheZhiXingZhuang')
    },
  }),

  // ---------- 按钮 7：交换线框与填充 ----------

  defineCommand({
    id: 'seban.swapWireframeFill',
    title: '交换线框和填充状态，仅对形状图层有效',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx) {
      // 官方 `DiaoHuanXingZhuangZhuanTai`（`sf.js:478-480`）发 `QieHuanXianKuang`，
      // 由主面板执行 `cy_swapWireframeFill`（`app.v4.js:17906-17908`）。
      // 我方**直接执行同一条 jsx**、不发事件：官方主面板也监听那个频道，两边都做会交换两次 = 互相抵消。
      // 复用已有命令而不是再写一遍 `legacy.call`（同一操作只有一个入口）。
      assertInherited(
        await executeInherited('commonUse.swapWireframeFill', undefined, {
          selection: ctx.selection,
        }),
      )
    },
  }),

  // ---------- 联动 1：色板侧只发事件（左键填充 / 右键描边）----------
  // 官方就是这条分工：色板 `sf.js` 发 `{type, data}`，主面板 `handleSeBanEvent`（`:17878`）执行。
  // 色板不判断"智能填色开关"，也不直接调填色 jsx——那个开关和 jsx 都属于主面板。

  defineCommand({
    id: 'seban.sendColor',
    title: '左键点色块：给图层填充这个颜色',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke(_ctx, { item }) {
      sendSwatchEvent('setColor', assertSwatchItem(item))
    },
  }),

  defineCommand({
    id: 'seban.sendWireframeColor',
    title: '右键点色块：给描边填这个颜色',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke(_ctx, { item }) {
      sendSwatchEvent('setWireframeColor', assertSwatchItem(item))
    },
  }),

  // ---------- 联动 2：主面板侧执行（由 `bindSeBanReceiver()` 触发）----------

  defineCommand({
    id: 'seban.applyColor',
    title: '（联动）用色板颜色给当前图层上色',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { item }) {
      const color = assertSwatchItem(item)
      // 官方 `:17894-17901`：智能填色**开** → 补 `isFill = true`（`:17896`）再 `ys_useStyleColor`（`:17897`）；
      // **关** → 只把颜色设为前景色，不动图层。
      if (await readAutoFillColor()) {
        await ctx.jsx.style.useStyleColor({ ...color, isFill: true })
        return
      }
      await ctx.jsx.style.setForegroundColor(color)
    },
  }),

  defineCommand({
    id: 'seban.applyWireframeColor',
    title: '（联动）用色板颜色给当前图层描边',
    group: 'seban',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { item }) {
      // 官方 `:17902-17906`：`ys_setBorderColor([项])`，**不补 isFill**
      await ctx.jsx.style.setBorderColor(assertSwatchItem(item))
    },
  }),
]

/**
 * 读 `sj_set.json` 的 `cyAutoFillColor`（智能填色开关，官方默认开，`:65784`）。
 * 判据与 `/commonUse` 同一口径：只有显式 `false` 才算关，缺键按开。
 */
async function readAutoFillColor(): Promise<boolean> {
  const read = readCommonUseOptions()
  const options = read.status === 'ok' ? read.value : read.fallback
  if (read.status !== 'ok') {
    // ADR-14 扩展一：降级必须留信号。读坏了按官方默认（开）继续，但要让
    // "我明明关了智能填色，点一下怎么直接改了图层" 能在日志里查到原因。
    log.warn('seban', '读取智能填色开关失败，按官方默认（开）处理', read.reason)
  }
  return options.cyAutoFillColor !== false
}

/**
 * 主面板侧接收端 —— 官方 `handleSeBanEvent`（`app.v4.js:17878-17906`）的等价物。
 *
 * **只能在主面板入口调用**：色板自己也会收到自己发的广播（`dispatchEvent` 广播不含发送者过滤），
 * 两个面板都绑就是同一次点击执行两遍。
 *
 * 只认 `setColor` / `setWireframeColor`。`"GengXin"` 是主面板发给**色板**的刷新信号，
 * 方向相反，收到自己的广播时直接忽略（与 `stores/swatch.ts` 的不过滤策略互补：
 * 那边不过滤是为了不漏刷新，这边不过滤就会重复执行）。
 */
export function bindSeBanReceiver(): () => void {
  return onAppEvent(APP_EVENT_SEBAN, (data) => {
    const payload = data as { type?: unknown; data?: unknown } | undefined
    const type = payload?.type
    if (type !== 'setColor' && type !== 'setWireframeColor') return

    const id = type === 'setColor' ? 'seban.applyColor' : 'seban.applyWireframeColor'
    const item = (payload?.data ?? {}) as Record<string, unknown>
    void execute(id, { item }).then((result) => {
      // 色板那边收不到执行结果（跨扩展单向广播），失败只能落日志；按钮不静默是色板自己的事
      if (result.status === 'error')
        log.warn('seban', '色板联动执行失败', { type, reason: result.reason })
    })
  })
}
