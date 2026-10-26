// 是什么：字体面板页（/fontSet）的全部 PS 文档操作
// 唯一入口：本页的对齐/分布/拆分/生成按钮/字体属性/翻译只能走这里的命令
// 替代了什么：原版根组件 19 个 methods + 8 个子组件的写操作（app.v4.js:34996 子树）
// 谁在用：pages/fontSet/*；常用页/自定义面板/快捷键将来直接复用同一批 id
// 禁止：页面直接调 jsx；配置持久化不要写在这里以外的地方

import { getFontList } from '@/cep/data/font-list'
import {
  dayKey,
  fontHistoryWriter,
  hierarchyWriter,
  normalizeCounter,
  quickFontWriter,
  translateCounterWriter,
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
import { canAddQuickFont, toQuickFont } from '@/domain/quick-font'
import { applyTextPatch, normalizeTextColor, refreshTextInfo } from '@/selection/current-text'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import type { JsxOutcome as _JsxOutcome } from '@/utils/jsx-result'
import { log } from '@/utils/logger'
import { deepClone } from '@/utils/clone'
import { defineCommand } from './registry'
import { missingFontPort } from './runtime'
import type { Command } from './types'

const LEVELS = 6

/** 写成功后刷新只读投影；失败不影响命令结果（读失败只记错误，页面保留旧值） */
function syncTextInfo(): void {
  void refreshTextInfo()
}

/** 字体缺失是产品流程，不是普通 JSX 失败：置位后由页面弹下载确认 */
async function requireFontApplied(action: () => Promise<void>, name: string): Promise<void> {
  try {
    await action()
  } catch (e) {
    // `jsxWrite` 抛的 `CepError` 带 `hostCode`；`hostCode === 1` 是"字体缺失"（`useFont` 的约定）
    if (e instanceof CepError && Number(e.hostCode) === 1) {
      missingFontPort().signal(name)
      throw new CepError('FONT_MISSING', msg.command.text.fontSetMissing)
    }
    throw e
  }
}

/** 最近使用：最多 10 个，写失败不影响字体已应用 */
async function rememberFamily(family?: string): Promise<void> {
  if (!family) return
  try {
    fontHistoryWriter.update((list) => {
      const next = [family, ...list.filter((item) => item !== family)]
      list.splice(0, list.length, ...next.slice(0, 10))
    })
  } catch (error) {
    log.warn('fontSet', '最近使用字体写入失败', error)
  }
}

function requireLevels(levels: number[]): number[] {
  if (!Array.isArray(levels) || levels.length !== LEVELS) {
    throw new CepError('PARSE', msg.command.text.fontSetHierarchyCountWrong)
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
    async invoke(ctx, { axis, index }) {
      const font = ctx.jsx.font

      switch (axis) {
        case 'h':
          if (index === 3) {
            await font.setHorizontalCenters()
          } else {
            // 原版底部对齐只传一个参数（app.v4.js:38080）
            await font.setTextAlignment(index)
          }
          return

        case 'v':
          if (index === 3) {
            await font.setVerticalCenter()
          } else {
            await font.setTextUpDownAlign(index)
          }
          return

        // 原版：无自由面板时固定 3（与背景水平）/ 4（与背景垂直），app.v4.js:38203、38210
        case 'bg-h':
          await font.setBackgroundAlign(3)
          return
        case 'bg-v':
          await font.setBackgroundAlign(4)
          return

        default:
          // 以前这里是 `axis === 'bg-h' ? 3 : 4` 的兜底：**枚举外任何值都当 bg-v 执行并报成功**
          // ——拿"与背景垂直"去动用户文档，用户以为点的是别的对齐。
          // 不猜默认行为，直接拒绝并列出合法值。
          throw new CepError('PARSE', msg.command.fn.fontSetUnknownAlign(String(axis)))
      }
    },
  }),

  defineCommand({
    id: 'fontSet.alignHorizontal',
    title: '水平垂直居中对齐',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx) {
      await ctx.jsx.font.alignHorizontal()
    },
  }),

  defineCommand({
    id: 'fontSet.distribute',
    title: '按间距分布',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { axis, value }) {
      const text = value.trim()
      if (!text) throw new CepError('PARSE', msg.command.text.fontSetEmptyInput)

      const settingsRead = readFontSetSettings()
      // 坏设置文件 → 数据层不再给 fallback：照常跑等于拿默认 `ztDistributionFilter`
      // 去动用户的文档，用户以为用的是自己的设置（T-101-1）
      if (settingsRead.status !== 'ok') {
        throw new CepError('IO', msg.command.fn.fontSetSettingsCorrupt(settingsRead.reason))
      }
      await ctx.jsx.font.distributeByPitch(axis, text, settingsRead.value.ztDistributionFilter)
    },
  }),

  defineCommand({
    id: 'fontSet.split',
    title: '拆分/合并文本',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { mode }) {
      // 原版先探一次（会返回 err），再用 jsxHistory 真正执行，两步不能合并
      await ctx.jsx.font.changeTextBranchMerge(mode)
      await ctx.jsx.font.textBranchMerge(mode)
    },
  }),

  defineCommand({
    id: 'fontSet.createButton',
    title: '生成按钮',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { config }) {
      // 缺配置以前是一句英文 TypeError（`Cannot read properties of undefined (reading 'padding')`），
      // 用户看不出是哪一步坏了
      if (!config || typeof config.padding !== 'string') {
        throw new CepError('PARSE', msg.command.text.fontSetButtonNoPadding)
      }
      if (!config.padding.trim())
        throw new CepError('PARSE', msg.command.text.fontSetPaddingRequired)
      if (typeof config.type !== 'number' || typeof config.isLine !== 'boolean') {
        throw new CepError('PARSE', msg.command.text.fontSetButtonConfigIncomplete)
      }
      await ctx.jsx.font.createButton(config)
    },
  }),

  defineCommand({
    id: 'fontSet.copyFont',
    title: '复制文字属性',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx) {
      const raw = await ctx.jsx.font.getFontInfo()
      if (!raw.ok) {
        throw new CepError(raw.code, raw.reason || msg.command.text.fontSetCopyAttrFailed)
      }
      // 解码器已证 `data` 是 `{ fonts: [...] }`（不可能是 undefined/null）⇒ 不再判空
      setFontClipboard(raw.data)
    },
  }),

  defineCommand({
    id: 'fontSet.pasteFont',
    title: '粘贴文字属性',
    group: 'font',
    requires: 'layer',
    // 原版是 $load 浮层，不是长任务 HUD；由页面包 loading 并等待完成
    kind: 'instant',
    async invoke(ctx, { keeps }) {
      if (!hasFontClipboard()) throw new CepError('PARSE', msg.command.text.fontSetNoCopiedStyle)

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
      await ctx.jsx.font.checkUseFont(payload)
      await ctx.jsx.font.useFont(payload)
    },
  }),

  defineCommand({
    id: 'fontSet.switchDirection',
    title: '切换文本方向',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx) {
      await ctx.jsx.font.switchFontDirection()
    },
  }),

  defineCommand({
    id: 'fontSet.translate',
    title: '翻译',
    group: 'font',
    // 原版只要求有选区；文字层判定交给 jsx
    requires: 'layer',
    kind: 'long',
    async invoke(ctx, payload) {
      // 计数器坏了按 0 次继续（清单 §二：对用户有利、不写盘）。这个值决定**是否放行翻译**，
      // 是判断不是渲染，所以默认值也不在消费侧拼：取坏读臂的 `fallback`（仓库自己给的），坏因自己落日志
      const counterRead = translateCounterWriter.read()
      if (counterRead.status !== 'ok') {
        log.warn('fontSet.translate', `翻译计数读取失败，本次按 0 次处理：${counterRead.reason}`)
      }
      const counter = normalizeCounter(
        counterRead.status === 'ok' ? counterRead.value : counterRead.fallback,
        dayKey(),
      )
      if (counter.num >= counter.max) {
        throw new CepError('PARSE', msg.command.fn.fontSetTranslateDailyLimit(String(counter.max)))
      }

      const textOutcome = await ctx.jsx.font.getCurrentText()
      if (!textOutcome.ok) {
        throw new CepError(textOutcome.code, textOutcome.reason || '读取选中文字失败')
      }
      // 解码器已证是数组，条目 `text` 若在必是字符串 ⇒ 不需要 `Array.isArray` + `as`
      const list = textOutcome.data
      if (!list.length) throw new CepError('PARSE', msg.command.text.fontSetNoTranslatableText)

      const total = list.reduce((sum, item) => sum + String(item.text ?? '').length, 0)
      if (total > MAX_TEXT_LENGTH) {
        throw new CepError('PARSE', msg.command.fn.fontSetTextTooLong(String(MAX_TEXT_LENGTH)))
      }

      for (const [index, item] of list.entries()) {
        const source = decodeText(String(item.text ?? ''))
        if (source.length > MAX_TEXT_LENGTH) {
          throw new CepError('PARSE', msg.command.fn.fontSetTextTooLong(String(MAX_TEXT_LENGTH)))
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
          throw new CepError('NETWORK', msg.command.text.fontSetNetworkFailed)
        }

        const parsed = parseTranslateResponse(raw)
        if (!parsed.ok || !parsed.text) {
          throw new CepError('NETWORK', parsed.message || '翻译失败')
        }

        item.dst = encodeText(parsed.text)
        ctx.progress.update((index + 1) / list.length, '正在翻译')
      }

      await ctx.jsx.font.setTranslateText(list, payload.replace)

      translateCounterWriter.update((raw) => {
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
    async invoke(ctx, { index, shift, paragraph }) {
      if (paragraph) {
        await ctx.jsx.font.setJustified(index)
      } else {
        // shift 不传时只发一个参数（层级面板的 changeAlign 就是这种形态）
        await ctx.jsx.font.setTextAlignment(index, shift)
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
    async invoke(ctx, { value }) {
      await ctx.jsx.font.setHierarchySize(value)
    },
  }),

  defineCommand({
    id: 'fontSet.fontSize',
    title: '设置字号',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { value }) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new CepError('PARSE', msg.command.text.fontSetFontSizeInvalid)
      }
      await ctx.jsx.font.setNumberSize(value)
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
    async invoke(ctx, { value }) {
      if (!Number.isFinite(value) || value < 0) {
        throw new CepError('PARSE', msg.command.text.fontSetLeadingInvalid)
      }
      await ctx.jsx.font.setLeading(value)
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
    async invoke(ctx, { value }) {
      if (!Number.isFinite(value))
        throw new CepError('PARSE', msg.command.text.fontSetTrackingInvalid)
      await ctx.jsx.font.setTracking(value)
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
    async invoke(ctx) {
      // 原版 setFontColor：jsx 返回 data 后直接 fontInfo.color = data，不回读
      const colorOutcome = await ctx.jsx.font.setColor()
      if (!colorOutcome.ok) {
        throw new CepError(colorOutcome.code, colorOutcome.reason || '设置字体颜色失败')
      }
      // 解码器已证 `data` 是 `{ rgb: { r, g, b } }`（恒真）⇒ 不再判空
      applyTextPatch({ color: normalizeTextColor(colorOutcome.data) })
    },
  }),

  defineCommand({
    id: 'fontSet.fontName',
    title: '设置字体',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, { kind, postScriptName, name, weight, family }) {
      if (!postScriptName) throw new CepError('PARSE', msg.command.text.fontSetNoPostScriptName)
      await requireFontApplied(() => ctx.jsx.font.setFontName(postScriptName, name, weight), name)
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
    async invoke(ctx, { kind, value }) {
      const font = ctx.jsx.font
      if (kind === 'caps') await font.setAllCaps(value)
      else if (kind === 'kerning') {
        await font.setFontVision(value ? 'opticalKern' : 'manual')
      } else if (kind === 'italic') await font.setFauxItalic(value)
      else await font.setFauxBold(value)

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
    async invoke(_ctx, { patch }) {
      patchFontSetSettings(patch)
    },
  }),

  defineCommand({
    id: 'fontSet.quickFont',
    title: '字体快选',
    group: 'font',
    requires: 'layer',
    kind: 'instant',
    async invoke(ctx, payload) {
      if (payload.action === 'apply') {
        const font = payload.font
        const weightIndex = payload.weightIndex ?? 0
        if (!font) throw new CepError('PARSE', msg.command.text.fontSetNoQuickFont)
        const postScriptName = font.hjm[weightIndex]
        const name = font.mz[weightIndex]
        const weight = font.zz[weightIndex]
        if (!postScriptName) throw new CepError('PARSE', msg.command.text.fontSetNoPostScriptName)
        await requireFontApplied(() => ctx.jsx.font.setFontName(postScriptName, name, weight), name)
        await rememberFamily(font.family)
        syncTextInfo()
        return
      }

      if (payload.action === 'select') {
        quickFontWriter.update((file) => {
          const index = payload.index ?? 0
          if (index < 0 || index >= file.list.length) {
            throw new CepError('PARSE', msg.command.text.fontSetSwitchFailed)
          }
          file.index = index
        })
        return
      }

      if (payload.action === 'delete') {
        quickFontWriter.update((file) => {
          const index = payload.index ?? 0
          if (index < 0 || index >= file.list.length)
            throw new CepError('PARSE', msg.command.text.fontSetDeleteError)
          if (file.list.length === 1)
            throw new CepError('PARSE', msg.command.text.fontSetKeepOneMin)
          file.list.splice(index, 1)
          file.index = 0
        })
        return
      }

      // add：读当前图层字体 → 在系统字体里补全字重 → 去重/上限 → 落盘
      const infoOutcome = await ctx.jsx.font.getCurrentFontInfo()
      if (!infoOutcome.ok) {
        throw new CepError(infoOutcome.code, infoOutcome.reason || '读取当前图层字体失败')
      }
      // 解码器已证 `family` 若在必是字符串 ⇒ 不需要 `as Record<string, unknown>`
      const family = infoOutcome.data.family ?? ''
      if (!family) throw new CepError('PARSE', msg.command.text.fontSetLayerNoFontInfo)

      const list = await getFontList()
      const hit = list.find((item) => item.family === family)
      if (!hit) throw new CepError('PARSE', msg.command.text.fontSetFindFontInfoFailed)

      quickFontWriter.update((file) => {
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
    async invoke(_ctx, { action, name, index, levels }) {
      if (action === 'select') {
        if (typeof index !== 'number')
          throw new CepError('PARSE', msg.command.text.fontSetSwitchFailed)
        hierarchyWriter.update((file) => {
          if (index < 0 || index >= file.list.length)
            throw new CepError('PARSE', msg.command.text.fontSetSwitchFailed)
          file.index = index
        })
        return
      }

      if (action === 'create') {
        if (!name?.trim())
          throw new CepError('PARSE', msg.command.text.fontSetHierarchyNameRequired)
        const next = requireLevels(levels ?? [])
        hierarchyWriter.update((file) => {
          file.list.push({ name: name.trim(), data: [...next] })
        })
        return
      }

      if (action === 'rename') {
        if (!name?.trim()) throw new CepError('PARSE', msg.command.text.fontSetNewNameRequired)
        if (typeof index !== 'number')
          throw new CepError('PARSE', msg.command.text.fontSetRenameIndexWrong)
        hierarchyWriter.update((file) => {
          const preset = file.list[index]
          if (!preset) throw new CepError('PARSE', msg.command.text.fontSetRenameIndexWrong)
          preset.name = name.trim()
        })
        return
      }

      if (action === 'delete') {
        hierarchyWriter.update((file) => {
          const target = index ?? file.index
          if (target < 0 || target >= file.list.length)
            throw new CepError('PARSE', msg.command.text.fontSetDeleteIndexWrong)
          if (file.list.length === 1)
            throw new CepError('PARSE', msg.command.text.fontSetKeepOneRequired)
          file.list.splice(target, 1)
          file.index = 0
        })
        return
      }

      // save：用当前 6 级字号覆盖当前预设
      const next = requireLevels(levels ?? [])
      hierarchyWriter.update((file) => {
        const preset = file.list[file.index]
        if (!preset) throw new CepError('PARSE', msg.command.text.fontSetPresetMissing)
        preset.data = [...next]
      })
    },
  }),
]
