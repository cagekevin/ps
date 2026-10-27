// 是什么：旧版自由面板命令（`{command, options}`）→ 当前 `LegacyCommand` 的适配纯逻辑
// 唯一入口：旧数据只有这一个适配器；形状不认识返回 `DecodeFail`，不抛
// 谁在用：`cep/data/free-panel-legacy.ts`、`tests/domain/free-panel-legacy-reject.test.ts`
// 禁止：这里的 `CepError('PARSE')` 是**业务校验**（选项不是数字 / 变换不是文本），不是解析失败。

import { CepError } from '@/utils/errors'
import { msg } from './messages'
import type { FreePanelItem } from './free-panel'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

/**
 * 自由面板旧数据 key → 命令 id + payload。
 *
 * 旧 key 来自原版 `handleFreePanelEvent`（app.v4.js:17021-17260）。
 * 只映射**已经确认参数形状**的项；未知 key 返回 null，由命令层报错。
 */
export interface LegacyCommand {
  id: string
  payload: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** 拒绝理由里放原始值片段：用户数据（`sj_appFreePanel.json`）坏了要能直接看出坏在哪 */
function preview(value: unknown): string {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value))
  return text.slice(0, 40)
}

/**
 * option 必须是**有限数**。
 *
 * 以前这里是 `Number(option)`：`'abc'` → `NaN` 直接进 jsx，`null`/`''` → `0` 悄悄变成
 * "第 0 档"。自由面板项是**用户数据**，形状不可信——在入口当场拒绝，
 * 给出"哪个 key 的哪个字段、原值是什么"，比带着 NaN 继续跑强。
 */
function requireNumber(option: unknown, key: string): number {
  const value = Number(option)
  const empty = option === null || option === undefined || option === ''
  if (empty || !Number.isFinite(value)) {
    throw new CepError('PARSE', msg.validate.fn.freePanelOptionNotNumber(key, preview(option)))
  }
  return value
}

/** 官方 `zdy_customBuildTransform` 的 7 个字段：数字位必须是有限数，文本位必须是字符串 */
function requireTransformParams(
  cfg: Record<string, unknown>,
): [number, number, string, string, number, number, number] {
  const num = (field: string) => {
    const raw = cfg[field]
    const value = Number(raw)
    if (raw === null || raw === undefined || raw === '' || !Number.isFinite(value)) {
      throw new CepError('PARSE', msg.validate.fn.freePanelTransformNotNumber(field, preview(raw)))
    }
    return value
  }
  const text = (field: string) => {
    const raw = cfg[field]
    if (typeof raw !== 'string') {
      throw new CepError('PARSE', msg.validate.fn.freePanelTransformNotText(field, preview(raw)))
    }
    return raw
  }
  return [
    num('number'),
    num('angle'),
    text('leftRigth'),
    text('topBottom'),
    num('pointIndex'),
    num('scale'),
    num('opacity'),
  ]
}

export function adaptFreePanelItem(item: FreePanelItem): Decoded<LegacyCommand> | DecodeFail {
  const command = legacyCommandOf(item)
  // 没有对应命令是**可枚举的失败**（消费侧据此报"这个按钮没法迁移"），不再往外递 `null`
  return command === undefined ? shapeFail('key', 'string', item.key) : { value: command }
}

/**
 * 旧 key → 新命令。`undefined` = **这个 key 没有对应命令**（"不适用"，不是失败）。
 *
 * 私有：对外只暴露 `adaptFreePanelItem`，别让调用方拿到"可能没有"的东西自己兜底。
 */
function legacyCommandOf(item: FreePanelItem): LegacyCommand | undefined {
  const option = item.option
  // 旧自造 key（`commonUse.embed` 等）先在别名表里换成官方 key，再走同一张 switch。
  // 一张表 = 一处，不为旧 key 再开一套分支（见文件末尾 LEGACY_KEY_ALIASES 的删除条件）。
  const key = LEGACY_KEY_ALIASES[item.key] ?? item.key

  switch (key) {
    case 'dz_useAction':
      return { id: 'action.call', payload: option }

    case 'zt_translate': {
      const config = asRecord(option)
      return {
        id: 'fontSet.translate',
        payload: {
          from: typeof config.from === 'string' ? config.from : 'auto',
          to: typeof config.to === 'string' ? config.to : 'auto',
          replace: config.delete !== false,
        },
      }
    }

    case 'zt_createButton':
      return { id: 'fontSet.createButton', payload: { config: option } }

    case 'zt_copyFontInfo':
      return { id: 'fontSet.copyFont', payload: undefined }

    case 'zt_pasteFontInfo':
      return { id: 'fontSet.pasteFont', payload: { keeps: option } }

    case 'zt_switchFontDirection':
      return { id: 'fontSet.switchDirection', payload: undefined }

    case 'zt_setFontSize':
      return { id: 'fontSet.fontSize', payload: { value: requireNumber(option, key) } }

    case 'zt_setFontLeading':
      return { id: 'fontSet.leading', payload: { value: requireNumber(option, key) } }

    case 'zt_setFontTracking':
      return { id: 'fontSet.tracking', payload: { value: requireNumber(option, key) } }

    case 'zt_setLeftRightAlign':
      return {
        id: 'fontSet.align',
        payload: { axis: 'h', index: requireNumber(option, key) },
      }

    case 'zt_setUpDownAlign':
      return {
        id: 'fontSet.align',
        payload: { axis: 'v', index: requireNumber(option, key) },
      }

    case 'zt_changeTextBranchMerge':
      return { id: 'fontSet.split', payload: { mode: requireNumber(option, key) } }

    case 'cy_swapWireframeFill':
      return {
        id: 'legacy.call',
        payload: { key: 'cy_swapWireframeFill', args: [] },
      }

    case 'cy_exportOpenFolder':
      return {
        id: 'legacy.call',
        payload: { key: 'cy_openDirectory', args: [] },
      }

    // ---------- 常用页（/commonUse）----------
    //
    // 官方自由面板项的 `key` **就是**派发表里的 key（`$freePanelBox.show(名, key, option)`
    // → `option.key`，`app.v4.js:2163-2180`），不是我们自造的名字。所以这里按官方 key 收编，
    // 这样**原面板写进 `sj_appFreePanel.json` 的项，我方也能执行**。
    //
    // 注意 key ≠ jsx 名：`cy_embedImage` 的 jsx 是 `cy_insertionImage`、`cy_useGride` 是
    // `cy_createSafeAreaGuide`……两跳映射（key → 命令 id → jsx 名），别合并。

    case 'cy_embedImage':
      // 官方 option 就是 `{path, bLink2, bDelete}`（`:38070-38074`）
      return { id: 'commonUse.embedImage', payload: { options: asRecord(option) } }

    case 'cy_embedMultipleImage':
      // 官方 `cy_embedMultipleImage` 无参（`:37902`）
      return { id: 'commonUse.embedMultipleImages', payload: undefined }

    case 'cy_importMultipleImage':
      // 官方 option 是 `{path, toLinkObject}`（`:38101-38104`）；path 原样透传，不加工
      return {
        id: 'commonUse.importMultipleImages',
        payload: { path: asRecord(option).path, toLinkObject: asRecord(option).toLinkObject },
      }

    case 'cy_optimizeDoc':
      return { id: 'commonUse.optimizeOnce', payload: { options: asRecord(option) } }

    case 'zdy_customBuildTransform': {
      // 官方 option 是 7 个具名字段，按定序拼成数组（`:17165`；顺序见 `05-常用.md:57`）
      return {
        id: 'commonUse.transform',
        payload: { params: requireTransformParams(asRecord(option)) },
      }
    }

    case 'cy_exportImage':
      return {
        id: 'commonUse.exportImages',
        payload: { mode: 'image', options: option ?? undefined },
      }

    case 'cy_batchExportLayer':
      return {
        id: 'commonUse.exportImages',
        payload: { mode: 'first', options: option ?? undefined },
      }

    case 'cy_batchExportSecondLayer':
      return {
        id: 'commonUse.exportImages',
        payload: { mode: 'second', options: option ?? undefined },
      }

    case 'cy_useGride':
      // key `cy_useGride` → jsx `cy_createSafeAreaGuide`（`:17168`）
      return { id: 'commonUse.referenceGuide', payload: { options: option ?? undefined } }

    case 'cy_clearCutGuide':
      // key `cy_clearCutGuide` → jsx `cy_guideFunction`（`:17171`）
      return { id: 'commonUse.referenceSlice', payload: { options: option ?? undefined } }

    case 'cy_distributedByPitch':
      // 官方 `i = a.option` 原样透传（`:17173`）；我方命令要 `[t, width, mode]`
      return {
        id: 'commonUse.distribute',
        payload: { params: Array.isArray(option) ? option : [option] },
      }

    default:
      return undefined
  }
}

/**
 * 旧 key 别名表（T-86a 收编官方 key 时留下的兼容层）。
 *
 * **为什么有**：2026-10 之前我方自由面板项用自造 key（`commonUse.embed` 等），
 * 用户机器上 `sj_appFreePanel.json` 里可能还留着这种项；直接删表会让这些项变成"key 未适配"。
 *
 * **什么时候能删**：我方生成的面板项已全部换成官方 key（写入侧只产官方 key），
 * 且统计确认用户机不再有旧 key 的项（可用台账统计一次）。删前先跑
 * `tests/domain/free-panel-common-use.test.ts` 的别名用例，删完要同步删掉对应断言。
 */
export const LEGACY_KEY_ALIASES: Record<string, string> = {
  'commonUse.embed': 'cy_embedImage',
  'commonUse.import': 'cy_importMultipleImage',
  'commonUse.optimization': 'cy_optimizeDoc',
  'commonUse.customChange': 'zdy_customBuildTransform',
  'commonUse.export': 'cy_exportImage',
  'commonUse.reference': 'cy_useGride',
  'commonUse.spacing': 'cy_distributedByPitch',
}
