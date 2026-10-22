import { CepError } from '@/utils/errors'
import { assertJsxOk } from '@/utils/jsx-result'
import { fontListRefresh } from '@/utils/signal'
import { defineCommand } from './registry'
import type { Command } from './types'

/**
 * 字体域命令。payload 类型由 `payloads.ts` 的映射表约束，
 * `run` 的第二个参数会被自动推断，不需要 cast。
 *
 * 写操作**只在这里**发生：页面与 store 都不再直接改 `data/`（M1）。
 */
export const fontCommands: Command<unknown>[] = [
  defineCommand({
    id: 'font.apply',
    title: '应用字体',
    group: 'font',
    // 只要求有选区：是不是文字层交给 ztgl_setFont 判断（原版行为，别多加限制）
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { font, variantIndex }) {
      // 直接在命令里调 jsx：`ps.ts` 不保留写函数，页面就没有绕过命令的入口
      const postScriptName = font.postScriptNames[variantIndex]
      const name = font.names[variantIndex] ?? font.family
      const weight = font.weights[variantIndex] ?? 'Regular'

      if (!postScriptName) {
        throw new CepError(
          'PARSE',
          `${font.family} 没有第 ${variantIndex + 1} 个字重的 PostScript 名`,
        )
      }

      // 参数顺序对齐原面板：jsx("ztgl_setFont", [hjm, mz, zz])
      // 返回结构统一交给 jsx-result 解释，这里不再自己判 err
      assertJsxOk(
        await ctx.jsx.font.setFont(postScriptName, name, weight),
        `设置字体失败：${font.family}`,
      )
    },
  }),

  defineCommand({
    id: 'font.rate',
    title: '收藏字体',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { family, value }) {
      await ctx.data.stars.update((list) => {
        const normalized = list
          .filter((item) => typeof item.name === 'string')
          .map((item) => ({ name: item.name as string, star: Number(item.star) || 0 }))

        const current = normalized.find((item) => item.name === family)?.star ?? 0
        const next = current === value ? 0 : value

        if (next <= 0) return normalized.filter((item) => item.name !== family)

        const hit = normalized.find((item) => item.name === family)
        if (hit) hit.star = next
        else normalized.push({ name: family, star: next })
        return normalized
      })
    },
  }),

  defineCommand({
    id: 'font.createTag',
    title: '新建标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { text }) {
      if (!text.trim()) throw new CepError('PARSE', '标签名不能为空')

      await ctx.data.tags.update((list) => {
        if (list.some((item) => item.text === text)) {
          throw new CepError('PARSE', `已有同名标签：${text}`)
        }
        list.push({ text, arr: [], xz: false })
      })
    },
  }),

  defineCommand({
    id: 'font.renameTag',
    title: '重命名标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { from, to }) {
      await ctx.data.tags.update((list) => {
        const tag = list.find((item) => item.text === from)
        if (!tag) throw new CepError('PARSE', `标签不存在：${from}`)
        if (list.some((item) => item.text === to && item.text !== from)) {
          throw new CepError('PARSE', `已有同名标签：${to}`)
        }
        tag.text = to
      })
    },
  }),

  defineCommand({
    id: 'font.deleteTag',
    title: '删除标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { text }) {
      await ctx.data.tags.update((list) => list.filter((item) => item.text !== text))
    },
  }),

  defineCommand({
    id: 'font.toggleTag',
    title: '切换标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(ctx, { tagText, family }) {
      await ctx.data.tags.update((list) => {
        const tag = list.find((item) => item.text === tagText)
        if (!tag) throw new CepError('PARSE', `标签不存在：${tagText}`)

        const arr = Array.isArray(tag.arr) ? tag.arr : []
        const index = arr.indexOf(family)
        if (index >= 0) arr.splice(index, 1)
        else arr.push(family)
        tag.arr = arr
      })
    },
  }),

  defineCommand({
    id: 'font.refreshList',
    title: '刷新字体列表',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    // 无参数：发信号让列表重新取一次（缓存由 ps.getFontList 自己决定是否绕过）
    async run() {
      fontListRefresh.emit()
    },
  }),
]
