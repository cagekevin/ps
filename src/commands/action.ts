import {
  archiveDefaultName,
  exportActionArchive,
  importActionArchive,
} from '@/cep/data/action-archive'
import { addWarehouse, deleteWarehouse, renameWarehouse, selectWarehouse } from '@/cep/data/actions'
import { setPref } from '@/cep/data/settings'
import { extensionDir } from '@/cep/fs'
import { openFile, saveFile } from '@/cep/dialog'
import { CepError } from '@/utils/errors'
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
    async run(ctx, { group, name, alias }) {
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
    async run(ctx, { index }) {
      // `show` 的语义是推断的：原版 checkError 只保证字段存在（app.v4.js:55873）。
      // 用它做折叠状态，切页/重开面板都能保持，比页面本地 ref 更合理。
      await ctx.data.actionLibrary.update((list) => {
        const target = list[index]
        if (!target) throw new CepError('PARSE', '分组不存在')
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
    async run(ctx, { name, afterIndex }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', '分组名不能为空')

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
    async run(ctx, { index, name }) {
      const groupName = name.trim()
      if (!groupName) throw new CepError('PARSE', '分组名不能为空')

      await ctx.data.actionLibrary.update((list) => {
        const target = list[index]
        if (!target) throw new CepError('PARSE', '分组不存在')
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
    async run(ctx, { index }) {
      await ctx.data.actionLibrary.update((list) => {
        if (!list[index]) throw new CepError('PARSE', '分组不存在')
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
    async run(ctx, { groupIndex, itemIndex }) {
      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]
        if (!target || !target.list[itemIndex]) throw new CepError('PARSE', '动作不存在')
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
    async run(ctx, { groupIndex, itemIndex, alias }) {
      const text = alias.trim()
      if (!text) throw new CepError('PARSE', '别名不能为空')

      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]?.list[itemIndex]
        if (!target) throw new CepError('PARSE', '动作不存在')
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
    async run(ctx, { groupIndex, itemIndex }) {
      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]?.list[itemIndex]
        if (!target) throw new CepError('PARSE', '动作不存在')
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
    async run(_ctx, { index }) {
      await selectWarehouse(index)
    },
  }),

  defineCommand({
    id: 'action.addWarehouse',
    title: '新建动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { name }) {
      const text = (name ?? '未命名分组').trim()
      if (!text) throw new CepError('PARSE', '仓库名不能为空')
      await addWarehouse(text)
    },
  }),

  defineCommand({
    id: 'action.renameWarehouse',
    title: '重命名动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { index, name }) {
      const text = name.trim()
      if (!text) throw new CepError('PARSE', '仓库名不能为空')
      await renameWarehouse(index, text)
    },
  }),

  defineCommand({
    id: 'action.deleteWarehouse',
    title: '删除动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { index }) {
      await deleteWarehouse(index)
    },
  }),

  defineCommand({
    id: 'action.reorderGroup',
    title: '调整动作分组顺序',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { from, to }) {
      await ctx.data.actionLibrary.update((list) => {
        if (from === to || !list[from] || !list[to]) return
        const [group] = list.splice(from, 1)
        list.splice(to, 0, group)
      })
    },
  }),

  defineCommand({
    id: 'action.reorderItem',
    title: '调整动作顺序',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { fromGroup, fromIndex, toGroup, toIndex, position }) {
      await ctx.data.actionLibrary.update((list) => {
        const source = list[fromGroup]
        const target = list[toGroup]
        if (!source?.list[fromIndex] || !target) {
          throw new CepError('PARSE', '动作或分组不存在')
        }

        const [item] = source.list.splice(fromIndex, 1)
        let insertAt = toIndex + (position === 'after' ? 1 : 0)

        // 同组内移动：先删后插，目标下标要补偿
        if (fromGroup === toGroup && fromIndex < toIndex) insertAt -= 1

        insertAt = Math.max(0, Math.min(insertAt, target.list.length))
        target.list.splice(insertAt, 0, item)
      })
    },
  }),

  defineCommand({
    id: 'action.setListType',
    title: '设置动作列表列数',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { columns }) {
      if (columns !== 1 && columns !== 2 && columns !== 3) {
        throw new CepError('PARSE', '列数只能是 1 / 2 / 3')
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
    async run(_ctx, { current }) {
      const defaultName = await archiveDefaultName(current)
      const path = saveFile('导出预设', ['dzx'], defaultName)
      if (!path) throw new CepError('PARSE', '取消操作')

      await exportActionArchive(current, path)
    },
  }),

  defineCommand({
    id: 'action.importWarehouse',
    title: '导入动作仓库',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { append }) {
      const path = openFile('导入动作仓库', ['dzx'])
      if (!path) throw new CepError('PARSE', '取消操作')

      await importActionArchive(append, path)
    },
  }),

  defineCommand({
    id: 'action.importDefault',
    title: '导入默认动作预设',
    group: 'action',
    requires: 'none',
    kind: 'instant',
    async run() {
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
    async run(ctx, { groupIndex, items }) {
      if (!items.length) throw new CepError('PARSE', '没有选中任何动作')

      await ctx.data.actionLibrary.update((list) => {
        const target = list[groupIndex]
        if (!target) throw new CepError('PARSE', '目标分组不存在')

        // 原版 addList 直接 push，不去重
        for (const item of items) target.list.push({ group: item.group, name: item.name })
      })
    },
  }),
]
