// 是什么：字体面板页（/fontSet）的全部 PS 文档操作
// 唯一入口：本页的对齐/分布/拆分/生成按钮/字体属性/翻译只能走这里的命令
// 替代了什么：原版根组件 19 个 methods + 8 个子组件的写操作（app.v4.js:34996 子树）
// 谁在用：pages/fontSet/*；常用页/自定义面板/快捷键将来直接复用同一批 id
// 禁止：页面直接调 jsx；配置持久化不要写在这里以外的地方

import { getFontList } from '@/cep/ps'
import {
  dayKey,
  fontExtraDefaults,
  fontHistoryRepo,
  hierarchyRepo,
  normalizeCounter,
  quickFontRepo,
  translateCounterRepo,
} from '@/cep/data/font-extra'
import type { QuickFont } from '@/cep/data/font-extra'
import { patchFontSetSettings, readFontSetSettings } from '@/cep/data/legacy-settings'
import { jsonp } from '@/cep/http'
import {
  buildTranslateParams,
  decodeText,
  encodeText,
  MAX_TEXT_LENGTH,
  parseTranslateResponse,
  TRANSLATE_URL,
} from '@/domain/translate'
import { getFontClipboard, hasFontClipboard, setFontClipboard } from '@/domain/font-set-clipboard'
import { signalMissingFont } from '@/domain/font-missing'
import { canAddQuickFont, toQuickFont } from '@/domain/quick-font'
import { applyTextPatch, normalizeTextColor, refreshTextInfo } from '@/selection/current-text'
import { CepError } from '@/utils/errors'
import { asJsxResult, assertJsxOk, requireJsxOk } from '@/utils/jsx-result'
import { log } from '@/utils/logger'
import { deepClone } from '@/utils/clone'
import { defineCommand } from './registry'
import type { Command } from './types'

const LEVELS = 6

/** 写成功后刷新只读投影；失败不影响命令结果（读失败只记错误，页面保留旧值） */
function syncTextInfo(): void {
  void refreshTextInfo()
}

/** 字体缺失是产品流程，不是普通 JSX 失败：置位后由页面弹下载确认 */
function requireFontApplied(raw: unknown, name: string): void {
  const result = asJsxResult(raw)
  if (!result.ok) {
    if (Number(result.code) === 1) {
      signalMissingFont(name)
      throw new CepError('FONT_MISSING', '字体缺失')
    }
    throw new CepError('JSX', result.msg || '设置字体失败')
  }
}

/** 最近使用：最多 10 个，写失败不影响字体已应用 */
async function rememberFamily(family?: string): Promise<void> {
  if (!family) return
  try {
    await fontHistoryRepo.update((list) => {
      const next = [family, ...list.filter((item) => item !== family)]
      list.splice(0, list.length, ...next.slice(0, 10))
    })
  } catch (error) {
    log.warn('fontSet', '最近使用字体写入失败', error)
  }
}

function requireLevels(levels: number[]): number[] {
  if (!Array.isArray(levels) || levels.length !== LEVELS) {
    throw new CepError('PARSE', '添加的层级数量有误')
  }
  return levels
}

/**
 * 字体面板命令。
 *
 * 一个命令 = 一个 jsx 族，不是"一个按钮一条"：
 * 底部 12 个对齐图标合成 `fontSet.align`，否则注册表会被按钮数量撑爆。
 */
export const fontSetCommands: Command<unknown>[] = [
  defineCommand({
    id: 'fontSet.align',
    title: '对齐',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { axis, index }) {
      const font = ctx.jsx.font

      if (axis === 'h') {
        if (index === 3) {
          assertJsxOk(await font.setHorizontalCenters(), '水平居中分布失败')
        } else {
          // 原版底部对齐只传一个参数（app.v4.js:38080）
          assertJsxOk(await font.setTextAlignment(index), '设置水平对齐失败')
        }
        return
      }

      if (axis === 'v') {
        if (index === 3) {
          assertJsxOk(await font.setVerticalCenter(), '垂直平均分布失败')
        } else {
          assertJsxOk(await font.setTextUpDownAlign(index), '设置垂直对齐失败')
        }
        return
      }

      // 原版：无自由面板时固定 3（与背景水平）/ 4（与背景垂直），app.v4.js:38203、38210
      assertJsxOk(await font.setBackgroundAlign(axis === 'bg-h' ? 3 : 4), '与背景对齐失败')
    },
  }),

  defineCommand({
    id: 'fontSet.alignHorizontal',
    title: '水平垂直居中对齐',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      assertJsxOk(await ctx.jsx.font.alignHorizontal(), '水平垂直居中对齐失败')
    },
  }),

  defineCommand({
    id: 'fontSet.distribute',
    title: '按间距分布',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { axis, value }) {
      const text = value.trim()
      if (!text) throw new CepError('PARSE', '不能输入空字符')

      const settingsRead = await readFontSetSettings()
      // 坏设置文件 → 数据层不再给 fallback：照常跑等于拿默认 `ztDistributionFilter`
      // 去动用户的文档，用户以为用的是自己的设置（T-101-1）
      if (!settingsRead.ok) {
        throw new CepError('IO', `字体设置文件损坏（${settingsRead.reason}），按间距分布已中止`)
      }
      assertJsxOk(
        await ctx.jsx.font.distributeByPitch(axis, text, settingsRead.value.ztDistributionFilter),
        '分布元素失败',
      )
    },
  }),

  defineCommand({
    id: 'fontSet.split',
    title: '拆分/合并文本',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { mode }) {
      // 原版先探一次（会返回 err），再用 jsxHistory 真正执行，两步不能合并
      assertJsxOk(await ctx.jsx.font.changeTextBranchMerge(mode), '拆分/合并文本失败')
      assertJsxOk(await ctx.jsx.font.textBranchMerge(mode), '拆分/合并文本失败')
    },
  }),

  defineCommand({
    id: 'fontSet.createButton',
    title: '生成按钮',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { config }) {
      if (!config.padding.trim()) throw new CepError('PARSE', '边距不能为空')
      assertJsxOk(await ctx.jsx.font.createButton(config), '生成按钮失败')
    },
  }),

  defineCommand({
    id: 'fontSet.copyFont',
    title: '复制文字属性',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      const raw = await ctx.jsx.font.getFontInfo()
      const data = requireJsxOk(raw, '复制文字属性失败')
      if (data === undefined || data === null) {
        throw new CepError('PARSE', '复制文字属性失败')
      }
      setFontClipboard(data)
    },
  }),

  defineCommand({
    id: 'fontSet.pasteFont',
    title: '粘贴文字属性',
    group: 'font',
    requires: 'layer',
    // 原版是 $load 浮层，不是长任务 HUD；由页面包 loading 并等待完成
    kind: 'instant',
    async run(ctx, { keeps }) {
      if (!hasFontClipboard()) throw new CepError('PARSE', '请先复制字体样式')

      // 深拷贝：原版 ft.c(copyFont)，不能改到剪贴板里的原对象
      const clone = deepClone(getFontClipboard()) as {
        fonts?: Array<Record<string, unknown>>
      }
      const fonts = Array.isArray(clone.fonts) ? clone.fonts : []

      // 勾掉一项 = 该字段传 null；字段名与 ztPasteFont 的键一致（app.v4.js:43503-43517）
      for (const [key, keep] of Object.entries(keeps)) {
        if (keep) continue
        for (const font of fonts) font[key] = null
      }

      const payload = encodeText(JSON.stringify(clone))
      assertJsxOk(await ctx.jsx.font.checkUseFont(payload), '检查字体可用性失败')
      assertJsxOk(await ctx.jsx.font.useFont(payload), '应用字体设置失败')
    },
  }),

  defineCommand({
    id: 'fontSet.switchDirection',
    title: '切换文本方向',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      assertJsxOk(await ctx.jsx.font.switchFontDirection(), '切换文本方向失败')
    },
  }),

  defineCommand({
    id: 'fontSet.translate',
    title: '翻译',
    group: 'font',
    // 原版只要求有选区；文字层判定交给 jsx
    requires: 'layer',
    kind: 'long',
    async run(ctx, payload) {
      // 计数器坏了按 0 次继续（清单 §二：对用户有利、不写盘）。这个值决定**是否放行翻译**，
      // 是判断不是渲染，所以不走 `readOr`（`read-or.ts` 的禁令：命令层一律不用它），坏因自己落日志
      const counterRead = await translateCounterRepo.read()
      if (!counterRead.ok) {
        log.warn('fontSet.translate', `翻译计数读取失败，本次按 0 次处理：${counterRead.reason}`)
      }
      const counter = normalizeCounter(
        counterRead.ok ? counterRead.value : fontExtraDefaults.counter(),
        dayKey(),
      )
      if (counter.num >= counter.max) {
        throw new CepError('PARSE', `每天最多使用${counter.max}次翻译功能`)
      }

      const data = requireJsxOk(await ctx.jsx.font.getCurrentText(), '读取选中文字失败')
      const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
      if (!list.length) throw new CepError('PARSE', '没有可翻译的文本')

      const total = list.reduce((sum, item) => sum + String(item.text ?? '').length, 0)
      if (total > MAX_TEXT_LENGTH) {
        throw new CepError('PARSE', `文本长度不能超过${MAX_TEXT_LENGTH}个字符`)
      }

      for (const [index, item] of list.entries()) {
        const source = decodeText(String(item.text ?? ''))
        if (source.length > MAX_TEXT_LENGTH) {
          throw new CepError('PARSE', `文本长度不能超过${MAX_TEXT_LENGTH}个字符`)
        }

        // 原版把每段译文写回 item.dst；失败时不写回（原版会带半成品，属缺陷，见页面清单）
        let raw: unknown
        try {
          raw = await jsonp(
            TRANSLATE_URL,
            { ...buildTranslateParams({ text: source, from: payload.from, to: payload.to }) },
            { timeout: 20000 },
          )
        } catch {
          throw new CepError('NETWORK', '连接服务器失败')
        }

        const parsed = parseTranslateResponse(raw)
        if (!parsed.ok || !parsed.text) {
          throw new CepError('NETWORK', parsed.message || '翻译失败')
        }

        item.dst = encodeText(parsed.text)
        ctx.progress.update((index + 1) / list.length, '正在翻译')
      }

      assertJsxOk(await ctx.jsx.font.setTranslateText(list, payload.replace), '写回翻译文本失败')

      await translateCounterRepo.update((raw) => {
        const next = normalizeCounter(raw, dayKey())
        next.num += 1
        raw.num = next.num
        raw.max = next.max
        raw.time = next.time
      })
    },
  }),

  defineCommand({
    id: 'fontSet.textAlign',
    title: '设置文本对齐',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { index, shift, paragraph }) {
      if (paragraph) {
        assertJsxOk(await ctx.jsx.font.setJustified(index), '设置段落文本对齐失败')
      } else {
        // shift 不传时只发一个参数（层级面板的 changeAlign 就是这种形态）
        assertJsxOk(await ctx.jsx.font.setTextAlignment(index, shift), '设置文本对齐失败')
      }
      // 原版 setAlign 只改本地 alginIndex，不回读
      const justification = ['left', 'center', 'right'][index]
      if (justification) applyTextPatch({ justification })
    },
  }),

  defineCommand({
    id: 'fontSet.hierarchySize',
    title: '应用层级字号',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { value }) {
      assertJsxOk(await ctx.jsx.font.setHierarchySize(value), '设置层级字号失败')
    },
  }),

  defineCommand({
    id: 'fontSet.fontSize',
    title: '设置字号',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { value }) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new CepError('PARSE', '字号必须是大于 0 的数字')
      }
      assertJsxOk(await ctx.jsx.font.setNumberSize(value), '设置字号失败')
      // 原版 setFontSize 只改本地 fontInfo.size，不回读
      applyTextPatch({ size: String(value) })
    },
  }),

  defineCommand({
    id: 'fontSet.leading',
    title: '设置行距',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { value }) {
      if (!Number.isFinite(value) || value < 0) {
        throw new CepError('PARSE', '行距必须是不小于 0 的数字')
      }
      assertJsxOk(await ctx.jsx.font.setLeading(value), '设置行距失败')
      // 原版 setFontLeading2 只改本地 fontInfo.leading
      applyTextPatch({ leading: value })
    },
  }),

  defineCommand({
    id: 'fontSet.tracking',
    title: '设置字距',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { value }) {
      if (!Number.isFinite(value)) throw new CepError('PARSE', '字距必须是数字')
      assertJsxOk(await ctx.jsx.font.setTracking(value), '设置字距失败')
      // 原版 setFontTracking 只改本地 fontInfo.tracking
      applyTextPatch({ tracking: value })
    },
  }),

  defineCommand({
    id: 'fontSet.color',
    title: '设置字体颜色',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx) {
      // 原版 setFontColor：jsx 返回 data 后直接 fontInfo.color = data，不回读
      const data = requireJsxOk(await ctx.jsx.font.setColor(), '设置字体颜色失败')
      if (data) applyTextPatch({ color: normalizeTextColor(data) })
    },
  }),

  defineCommand({
    id: 'fontSet.fontName',
    title: '设置字体',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { kind, postScriptName, name, weight, family }) {
      if (!postScriptName) throw new CepError('PARSE', '这个字重没有 PostScript 名')
      requireFontApplied(await ctx.jsx.font.setFontName(postScriptName, name, weight), name)
      if (kind === 'family') await rememberFamily(family)

      if (kind === 'family') {
        // 原版 squarecom → setFontFamily → selectLayer()，只有换家族才回读
        syncTextInfo()
      } else {
        // 原版 ExtraLightFun 只改本地 fontInfo.weight
        applyTextPatch({ weight })
      }
    },
  }),

  defineCommand({
    id: 'fontSet.styleToggle',
    title: '切换文字样式',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, { kind, value }) {
      const font = ctx.jsx.font
      if (kind === 'caps') assertJsxOk(await font.setAllCaps(value), '切换全部大写失败')
      else if (kind === 'kerning') {
        assertJsxOk(
          await font.setFontVision(value ? 'opticalKern' : 'manual'),
          '切换文字视觉调整失败',
        )
      } else if (kind === 'italic') assertJsxOk(await font.setFauxItalic(value), '切换倾斜失败')
      else assertJsxOk(await font.setFauxBold(value), '切换加粗失败')

      // 原版 4 个开关都是本地取反/赋值，不回读
      if (kind === 'caps') applyTextPatch({ capitalization: value ? 'allCaps' : 'Nrml' })
      else if (kind === 'kerning') {
        applyTextPatch({ autoKerning: value ? 'opticalKern' : 'manual' })
      } else if (kind === 'italic') applyTextPatch({ fauxItalic: value })
      else applyTextPatch({ fauxBold: value })
    },
  }),

  defineCommand({
    id: 'fontSet.saveSettings',
    title: '保存字体面板设置',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { patch }) {
      await patchFontSetSettings(patch)
    },
  }),

  defineCommand({
    id: 'fontSet.quickFont',
    title: '字体快选',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async run(ctx, payload) {
      if (payload.action === 'apply') {
        const font = payload.font
        const weightIndex = payload.weightIndex ?? 0
        if (!font) throw new CepError('PARSE', '没有要应用的快捷字体')
        const postScriptName = font.hjm[weightIndex]
        const name = font.mz[weightIndex]
        const weight = font.zz[weightIndex]
        if (!postScriptName) throw new CepError('PARSE', '这个字重没有 PostScript 名')
        requireFontApplied(await ctx.jsx.font.setFontName(postScriptName, name, weight), name)
        await rememberFamily(font.family)
        syncTextInfo()
        return
      }

      if (payload.action === 'select') {
        await quickFontRepo.update((file) => {
          const index = payload.index ?? 0
          if (index < 0 || index >= file.list.length) {
            throw new CepError('PARSE', '切换失败')
          }
          file.index = index
        })
        return
      }

      if (payload.action === 'delete') {
        await quickFontRepo.update((file) => {
          const index = payload.index ?? 0
          if (index < 0 || index >= file.list.length) throw new CepError('PARSE', '删除异常')
          if (file.list.length === 1) throw new CepError('PARSE', '最少保留一个')
          file.list.splice(index, 1)
          file.index = 0
        })
        return
      }

      // add：读当前图层字体 → 在系统字体里补全字重 → 去重/上限 → 落盘
      const info = requireJsxOk(
        await ctx.jsx.font.getCurrentFontInfo(),
        '读取当前图层字体失败',
      ) as Record<string, unknown> | null
      const family = typeof info?.family === 'string' ? info.family : ''
      if (!family) throw new CepError('PARSE', '当前图层没有字体信息')

      const list = await getFontList()
      const hit = list.find((item) => item.family === family)
      if (!hit) throw new CepError('PARSE', '查找字体信息失败!')

      await quickFontRepo.update((file) => {
        const blocked = canAddQuickFont(file.list, family)
        if (blocked) throw new CepError('PARSE', blocked)

        const next: QuickFont = toQuickFont(hit)
        file.list.push(next)
        file.index = file.list.length - 1
      })
    },
  }),

  defineCommand({
    id: 'fontSet.hierarchyPreset',
    title: '层级预设',
    group: 'font',
    requires: 'none',
    kind: 'instant',
    async run(_ctx, { action, name, index, levels }) {
      if (action === 'select') {
        if (typeof index !== 'number') throw new CepError('PARSE', '切换失败')
        await hierarchyRepo.update((file) => {
          if (index < 0 || index >= file.list.length) throw new CepError('PARSE', '切换失败')
          file.index = index
        })
        return
      }

      if (action === 'create') {
        if (!name?.trim()) throw new CepError('PARSE', '请输入层级名字')
        const next = requireLevels(levels ?? [])
        await hierarchyRepo.update((file) => {
          file.list.push({ name: name.trim(), data: [...next] })
        })
        return
      }

      if (action === 'rename') {
        if (!name?.trim()) throw new CepError('PARSE', '请输入新的名字')
        if (typeof index !== 'number') throw new CepError('PARSE', '重命名下标有误')
        await hierarchyRepo.update((file) => {
          const preset = file.list[index]
          if (!preset) throw new CepError('PARSE', '重命名下标有误')
          preset.name = name.trim()
        })
        return
      }

      if (action === 'delete') {
        await hierarchyRepo.update((file) => {
          const target = index ?? file.index
          if (target < 0 || target >= file.list.length) throw new CepError('PARSE', '删除下标有误')
          if (file.list.length === 1) throw new CepError('PARSE', '必须保留一个')
          file.list.splice(target, 1)
          file.index = 0
        })
        return
      }

      // save：用当前 6 级字号覆盖当前预设
      const next = requireLevels(levels ?? [])
      await hierarchyRepo.update((file) => {
        const preset = file.list[file.index]
        if (!preset) throw new CepError('PARSE', '当前预设不存在')
        preset.data = [...next]
      })
    },
  }),
]
