import {
  archiveDefaultName,
  exportActionArchive,
  importActionArchive,
} from '@/cep/data/action-archive'
import { addWarehouse, deleteWarehouse, renameWarehouse, selectWarehouse } from '@/cep/data/actions'
import { setPref } from '@/cep/data/settings'
import { extensionDir } from '@/cep/paths'
import { openFile, saveFile } from '@/cep/dialog'
import { applyItemDrop, applyListDrop } from '@/domain/reorder'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 本文件**不导出读函数**。
 *
 * 读 PS 动作面板走 `stores/action` 的 `loadPsActions()`：
 * 命令层是"写 + 编排"，读模型归 store。上一轮这里导出过 `readPsActions`，
 * 页面直接 import 它，于是"页面只经 useCommand"这条约束立刻失效。
 */

/**
 * 动作域命令。
 *
 * 数据契约全部来自原版源码（见 `data/actions.ts` 头部注释）：
 * 索引 → 仓库文件 → `[{ groupName, show, list: [{ group, name, alias? }] }]`。
 */
export const actionCommands: Command<unknown>[] = [
  defineCommand({
    id: 'action.call',
    title: '执行动作',
    group: 'action',
    requires: 'document',
    // 动作可能跑几十秒（批处理），必须走长任务：HUD 转圈 + 防重复点击
    // PS 侧没有进度回传，所以不传 progress（HUD 会显示不确定进度）
    kind: 'long',
    async invoke(ctx, { group, name, alias }) {
      // 原版传整个 item；alias 只影响显示，执行仍靠 group + name
      await ctx.jsx.action.callAction({ group, name, alias })
    },
  }),

  defineCommand({
    id: 'action.toggleGroup',
    title: '展开/收起分组',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { index }) {
      // `show` 的语义是推断的：原版 checkError 只保证字段存在（app.v4.js:55873）。
      // 用它做折叠状态，切页/重开面板都能保持，比页面本地 ref 更合理。
      await ctx.data.actionLibrary.update((list) => {
        const target = list[index]
        if (!target) throw new CepError('PARSE', msg.command.text.actionGroupMissing)
        target.show = !target.show
      })
    },
  }),

  defineCommand({
    id: 'action.addGroup',
    title: '新建动作分组',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { name, afterIndex }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', msg.command.text.actionGroupNameRequired)

      await ctx.data.actionLibrary.update((list) => {
        const next = { groupName, show: true, list: [] }
        // 原版 addGroup(name, afterIndex)：afterIndex 有效时插到它后面
        if (typeof afterIndex === 'number' && afterIndex >= 0 && afterIndex < list.length) {
          list.splice(afterIndex + 1, 0, next)
        } else {
          list.push(next)
        }
      })
    },
  }),

  defineCommand({
    id: 'action.renameGroup',
    title: '重命名动作分组',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { index, name }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', msg.command.text.actionGroupNameRequired)

      await ctx.data.actionLibrary.update((list) => {
        const target = list[index]
        if (!target) throw new CepError('PARSE', msg.command.text.actionGroupMissing)
        // 原版 renameGroup 不查重，直接改名
        target.groupName = groupName
      })
    },
  }),

  defineCommand({
    id: 'action.deleteGroup',
    title: '删除动作分组',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { index }) {
      await ctx.data.actionLibrary.update((list) => {
        if (!list[index]) throw new CepError('PARSE', msg.command.text.actionGroupMissing)
        list.splice(index, 1)
        // 原版 deleteGroup：删空后补一个“默认分组”
        if (list.length === 0) list.push({ groupName: '默认分组', show: true, list: [] })
      })
    },
  }),

  defineCommand({
    id: 'action.deleteItem',
    title: '删除动作',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex }) {
      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]
        if (!target || !target.list[itemIndex])
          throw new CepError('PARSE', msg.command.text.actionMissing)
        target.list.splice(itemIndex, 1)
      })
    },
  }),

  defineCommand({
    id: 'action.setAlias',
    title: '设置别名',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex, alias }) {
      const text = alias.trim()
      if (!text) throw new CepError('PARSE', msg.command.text.actionAliasRequired)

      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]?.list[itemIndex]
        if (!target) throw new CepError('PARSE', msg.command.text.actionMissing)
        // 保留 group + name（执行时仍需要），只加 alias
        target.alias = text
      })
    },
  }),

  defineCommand({
    id: 'action.deleteAlias',
    title: '删除别名',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { groupIndex, itemIndex }) {
      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]?.list[itemIndex]
        if (!target) throw new CepError('PARSE', msg.command.text.actionMissing)
        delete target.alias
      })
    },
  }),

  defineCommand({
    id: 'action.selectWarehouse',
    title: '切换动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      await selectWarehouse(index)
    },
  }),

  defineCommand({
    id: 'action.addWarehouse',
    title: '新建动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { name }) {
      const text = (name ?? '未命名分组').trim()
      if (!text) throw new CepError('PARSE', msg.command.text.actionWarehouseNameRequired)
      await addWarehouse(text)
    },
  }),

  defineCommand({
    id: 'action.renameWarehouse',
    title: '重命名动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index, name }) {
      const text = name.trim()
      if (!text) throw new CepError('PARSE', msg.command.text.actionWarehouseNameRequired)
      await renameWarehouse(index, text)
    },
  }),

  defineCommand({
    id: 'action.deleteWarehouse',
    title: '删除动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      await deleteWarehouse(index)
    },
  }),

  defineCommand({
    id: 'action.reorderGroup',
    title: '调整动作分组顺序',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { from, to, position }) {
      await ctx.data.actionLibrary.update((list) => {
        // 四分支落点只在 `domain/reorder.ts` 一份；越界抛，不静默吞
        const moved = applyListDrop(list, from, to, position)
        if (moved < 0) return
        // 照 `/style` 范本：被拖组随同一次写盘折叠（`moveKuGroupTo` 里同样 `show = false`）。
        // UNVERIFIED: 判据没有点名这条；原版源码在 `docs/原版/01-原版源码/panel/js/app.v4.js`，未复核到出处。
        list[moved].show = false
      })
    },
  }),

  defineCommand({
    id: 'action.reorderItem',
    title: '调整动作顺序',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { fromGroup, fromIndex, toGroup, toIndex, position }) {
      await ctx.data.actionLibrary.update((list) => {
        applyItemDrop(
          list.map((group) => group.list),
          {
            from: { group: fromGroup, index: fromIndex },
            to: { group: toGroup, index: toIndex },
            position,
          },
        )
      })
    },
  }),

  defineCommand({
    id: 'action.setListType',
    title: '设置动作列表列数',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { columns }) {
      if (columns !== 1 && columns !== 2 && columns !== 3) {
        throw new CepError('PARSE', msg.command.text.actionColCountInvalid)
      }
      // 原版 dzShowListType 用 0/1/2；命令对 UI 用 1/2/3
      setPref('dzShowListType', columns - 1)
    },
  }),

  defineCommand({
    id: 'action.exportWarehouse',
    title: '导出动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { current }) {
      const defaultName = await archiveDefaultName(current)
      const path = saveFile('导出预设', ['dzx'], defaultName)
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      await exportActionArchive(current, path)
    },
  }),

  defineCommand({
    id: 'action.importWarehouse',
    title: '导入动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { append }) {
      const path = openFile('导入动作仓库', ['dzx'])
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      await importActionArchive(append, path)
    },
  }),

  defineCommand({
    id: 'action.importDefault',
    title: '导入默认动作预设',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      const path = `${extensionDir()}/preset/动作库-设计助理预设.dzx`
      await importActionArchive(false, path)
    },
  }),

  defineCommand({
    id: 'action.addFromPs',
    title: '从 Photoshop 添加动作',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { groupIndex, items }) {
      if (!items.length) throw new CepError('PARSE', msg.command.text.actionNoneSelected)

      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]
        if (!target) throw new CepError('PARSE', msg.command.text.actionTargetGroupMissing)

        // 原版 addList 直接 push，不去重
        for (const item of items) target.list.push({ group: item.group, name: item.name })
      })
    },
  }),
]
