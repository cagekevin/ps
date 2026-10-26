import { openFile, saveFile } from '@/cep/dialog'
import { renameWriter } from '@/cep/data/rename'
import { readExternalText } from '@/cep/fs-read'
import { writeDiskSync } from '@/cep/disk-write'
import {
  addGroupAt,
  addItemAt,
  changeItemAt,
  checkExpression,
  deleteGroupAt,
  deleteItemAt,
  parsePreset,
  pushHistory,
  renameGroupAt,
  serializePreset,
  toggleGroupAt,
} from '@/domain/rename'
import { applyItemDrop, applyListDrop } from '@/domain/reorder'
import { CepError } from '@/utils/errors'
import { isDecodeFail } from '@/utils/decode'
import { describeDecodeFail } from '@/cep/data/repo-read'
import { msg } from '@/domain/messages'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 重命名域命令（`/rename`）。
 *
 * 分两类：
 * - **改 PS 文档**：批量重命名、图层颜色标记 → 走 `ctx.jsx.rename`（`cmm_batchName` / `cmm_setLayerColor`）
 * - **改本地预设**：组的增删改序、项的增删改序、导入导出 → 走 `data/rename` 仓库
 *
 * 规则都写在 `domain/rename.ts`；这里只做"校验 + 调一次"。
 * 表达式**求值不在我们这边**：PS 的 `cmm_batchName` 负责，见 domain 里的 UNVERIFIED。
 */
export const renameCommands: Command<unknown>[] = [
  defineCommand({
    id: 'rename.batchName',
    title: '重命名图层',
    group: 'layer',
    requires: 'layer',
    // 图层多时 PS 侧要跑一会，原版用 $load 转圈（app.v4.js:57232）；我们走长任务 HUD
    kind: 'long',
    async invoke(ctx, { expression, filterChildren }) {
      const message = checkExpression(expression)
      if (message) throw new CepError('PARSE', message)

      // 原版先 addHistory(表达式) 再执行（:57230），历史因此包含失败的那些——保持一致
      renameWriter.update((preset) => pushHistory(preset, expression))
      await ctx.jsx.rename.batchName(expression, filterChildren)
    },
  }),

  defineCommand({
    id: 'rename.setLayerColor',
    title: '设置图层颜色标记',
    group: 'layer',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { colorIndex }) {
      if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 7) {
        throw new CepError('PARSE', msg.command.text.renameColorIndexInvalid)
      }
      await ctx.jsx.rename.setLayerColor(colorIndex)
    },
  }),

  defineCommand({
    id: 'rename.toggleGroup',
    title: '展开/收起重命名分组',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      renameWriter.update((preset) => toggleGroupAt(preset, index))
    },
  }),

  defineCommand({
    id: 'rename.addGroup',
    title: '新建重命名分组',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { name, afterIndex }) {
      renameWriter.update((preset) => addGroupAt(preset, name, afterIndex))
    },
  }),

  defineCommand({
    id: 'rename.renameGroup',
    title: '重命名分组',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index, name }) {
      renameWriter.update((preset) => renameGroupAt(preset, index, name))
    },
  }),

  defineCommand({
    id: 'rename.deleteGroup',
    title: '删除重命名分组',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { index }) {
      renameWriter.update((preset) => deleteGroupAt(preset, index))
    },
  }),

  defineCommand({
    id: 'rename.addItem',
    title: '添加重命名预设',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { groupIndex, text }) {
      renameWriter.update((preset) => addItemAt(preset, groupIndex, text))
    },
  }),

  defineCommand({
    id: 'rename.changeItem',
    title: '修改重命名预设',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { groupIndex, itemIndex, text }) {
      renameWriter.update((preset) => changeItemAt(preset, groupIndex, itemIndex, text))
    },
  }),

  defineCommand({
    id: 'rename.deleteItem',
    title: '删除重命名预设',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { groupIndex, itemIndex }) {
      renameWriter.update((preset) => deleteItemAt(preset, groupIndex, itemIndex))
    },
  }),

  defineCommand({
    id: 'rename.reorderGroup',
    title: '调整重命名分组顺序',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { from, to, position }) {
      renameWriter.update((preset) => {
        if (from === to) return
        // 台账 T-67 判据④：第 0 组（最近使用）固定，不参与排序
        if (from < 1 || to < 1)
          throw new CepError('PARSE', msg.command.text.renameFixedGroupNoReorder)
        const moved = applyListDrop(preset, from, to, position)
        // 照 `/style` 范本：被拖组随同一次写盘折叠。
        // UNVERIFIED: 判据没有点名这条；原版源码在 `docs/原版/01-原版源码/panel/js/app.v4.js`，未复核到出处。
        if (moved >= 0) preset[moved].show = false
      })
    },
  }),

  defineCommand({
    id: 'rename.reorderItem',
    title: '调整重命名预设顺序',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(_ctx, { fromGroup, fromIndex, toGroup, toIndex, position }) {
      renameWriter.update((preset) => {
        // 台账 T-67 判据④：源组和落点组都不能是第 0 组。
        // UNVERIFIED: 判据只点名「第 0 组不可拖」，没有逐字说项拖拽的源/落点。
        if (fromGroup === 0 || toGroup === 0) {
          throw new CepError('PARSE', msg.command.text.renameFixedGroupNoReorder)
        }
        applyItemDrop(
          preset.map((group) => group.list),
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
    id: 'rename.exportPreset',
    title: '导出重命名预设',
    group: 'file',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      const read = renameWriter.read()
      if (read.status !== 'ok') throw new CepError('IO', read.reason)

      // 原版 saveFile("导出", ["cmm"], "重命名.cmm", "设计助理导出文件")（:57020）
      const path = saveFile('导出', ['cmm'], '重命名.cmm')
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      // 导出文件是**新文件**，无 `.bak` 概念（`backup: 'none'`）；走唯一落盘入口（原子写）
      writeDiskSync(path, serializePreset(read.value), {
        backup: { mode: 'none', why: '导出产物，无原文可备' },
        cas: { mode: 'skip', why: '用户经系统对话框选定目标路径，覆盖意图已确认' },
      })
    },
  }),

  defineCommand({
    id: 'rename.importPreset',
    title: '导入重命名预设',
    group: 'file',
    requires: 'none',
    kind: 'instant',
    async invoke() {
      // 原版 openFile("导入重命名预设", ["cmm"], "设计助理导入文件")（:57030）
      const path = openFile('导入重命名预设', ['cmm'])
      if (!path) throw new CepError('PARSE', msg.command.text.actionCancelled)

      const read = await readExternalText(path)
      // T-107：两种不 ok 这里同果（都抛同一句），文案不变。
      // 不违反 ADR-16：ADR-16 管的是"操作定义在哪 / 谁能触发"——本处就是 Command、页面经 useCommand 触发、
      // 读的是用户刚选的文件（`openFile` 返回的路径），三条都满足。
      // 与 `data/action-archive.ts` 的差别只是**做法不一致**（那处把导入收进 `data/`，这里没有），不是违规。
      // 不必统一：用户选的一次性导入文件不是面板数据、没有唯一真相，收进 `data/` 是为对称而对称（T-119）。
      if (read.status !== 'ok') throw new CepError('IO', msg.command.text.fontImportReadFailed)
      const text = read.text

      // JSON 优先、旧格式 `<z>`/`<>` 兜底，见 domain/rename.ts 的 parsePreset（原版 :57036-57045）
      // 预设文本整份替换：用户显式触发重命名，整份覆盖即意图
      const preset = parsePreset(text)
      if (isDecodeFail(preset)) throw new CepError('PARSE', describeDecodeFail(preset))
      renameWriter.replace(preset.value, {
        mode: 'skip',
        why: '用户显式重命名，整份覆盖预设文本',
      })
    },
  }),
]
