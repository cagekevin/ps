import { openFile, saveFile } from '@/cep/dialog'
import type { RawStar, RawTag } from '@/cep/data'
import { readTextOutcome, saveExportedText } from '@/cep/fs'
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

/* ---------- 标签 / 评分 的导入导出（T-51）---------- */

/**
 * 导入文件的内容形状。
 *
 * 导出文件 = `{ tags: [...], stars: [...] }`；
 * 导入也接受**纯标签数组**（`[...]`），此时只覆盖标签，评分不动。
 */
interface TagImportFile {
  tags: RawTag[]
  stars?: RawStar[]
}

/**
 * 校验一个标签项；返回错误文案（空串 = 合法）。
 *
 * 开放结构：未知键不判错（导入是覆盖写，我方不重建对象，字段一个不少）。
 */
function tagItemError(tag: unknown, index: number): string {
  if (typeof tag !== 'object' || tag === null || Array.isArray(tag)) {
    return `标签第 ${index + 1} 项不是对象`
  }
  const item = tag as Record<string, unknown>
  if (typeof item.text !== 'string' || !item.text) return `标签第 ${index + 1} 项缺少 text`
  if (item.arr !== undefined && !Array.isArray(item.arr)) {
    return `标签第 ${index + 1} 项的 arr 不是数组`
  }
  if (item.xz !== undefined && typeof item.xz !== 'boolean') {
    return `标签第 ${index + 1} 项的 xz 不是布尔值`
  }
  return ''
}

/**
 * 校验一个评分项；返回错误文案（空串 = 合法）。
 *
 * `star` 允许**字符串或数字**——原文件 `sj_ztglStar.ini` 里两者混用
 * （`{"name":"OPPOSans","star":"3"}` 与 `{"name":"Verdana","star":2}`），
 * 校验与写入都不许规范化成一种。
 */
function starItemError(star: unknown, index: number): string {
  if (typeof star !== 'object' || star === null || Array.isArray(star)) {
    return `评分第 ${index + 1} 项不是对象`
  }
  const item = star as Record<string, unknown>
  if (typeof item.name !== 'string' || !item.name) return `评分第 ${index + 1} 项缺少 name`
  if (typeof item.star !== 'string' && typeof item.star !== 'number') {
    return `评分第 ${index + 1} 项的 star 必须是数字或字符串`
  }
  return ''
}

/**
 * 解析导入文件的内容并校验。
 *
 * 失败返回错误文案——**校验不过一个字都不写**。
 * 合法时原样返回数组（不重建对象、不补键、不规范化 `star` 的类型）。
 */
function parseTagImport(text: string): { tags: RawTag[]; stars?: RawStar[] } | { error: string } {
  let root: unknown
  try {
    root = JSON.parse(text) as unknown
  } catch {
    return { error: '导入文件不是合法的 JSON' }
  }

  // 纯标签数组：只覆盖标签，评分不动
  if (Array.isArray(root)) {
    for (let i = 0; i < root.length; i++) {
      const error = tagItemError(root[i], i)
      if (error) return { error }
    }
    return { tags: root as RawTag[] }
  }

  if (typeof root !== 'object' || root === null) return { error: '导入文件内容不是标签数据' }
  const record = root as Record<string, unknown>
  if (!Array.isArray(record.tags)) return { error: '导入文件缺少标签数据（tags）' }

  for (let i = 0; i < record.tags.length; i++) {
    const error = tagItemError(record.tags[i], i)
    if (error) return { error }
  }

  // stars 缺省 = 不覆盖评分；给了就必须合法
  if (record.stars === undefined) return { tags: record.tags as RawTag[] }
  if (!Array.isArray(record.stars)) return { error: '导入文件的评分数据（stars）不是数组' }
  for (let i = 0; i < record.stars.length; i++) {
    const error = starItemError(record.stars[i], i)
    if (error) return { error }
  }
  return { tags: record.tags as RawTag[], stars: record.stars as RawStar[] }
}
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

  defineCommand({
    id: 'font.importTags',
    title: '导入标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    /**
     * 导入 = **覆盖写** `sj_ztglTags.ini`（原版 `vg()` 的 Import 模式）。
     *
     * 四条约束（台账 T-51 的 P0）：
     * 1. **先校验后写**：文件先读进内存并逐项校验，形状不对就直接抛错，一个字都不写；
     * 2. **`.bak` 落盘**：覆盖写走 `repo.update`，它在写之前把原文写到 `<文件>.bak`（ADR-12）；
     * 3. **取消不写盘**：确认回调返回 false（或用户取消文件对话框）时直接返回，不碰任何文件；
     * 4. **星级混用类型不丢**：`star` 在原文件里既有 `"3"` 又有 `2`，校验与写入都不规范化。
     */
    async run(ctx, { onConfirm }) {
      const path = openFile('导入标签', ['json'])
      // 取消文件对话框 = 取消导入，不写盘（与 `action.importWarehouse` 同口径）
      if (!path) throw new CepError('PARSE', '取消操作')

      const read = await readTextOutcome(path)
      // T-107：两种不 ok 这里同果（都抛同一句），文案不变。
      // 已知：这个命令自己读文件还撞 ADR-16（导入应收到 `data/`，参照 `action-archive.ts`），另开条目
      if (read.status !== 'ok') throw new CepError('IO', '导入失败，文件读取失败')
      const text = read.text

      // 先校验：校验不过不碰任何文件
      const parsed = parseTagImport(text)
      if ('error' in parsed) throw new CepError('PARSE', `导入失败：${parsed.error}`)

      const starsReplaced = parsed.stars !== undefined
      const summary = {
        tags: parsed.tags.length,
        stars: parsed.stars?.length ?? 0,
        starsReplaced,
      }

      // 覆盖前确认（原版确认框文案：「导入标签，会覆盖原来的标签及评分，是否继续？」）
      // 取消 → 不写盘
      if (onConfirm && !(await onConfirm(summary))) throw new CepError('PARSE', '取消操作')

      // 覆盖写：repo 内部先落 `.bak` 再写
      await ctx.data.tags.update(() => parsed.tags)
      if (parsed.stars) await ctx.data.stars.update(() => parsed.stars as RawStar[])
    },
  }),

  defineCommand({
    id: 'font.exportTags',
    title: '导出标签',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    /**
     * 导出 = 只导出**标签与评分**，不含字体文件
     * （原版确认框文案：「导出标签，不包含字体文件，仅导出标签及评分，是否继续？」）。
     *
     * 导出形状 = `{ tags: [...], stars: [...] }`；`star` 原样带走（不把 `"3"` 规范成 `3`）。
     */
    async run(ctx, { onConfirm }) {
      // 导出前的确认（原版文案：「导出标签，不包含字体文件，仅导出标签及评分，是否继续？」）
      // 取消 → 不弹对话框、不写盘
      if (onConfirm && !(await onConfirm())) throw new CepError('PARSE', '取消操作')

      const path = saveFile('导出标签', ['json'], '字体标签.json')
      // 取消文件对话框 = 取消导出，不写盘（与 `action.exportWarehouse` 同口径）
      if (!path) throw new CepError('PARSE', '取消操作')

      const tagRead = await ctx.data.tags.read()
      if (!tagRead.ok) throw new CepError('IO', `标签读取失败：${tagRead.reason}`)
      const starRead = await ctx.data.stars.read()
      if (!starRead.ok) throw new CepError('IO', `评分读取失败：${starRead.reason}`)

      const payload: TagImportFile = { tags: tagRead.value, stars: starRead.value }
      saveExportedText(path, JSON.stringify(payload))
    },
  }),
]
