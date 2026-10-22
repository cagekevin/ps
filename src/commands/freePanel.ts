import {
  createEmptyFreePanel,
  findBlock,
  normalizeFreePanel,
  walkBlocks,
  type FreePanelFile,
} from '@/domain/free-panel'
import { adaptFreePanelItem } from '@/domain/free-panel-legacy'
import { CepError } from '@/utils/errors'
import { defineCommand, execute, get } from './registry'
import type { Command } from './types'

function commit(target: FreePanelFile, source: FreePanelFile) {
  target.uid = source.uid
  target.btnId = source.btnId
  target.obj = source.obj
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
        if (source === target && from === to) return

        const [item] = source.data.splice(from, 1)
        let insertAt = to + (position === 'after' ? 1 : 0)
        if (source === target && from < to) insertAt -= 1
        insertAt = Math.max(0, Math.min(insertAt, target.data.length))
        target.data.splice(insertAt, 0, item)
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
        commit(file, createEmptyFreePanel())
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
        next.uid += 1
        const block = {
          id: next.uid,
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
          next.uid += 1
          next.obj.list.push({
            id: next.uid,
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

      const result = await execute(mapped.id, mapped.payload)
      if (!result.ok) throw new CepError('JSX', result.reason)
    },
  }),
]
