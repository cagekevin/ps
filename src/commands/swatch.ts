// 是什么：色板面板（独立 CEP 面板 `#/seBan`）的 7 个按钮，一条命令一个按钮
// 唯一入口：这 7 个动作只能走这里；页面（刀3）经 `useCommand` 调，不直连 jsx / data
// 替代了什么：原版面板 `%APPDATA%/fz.FengZi3Hao/js/sf.js` 的 7 个全局函数
//   （`TianJia` / `GuanYu` / `SheZhi` / `TianJiaZT` / `faSongDaoZhuLi` / `SheZhiXingZhuang` /
//   `DiaoHuanXingZhuangZhuanTai`，`:377-480`）
// 谁在用：`pages/seBan/*`（刀3）
// 禁止：页面不许 import 本文件的值；不许在这里做 UI（prompt / alert 归页面）

import { CepError, type CepErrorCode } from '@/utils/errors'
import { openUrlInDefaultBrowser } from '@/cep/open-url'
import { appendCustomItem, readCustomItems, setRecentLimit } from '@/cep/data/swatch-repo'
import { executeInherited, defineCommand } from './registry'
import type { Command, CommandResult } from './types'

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
  throw new CepError(
    'JSX',
    `${fn} 不在本扩展的 jsx 里：它属于色板面板自带的 jsx/main.jsx（需随面板分发并 evalFile），` +
      `详见 docs/页面/11-色板面板.md §六`,
  )
}

/**
 * 把 `executeInherited` 的结果还原成抛错（与 `commands/freePanel.ts:316-317` 同一口径）：
 * 子命令自己的 `code` 原样抛回去，否则 `useCommand` 的 `FONT_MISSING` 一类分支会失效。
 * `CommandResult.code` 是 `string`，`CepError` 收 `CepErrorCode`——注册表只在枚举内产出。
 */
function assertInherited(result: CommandResult): void {
  if (!result.ok) throw new CepError((result.code ?? 'JSX') as CepErrorCode, result.reason)
}

export const swatchCommands: Command<unknown>[] = [
  // ---------- 按钮 1：添加前景色 ----------

  defineCommand({
    id: 'seban.addForegroundColor',
    title: '添加前景色',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async run(ctx) {
      // 官方 `TianJia`（`sf.js:377-382`）→ `sb_GetColorObject()` = `sb_ZhuanHuanYanSeDuiXiang(app.foregroundColor)`
      // （`main.jsx:99-102` / `:287-298`）→ `{name:"未命名", color:{hex,c,m,y,k}}`。
      // 主面板里等价的那条是 `ys_getForegroundColor()`（`app.v4.js:50193`，样式页"添加颜色"同一条），
      // 名字在原版派发表里能命中，所以走它而不是 `sb_*`。
      // UNVERIFIED：两条 jsx 的字段是否逐字一致未实测；本命令只要求"是个带 color.hex 的对象"。
      const raw = await ctx.jsx.style.getForegroundColor()
      if (raw === null || raw === undefined) throw new CepError('JSX', '读取前景色失败')

      const { added } = await appendCustomItem(raw)
      // 官方命中 hex 时**静默不加**，只把已有色块闪三下（`sf.js:346-364`）。
      // 闪色块是 UI（刀3），命令层不能静默 → 抛带原因的错误，由 useCommand 弹出来。
      if (!added) throw new CepError('PARSE', '色板里已经有这个颜色了，未重复添加')
    },
  }),

  // ---------- 按钮 2：打开作者站酷 ----------

  defineCommand({
    id: 'seban.openAuthorSite',
    title: '打开作者站酷',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async run() {
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
    async run(_ctx, { limit }) {
      // 官方三条文案照抄（`sf.js:404-410`）；收数从 `prompt` 挪到页面（刀3），校验留在命令层
      if (!Number.isInteger(limit)) throw new CepError('PARSE', '请输入数字')
      if (limit < 0 || limit > 15) {
        throw new CepError('PARSE', '最近使用记录不允许少于0或者多于15个颜色')
      }
      await setRecentLimit(limit)
    },
  }),

  // ---------- 按钮 4：添加当前图层颜色 ----------

  defineCommand({
    id: 'seban.addLayerColor',
    title: '添加当前图层颜色(支持文本、形状图层)',
    group: 'seban',
    requires: 'none',
    kind: 'instant',
    async run() {
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
    async run(ctx, { name, kind }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', '组名不能为空')

      // 官方 `faSongDaoZhuLi`（`sf.js:426-460`）：`{ name: zuMing, show: true, list: GetColorArray() }`
      // → 交给主面板 `addGroupItem`。**不碰盘**（官方那段写文件的代码是注释掉的，`:446-457`）。
      const list = await readCustomItems()
      const group = { name: groupName, show: true, list }

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
    async run() {
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
    async run(ctx) {
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
]
