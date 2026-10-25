import {
  createEmptyFreePanel,
  findBlock,
  normalizeFreePanel,
  walkBlocks,
  type FreePanelBlock,
  type FreePanelFile,
} from '@/domain/free-panel'
import { adaptFreePanelItem } from '@/domain/free-panel-legacy'
import { applyItemDrop } from '@/domain/reorder'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { defineCommand, executeInherited, get } from './registry'
import type { Command } from './types'

function commit(target: FreePanelFile, source: FreePanelFile) {
  target.uid = source.uid
  target.btnId = source.btnId
  target.obj = source.obj
}

/** 树上最大区域 id（空树 0） */
function maxBlockId(blocks: FreePanelBlock[]): number {
  let max = 0
  walkBlocks(blocks, (block) => {
    if (typeof block.id === 'number' && block.id > max) max = block.id
  })
  return max
}

/**
 * 取下一个区域 id 并推进 uid。
 *
 * 依据：原版 `uid` 与 max(id) 同步（一手证据见台账 D-38/D-39：实测文件 `uid=12`、最大 `block.id=12`）。
 * 所以新 id 必须是 `max(uid, max(id)) + 1`，不能 `uid += 1`——uid 一旦落后于 max(id)
 * （旧数据、清空后复位、别的面板写的文件），新增区域就会拿到已被占用的 id（D-39）。
 */
function takeNextBlockId(file: FreePanelFile): number {
  const id = Math.max(file.uid, maxBlockId(file.obj.list)) + 1
  file.uid = id
  return id
}

/**
 * 自由面板命令。
 *
 * 只负责树上的增删改/排序/执行；不直接写文件，也不直接调 jsx。
 */
export const freePanelCommands: Command<unknown>[] = [
  defineCommand({
    id: 'freePanel.add',
    title: '加入自由面板',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { blockId, items }) {
      if (!items.length) throw new CepError('PARSE', msg.command.text.freePanelNothingToAdd)

      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)

        for (const item of items) {
          const text = item.text.trim()
          const key = item.key.trim()
          if (!text) throw new CepError('PARSE', msg.command.text.freePanelNameRequired)
          if (!key) throw new CepError('PARSE', msg.command.text.freePanelKeyRequired)

          next.btnId += 1
          block.data.push({
            icon: item.icon ?? '',
            type: item.type ?? '',
            key,
            btnId: next.btnId,
            text,
            funcText: item.funcText ?? '',
            // 原版实际存在 option:null；只把 undefined 补成 {}
            option: item.option === undefined ? {} : item.option,
            left: '',
            top: '',
            position: false,
          })
        }

        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.remove',
    title: '从自由面板移除',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { blockId, btnId }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)
        const index = block.data.findIndex((item) => item.btnId === btnId)
        if (index < 0) throw new CepError('PARSE', msg.command.text.freePanelItemMissing)
        block.data.splice(index, 1)
        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.reorder',
    title: '调整自由面板顺序',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { fromBlockId, fromBtnId, toBlockId, toBtnId, position }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const source = findBlock(next.obj.list, fromBlockId)
        const target = findBlock(next.obj.list, toBlockId)
        if (!source || !target) throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)

        const from = source.data.findIndex((item) => item.btnId === fromBtnId)
        const to = target.data.findIndex((item) => item.btnId === toBtnId)
        if (from < 0 || to < 0) throw new CepError('PARSE', msg.command.text.freePanelItemMissing)

        // 落点只在 `domain/reorder.ts` 一份：同 block 传一条列表，跨 block 传两条
        const moved = applyItemDrop(
          source === target ? [source.data] : [source.data, target.data],
          {
            from: { group: 0, index: from },
            to: { group: source === target ? 0 : 1, index: to },
            position,
          },
        )
        if (moved < 0) return
        commit(file, next)
      })
    },
  }),

  /**
   * 显示设置是**全局**的：一次写所有 block（含嵌套 children）。这是有意简化，不是原版行为。
   *
   * 原版按 block 存：`showIcon` / `showNumber` 是 block 级字段（一手证据见 D-35 行：
   * 实测 `sj_appFreePanel.json` 的 block 键含这两个字段，`cep/data/free-panel.ts:17-19` 有记录），
   * 渲染也是按 block 取（`FreePanelBlock.vue` 的 `block.showNumber`）。
   *
   * 为什么此刻不做「按区域设置」：要能在每个区域的工具条里选列数/图标，等于新增控件
   * （`docs/规范/新控件准入.md`：原版出处 + ASCII + 用户批准），又落在「已完成页面冻结」的
   * `/freePanel` 上（`AGENTS.md:31-38`：只许修 bug / 数据错误 / 安全问题），撞条款。
   * 所以口径定为全局，并把「不一致」如实暴露在页面的勾选态里（`FreePanel.vue`：列数看是否
   * 所有 block 一致，图标/文字不一致显示半选），不再拿第一个 block 的值冒充全局（D-32）。
   */
  defineCommand({
    id: 'freePanel.setDisplay',
    title: '设置自由面板显示',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { showNumber, showIcon, showText }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        walkBlocks(next.obj.list, (block) => {
          if (showNumber !== undefined) block.showNumber = showNumber
          if (showIcon !== undefined) block.showIcon = showIcon
          if (showText !== undefined) block.showText = showText
        })
        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.clear',
    title: '删除自由面板工作区',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx) {
      ctx.data.freePanel.update((file) => {
        // D-38：清空**不**复位 uid。旧 id 一旦被复用，按 id 存的会话态（showText）
        // 和任何外部引用都会串到新工作区上；原版 uid 是单调计数器，复位不是它的语义。
        // 新工作区直接拿 preserved+1，连"保留一个 id=1 的 block"这种复用也一并避开。
        const preserved = Math.max(file.uid, maxBlockId(file.obj.list))
        const fresh = createEmptyFreePanel()
        fresh.uid = preserved + 1
        fresh.obj.list[0].id = fresh.uid
        commit(file, fresh)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.addBlock',
    title: '新增自由面板区域',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { parentId, type }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = {
          // D-39：取 max(id)+1，不是 uid += 1
          id: takeNextBlockId(next),
          zIndex: 0,
          showIcon: false,
          showNumber: 2,
          showText: true,
          type: type ?? 'norow',
          width: '100%',
          height: '100%',
          children: [],
          data: [],
        }

        if (parentId !== undefined) {
          const parent = findBlock(next.obj.list, parentId)
          if (!parent) throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)
          parent.children.push(block)
        } else {
          next.obj.list.push(block)
        }

        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.removeBlock',
    title: '删除自由面板区域',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { blockId }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)

        const remove = (blocks: typeof next.obj.list): boolean => {
          const index = blocks.findIndex((block) => block.id === blockId)
          if (index >= 0) {
            blocks.splice(index, 1)
            return true
          }
          return blocks.some((block) => remove(block.children))
        }

        if (!remove(next.obj.list))
          throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)

        // 至少保留一个区域，避免工作区变成不可编辑状态
        if (!next.obj.list.length) {
          next.obj.list.push({
            id: takeNextBlockId(next),
            zIndex: 0,
            showIcon: false,
            showNumber: 2,
            showText: true,
            type: 'norow',
            width: '100%',
            height: '100%',
            children: [],
            data: [],
          })
        }

        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.setBlock',
    title: '设置自由面板区域',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { blockId, type, width, height }) {
      ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', msg.command.text.freePanelRegionMissing)
        if (type !== undefined) block.type = type
        if (width !== undefined) block.width = width
        if (height !== undefined) block.height = height
        commit(file, next)
      })
    },
  }),

  defineCommand({
    id: 'freePanel.execute',
    title: '执行自由面板项',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async invoke(ctx, { blockId, btnId }) {
      const read = ctx.data.freePanel.read()
      // 读边界（`data/free-panel.ts` 的 normalize）已经归一过，这里不再归一第二次。
      // 坏文件必须说"文件坏了"：以前拿 fallback 空面板继续找，报的是"自由面板项不存在"（T-101-1）
      if (!read.ok) {
        throw new CepError('IO', msg.command.fn.freePanelFileCorrupt(read.reason))
      }
      const block = findBlock(read.value.obj.list, blockId)
      const item = block?.data.find((entry) => entry.btnId === btnId)
      if (!item) throw new CepError('PARSE', msg.command.text.freePanelItemMissing)

      const mapped = adaptFreePanelItem(item)
      if (!mapped || !get(mapped.id)) {
        throw new CepError('PARSE', msg.command.fn.freePanelKeyUnadapted(item.key))
      }

      // D-33：子命令复用本次执行刚刷过的选区快照，不再 refresh 一次；
      // 失败时把子命令自己的 `code` 原样抛回去——以前硬编码成 'JSX'，
      // 把 `FONT_MISSING` 这类"要页面弹确认"的语义冲掉了，useCommand 那条分支因此失效。
      // `CommandOutcome.code` 是 `CepErrorCode`（R3 起必填）；直接传给 `CepError`
      const result = await executeInherited(mapped.id, mapped.payload, { selection: ctx.selection })
      // `code` 已是必填的 `CepErrorCode`（R3）⇒ 不再需要 `?? 'JSX'` + `as`
      if (!result.ok) throw new CepError(result.code, result.reason)
    },
  }),
]
