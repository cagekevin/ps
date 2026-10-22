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
import { CepError, type CepErrorCode } from '@/utils/errors'
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
    async run(ctx, { blockId, items }) {
      if (!items.length) throw new CepError('PARSE', '没有要添加的项')

      await ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', '自由面板区域不存在')

        for (const item of items) {
          const text = item.text.trim()
          const key = item.key.trim()
          if (!text) throw new CepError('PARSE', '名字不能为空')
          if (!key) throw new CepError('PARSE', 'key 不能为空')

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
    async run(ctx, { blockId, btnId }) {
      await ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', '自由面板区域不存在')
        const index = block.data.findIndex((item) => item.btnId === btnId)
        if (index < 0) throw new CepError('PARSE', '自由面板项不存在')
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
    async run(ctx, { fromBlockId, fromBtnId, toBlockId, toBtnId, position }) {
      await ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const source = findBlock(next.obj.list, fromBlockId)
        const target = findBlock(next.obj.list, toBlockId)
        if (!source || !target) throw new CepError('PARSE', '自由面板区域不存在')

        const from = source.data.findIndex((item) => item.btnId === fromBtnId)
        const to = target.data.findIndex((item) => item.btnId === toBtnId)
        if (from < 0 || to < 0) throw new CepError('PARSE', '自由面板项不存在')

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

  defineCommand({
    id: 'freePanel.setDisplay',
    title: '设置自由面板显示',
    group: 'system',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { showNumber, showIcon, showText }) {
      await ctx.data.freePanel.update((file) => {
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
    async run(ctx) {
      await ctx.data.freePanel.update((file) => {
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
    async run(ctx, { parentId, type }) {
      await ctx.data.freePanel.update((file) => {
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
          if (!parent) throw new CepError('PARSE', '自由面板区域不存在')
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
    async run(ctx, { blockId }) {
      await ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)

        const remove = (blocks: typeof next.obj.list): boolean => {
          const index = blocks.findIndex((block) => block.id === blockId)
          if (index >= 0) {
            blocks.splice(index, 1)
            return true
          }
          return blocks.some((block) => remove(block.children))
        }

        if (!remove(next.obj.list)) throw new CepError('PARSE', '自由面板区域不存在')

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
    async run(ctx, { blockId, type, width, height }) {
      await ctx.data.freePanel.update((file) => {
        const next = normalizeFreePanel(file)
        const block = findBlock(next.obj.list, blockId)
        if (!block) throw new CepError('PARSE', '自由面板区域不存在')
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
    async run(ctx, { blockId, btnId }) {
      const read = await ctx.data.freePanel.read()
      const file = normalizeFreePanel(read.value)
      const block = findBlock(file.obj.list, blockId)
      const item = block?.data.find((entry) => entry.btnId === btnId)
      if (!item) throw new CepError('PARSE', '自由面板项不存在')

      const mapped = adaptFreePanelItem(item)
      if (!mapped || !get(mapped.id)) {
        throw new CepError('PARSE', `自由面板 key 未适配：${item.key}`)
      }

      // D-33：子命令复用本次执行刚刷过的选区快照，不再 refresh 一次；
      // 失败时把子命令自己的 `code` 原样抛回去——以前硬编码成 'JSX'，
      // 把 `FONT_MISSING` 这类"要页面弹确认"的语义冲掉了，useCommand 那条分支因此失效。
      // CommandResult.code 是 string（注册表只在枚举内产出）；CepError 收 CepErrorCode
      const result = await executeInherited(mapped.id, mapped.payload, { selection: ctx.selection })
      if (!result.ok) throw new CepError((result.code ?? 'JSX') as CepErrorCode, result.reason)
    },
  }),
]
