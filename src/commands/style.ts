import {
  addKuGroup,
  addKuItem,
  addWarehouse,
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
  replaceKuItem,
  selectWarehouse,
  sendKuGroupToSwatch,
  sendKuItemToSwatch,
  setKuGroupShow,
} from '@/cep/data/style-library-repo'
import { asJsxResult, assertJsxOk } from '@/utils/jsx-result'
import { encodeText } from '@/domain/translate'
import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { Command } from './types'

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
 * 拖图片取色（`exportCurrentLayerToImage`，`:54639`）、仓库发送/移动（T-65）、
 * 四类库与 `.kux` 的导入导出。项 / 组的拖拽排序走 `style.moveItemTo` / `style.moveGroupTo`
 * （原版 `drag` / `dragColorWrap` 的 `Callback`，页面用 `composables/useLongPressDrag` 起拖）。
 *
 * **jsx 返回结构全部未实测**（jsxbin 是字节码，符号不可读）。每条命令的返回值语义标了 UNVERIFIED，
 * 因此：只判空、判 `err`，绝不读 `data` 里的具体字段。
 */

/** 把 jsx 返回值归一成 `{ err, data }`；调用方只判 err 与 data 是否存在 */
function check(raw: unknown, fallback: string): { ok: boolean; data?: unknown; msg: string } {
  const result = asJsxResult(raw)
  return { ok: result.ok, data: result.data, msg: result.msg || fallback }
}

export const styleCommands: Command<unknown>[] = [
  defineCommand({
    id: 'style.applyColor',
    title: '应用颜色',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex, itemIndex, modifier }) {
      // 发的是**磁盘上的原始项**：视图模型 KuItem 丢了未知键
      const item = await readKuItem('color', groupIndex, itemIndex)

      switch (modifier) {
        case 'ctrl':
          await ctx.jsx.style.useShapeFill(item)
          return
        case 'shift':
          await ctx.jsx.style.setBorderColor(item)
          return
        case 'alt': {
          const raw = await ctx.jsx.style.changeStyleColor(item)
          const result = check(raw, '更改颜色失败')
          if (!result.ok) throw new CepError('JSX', result.msg)

          // UNVERIFIED: 原版 `:50153` 用 `r != -1` 判取消，`-1` 之外的值就是"新项"。
          // 返回的项字段是否与入参同构（name/color/未知键）源码看不出来，
          // 所以只在拿到对象时回写，其它一律报错而不是猜。
          if (raw === -1) return
          await replaceKuItem('color', groupIndex, itemIndex, raw)
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
    async run(ctx, { groupIndex, itemIndex }) {
      const item = await readKuItem('gradient', groupIndex, itemIndex)
      // 原版 `:50791` 发的是 `t.gradient`，不是整个项
      const gradient = item.gradient
      if (!gradient) throw new CepError('PARSE', '这一项没有 gradient 载荷')
      await ctx.jsx.style.useGradient(gradient)
    },
  }),

  defineCommand({
    id: 'style.applyFont',
    title: '应用字体',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex, itemIndex }) {
      // 原版 `useFont`（`app.v4.js:51200-51215`）：整项 `JSON.stringify` → `Xv` 编码 →
      // `ys_checkUseFont`，`err == 1` 就 `$msg.showErr` 中止，否则 `ys_useFont`。
      // 编码与两步顺序照 `commands/fontSet.ts` 的 `fontSet.pasteFont`，不另造形状。
      const item = await readKuItem('font', groupIndex, itemIndex)
      const payload = encodeText(JSON.stringify(item))
      assertJsxOk(await ctx.jsx.font.checkUseFont(payload), '检查字体可用性失败')
      assertJsxOk(await ctx.jsx.font.useFont(payload), '应用字体设置失败')
    },
  }),

  defineCommand({
    id: 'style.applyStyle',
    title: '应用图层样式',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex, itemIndex }) {
      // 原版 `:51509-51511`：深拷贝项 + groupId 后整条发给 jsxbin
      const item = await readKuItem('style', groupIndex, itemIndex)
      const groupId = await readKuGroupId('style', groupIndex)
      await ctx.jsx.style.useStyle(item, groupId)
    },
  }),

  defineCommand({
    id: 'style.addColor',
    title: '添加颜色',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex }) {
      // UNVERIFIED: 原版 `:50196` 只判 `a != null`；返回结构未实测
      const raw = await ctx.jsx.style.getForegroundColor()
      if (raw === null || raw === undefined) throw new CepError('JSX', '读取前景色失败')
      await addKuItem('color', groupIndex, raw)
    },
  }),

  defineCommand({
    id: 'style.addGradient',
    title: '添加渐变',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex }) {
      // 原版 `:50755-50771`：`false` 直接返回；`err == 1` 报错；
      // 成功后包成 `{ name: "未命名", gradient: data }` 再入库
      const raw = await ctx.jsx.style.getGradientInfo()
      if (raw === false) throw new CepError('JSX', '读取渐变失败')
      const result = check(raw, '读取渐变失败')
      if (!result.ok) throw new CepError('JSX', result.msg)

      // UNVERIFIED: `data` 的形状按 `app.v4.js:50767-50769` 是渐变项里的 gradient 载荷；
      // 这里是 `undefined`（mock/未取到时）也照样写"未命名"空壳，还是报错？
      // 原版没判，我们不补默认值 → 判空后报错，让调用方看见。
      if (result.data === null || result.data === undefined) {
        throw new CepError('JSX', '读取渐变失败：没有内容')
      }
      await addKuItem('gradient', groupIndex, {
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
    async run(ctx, { groupIndex }) {
      const groupId = await readKuGroupId('style', groupIndex)

      // 原版 `:51532-51536` 发 { delArr, groupId, envDir: "/SheJiZhuLi" }。
      // `delArr` 来自 `kuStyle/ls_ysDelete.json`（`getDeleteStyleId`，`:53071-53093`）——
      // 那是"删除样式后告诉 jsxbin 文档里哪些样式该删"的临时清单，本项目没有（契约 §4.4 明确别现写一份）。
      // 添加新样式不需要删任何东西 → 传空数组。
      // UNVERIFIED: `[]` 会不会让 jsxbin 误删，未实测；真机验收点见 docs/页面/06-样式.md。
      const raw = await ctx.jsx.style.addStyle({
        delArr: [],
        groupId,
        envDir: '/SheJiZhuLi',
      })

      const result = check(raw, '保存图层样式失败')
      if (!result.ok) throw new CepError('JSX', result.msg)
      // UNVERIFIED: 原版 `:51547` 直接把 `r.data` 当项入库，字段结构未实测
      if (result.data === null || result.data === undefined) {
        throw new CepError('JSX', '保存图层样式失败：没有内容')
      }
      await addKuItem('style', groupIndex, result.data)
    },
  }),

  defineCommand({
    id: 'style.addFont',
    title: '添加字体',
    group: 'style',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { groupIndex }) {
      // 原版 `addFont`（`app.v4.js:51243-51264`）：`ys_getFontInfo` → `false` 直接返回 /
      // `err == 1` 报错 / `err == 0` 且 `data.fonts` 为空报错「读取字体属性失败」/ 否则 `addItem(data)`。
      // jsx 用的是字体域已有的 `getFontInfo`（`cep/jsx/font.ts:53` = `ys_getFontInfo`），不新造函数名。
      const raw = await ctx.jsx.font.getFontInfo()
      if (raw === false) throw new CepError('JSX', '读取字体属性失败')
      const result = check(raw, '读取字体属性失败')
      if (!result.ok) throw new CepError('JSX', result.msg)

      // UNVERIFIED: `data` 的形状按原版调用侧是 `{ fonts: [...] }`（`:51258` 读 `data.fonts.length`），
      // 其余字段未实测 → 只判 fonts 非空，然后整份原样入库（不补键、不改写）。
      const data = result.data as { fonts?: unknown } | null | undefined
      if (!data || !Array.isArray(data.fonts) || data.fonts.length === 0) {
        throw new CepError('PARSE', '读取字体属性失败：没有可添加的字体')
      }
      await addKuItem('font', groupIndex, data)
    },
  }),

  // ---------- 第 3 段：分组 / 项的增删改（只动本地库文件，不碰 PS）----------

  defineCommand({
    id: 'style.addGroup',
    title: '新建分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, name, afterIndex }) {
      await addKuGroup(kind, name, afterIndex)
    },
  }),

  defineCommand({
    id: 'style.renameGroup',
    title: '重命名分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, name }) {
      await renameKuGroup(kind, groupIndex, name)
    },
  }),

  defineCommand({
    id: 'style.deleteGroup',
    title: '删除分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex }) {
      // 原版 `:52451-52454`：删空后补一个「<库名>默认分组」，所以删完永远还有一组
      await deleteKuGroup(kind, groupIndex)
    },
  }),

  defineCommand({
    id: 'style.toggleGroupShow',
    title: '显示/隐藏分组',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, only }) {
      // `only` 是"只显示这一组"（原版 showOnlyGroup），不是"设成显示"——别当布尔值用
      await setKuGroupShow(kind, groupIndex, only === true)
    },
  }),

  defineCommand({
    id: 'style.addItem',
    title: '添加项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, item }) {
      // 项由调用方给（复制粘贴 / 色板回收 / 从别组搬）；命令不造项、不补字段
      await addKuItem(kind, groupIndex, item)
    },
  }),

  defineCommand({
    id: 'style.renameItem',
    title: '重命名项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, itemIndex, name }) {
      await renameKuItem(kind, groupIndex, itemIndex, name)
    },
  }),

  defineCommand({
    id: 'style.deleteItem',
    title: '删除项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, itemIndex }) {
      await deleteKuItem(kind, groupIndex, itemIndex)
    },
  }),

  defineCommand({
    id: 'style.reorderItem',
    title: '上移/下移项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, itemIndex, direction }) {
      // 原版只有拖拽（`app.v4.js:50040-50070`），没有上下移菜单；这里按同一 splice 语义挪一格
      await moveKuItem(kind, groupIndex, itemIndex, direction)
    },
  }),

  defineCommand({
    id: 'style.moveItemTo',
    title: '拖拽移动项',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, fromGroup, fromIndex, toGroup, toIndex, position }) {
      // 原版 `drag` 的 `Callback`（`app.v4.js:50052-50069`）：跨组 / 同组向后 / 同组向前
      // 三种情况由 `position`（那个布尔）决定插前还是插后，四分支在 `domain/reorder.ts`。
      // 一次调用一次写盘：拖拽过程中页面不调它，只在 `mouseup` 后调一次。
      await moveKuItemTo(kind, {
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
    async run(_ctx, { kind, from, to, position }) {
      // 原版 `dragColorWrap` 的 `Callback`（`app.v4.js:50094-50111`）；被拖组会顺带折叠，
      // 与原版 `before()` + 同一次 `updata()` 落盘的结果一致（见 repo 里的注释）
      await moveKuGroupTo(kind, from, to, position)
    },
  }),

  defineCommand({
    id: 'style.sendToSwatch',
    title: '发送到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, itemIndex }) {
      // 原版 `:50349-50355`：把 `[item]` 写成色板文件全文（整份替换，不是追加），再发 app event 通知色板面板。
      // UNVERIFIED: 那条 `com.fengzi.event.seban` 通知没有发（本项目没有通用 app event 发送器），
      // 色板面板会不会自己刷新未验；详见 `sendKuItemToSwatch` 的注释。
      await sendKuItemToSwatch(kind, groupIndex, itemIndex)
    },
  }),

  defineCommand({
    id: 'style.appendItemToSwatch',
    title: '追加到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex, itemIndex }) {
      // 原版 `:50356-50364`：读回 seBan 数组 → push 该项 → 写回（与上一条的"整份替换"相反）
      await appendKuItemToSwatch(kind, groupIndex, itemIndex)
    },
  }),

  defineCommand({
    id: 'style.sendGroupToSwatch',
    title: '整组发送到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex }) {
      // 原版 `:50260-50268`：`write(seBan, JSON.stringify(list))`——整组**替换**色板，不是追加
      await sendKuGroupToSwatch(kind, groupIndex)
    },
  }),

  defineCommand({
    id: 'style.appendGroupToSwatch',
    title: '整组追加到色板',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { kind, groupIndex }) {
      // 原版 `:50269-50290`：读回 → 逐项 push 该组 `list` → 写回
      await appendKuGroupToSwatch(kind, groupIndex)
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
    async run(_ctx, { index }) {
      // 原版 `select(t)`（`:53365-53372`）：越界归 0，然后 `updata()` 落盘
      await selectWarehouse(index)
    },
  }),

  defineCommand({
    id: 'style.addWarehouse',
    title: '新建仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run() {
      // 原版 `add()`（`:53357-53363`）：追加一条「未命名分组」+ 四个库文件名
      await addWarehouse()
    },
  }),

  defineCommand({
    id: 'style.renameWarehouse',
    title: '重命名仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { index, name }) {
      // 原版 `rename(t, e)`（`:53324-53327`）；空名在 repo 层被拒（有意偏离，见那里的注释）
      await renameWarehouse(index, name)
    },
  }),

  defineCommand({
    id: 'style.deleteWarehouse',
    title: '删除仓库',
    group: 'style',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { index }) {
      // 原版 `delete(t)`（`:53329-53356`）直接删磁盘文件；这里移进 `<用户目录>/.deleted-<时间戳>/`
      // （有意偏离，可恢复），回收目录由 repo 写进日志
      await deleteWarehouse(index)
    },
  }),
]
