import {
  appendStyleLibraryItem,
  readStyleGroupId,
  readStyleLibraryItem,
  replaceStyleLibraryItem,
} from '@/cep/data/style-library-repo'
import { asJsxResult } from '@/utils/jsx-result'
import { CepError } from '@/utils/errors'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 样式域命令（`/style` 第 2 段）。
 *
 * 分两类：
 * - **应用**（改 PS 文档）：颜色 / 渐变 / 图层样式 → `ctx.jsx.style`
 * - **添加**（从 PS 读回本地库）：前景色 / 渐变 / 图层样式 → 读 jsx + 追加到库文件
 *
 * 本期不做：吸色到组（`Tool_set("eyedropperTool")` + PS 事件 `1936028772`，`app.v4.js:50299-50302`）、
 * 拖图片取色（`exportCurrentLayerToImage`，`:54639`）、仓库发送/移动、四类库与 `.kux` 的导入导出。
 *
 * **返回结构全部未实测**（jsxbin 是字节码，符号不可读）。每条命令的返回值语义标了 UNVERIFIED，
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
      const item = await readStyleLibraryItem('color', groupIndex, itemIndex)

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
          await replaceStyleLibraryItem('color', groupIndex, itemIndex, raw)
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
      const item = await readStyleLibraryItem('gradient', groupIndex, itemIndex)
      // 原版 `:50791` 发的是 `t.gradient`，不是整个项
      const gradient = (item as { gradient?: unknown }).gradient
      if (!gradient) throw new CepError('PARSE', '这一项没有 gradient 载荷')
      await ctx.jsx.style.useGradient(gradient)
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
      const item = await readStyleLibraryItem('style', groupIndex, itemIndex)
      const groupId = await readStyleGroupId('style', groupIndex)
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
      await appendStyleLibraryItem('color', groupIndex, raw)
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
      await appendStyleLibraryItem('gradient', groupIndex, {
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
      const groupId = await readStyleGroupId('style', groupIndex)

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
      await appendStyleLibraryItem('style', groupIndex, result.data)
    },
  }),
]
