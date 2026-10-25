// 是什么：重命名预设与表达式标记的纯逻辑（无 IO、无 Vue）
// 唯一入口：标记插入/去重、组与项的增删改、`.cmm` 解析，只在这里（拖拽落点见 `domain/reorder.ts`）
// 替代了什么：原版 Rename 组件里与数据有关的方法（app.v4.js:56800-56895、56933-57280）
// 谁在用：`commands/rename.ts`、`stores/rename.ts`、`tests/domain/rename.test.ts`
// 禁止：不许在这里实现表达式求值，求值交给 PS 的 `cmm_batchName`（见下方 UNVERIFIED）

import { CepError } from '@/utils/errors'
import { msg } from './messages'
import { isRecord } from '@/utils/guards'
import { decodeList, type DecodeFail, type Decoded } from '@/utils/decode'

/** 一个重命名分组。第 0 组是固定组（最近使用），不可改名/删除 */
export interface RenameGroup {
  name: string
  show: boolean
  list: string[]
}

/** 预设整体就是数组，`.cmm` 里存的就是它（原版导出 `JSON.stringify(this.data.info)`，:57022） */
export type RenamePreset = RenameGroup[]

export type RenameMark = '%n' | '%nn' | '%%n' | '%%nn' | '%n=' | '###'

/**
 * 表达式标记全集。
 *
 * 依据：原版 `showTips` 里的 `var n = ["%n","%nn","%%n","%%nn","%n=","###"]`（app.v4.js:57078）。
 * text 是原版菜单文案（:57094-57112），只用于展示，不是我们的语义定义。
 *
 * UNVERIFIED: 标记的求值语义（是否补零、起始序号、`###` 拼接位置）在 PS 侧 `cmm_batchName`
 * 里；`public/lib/all.decrypted.js` 搜不到该字符串（jsxbin 不可读）。
 * 因此本文件只做"插入标记 + 去重"，一行业号相关逻辑都不写——猜错就是改名改错。
 */
export const RENAME_MARKS: ReadonlyArray<{ mark: RenameMark; text: string }> = [
  { mark: '%n', text: '%n 从下到上排序(1/2...)' },
  { mark: '%nn', text: '%nn 从下到上排序(01/02...)' },
  { mark: '%%n', text: '%%n 从上到下排序(1/2..)' },
  { mark: '%%nn', text: '%%nn 从上到下排序(01/02..)' },
  { mark: '%n=', text: '%n=? 需要从?数字开始排序 ' },
  { mark: '###', text: '### 保留原来名字 可组合上方内容' },
]

/**
 * 删旧标记的顺序 = 原版 :57080-57089 的 if/else 链顺序（长的先删）。
 * 顺序不能换：先删 `%%nn`，否则删 `%%n` 或 `%n` 之后剩下的字符会串。
 */
const DEDUPE_ORDER: readonly RenameMark[] = ['%%nn', '%%n', '%nn', '%n=', '%n']

/** 插入标记前先清空已有标记（原版先删再拼，:57080-57091） */
export function clearMarks(text: string): string {
  let out = text
  for (const mark of DEDUPE_ORDER) {
    // 有意偏离：原版 `a.replace(n[3], "")` 只删第一次出现（:57081），连点两次会残留半截；
    // 这里全删。
    out = out.split(mark).join('')
  }
  return out
}

/** 选一个标记 → 输入框变成「原文本（去旧标记）+ 新标记」 */
export function insertMark(current: string, mark: RenameMark): string {
  return clearMarks(current) + mark
}

/**
 * 表达式非空校验。原版 `checkVal`（:57267-57274）：纯空白也算空。
 * 返回空串表示通过，否则是提示文案。
 */
export function checkExpression(text: string): string {
  if (text === '' || text.replace(/\s*/g, '') === '') return '不能输入空字符哦'
  return ''
}

/**
 * 替换模式拼参数。原版 `this.replace + "=>" + this.newtext`（:57264）。
 *
 * 有意偏离：原版 :57260-57262 校验失败时**丢掉 checkVal 的返回，写死同一句文案**；
 * 我们直接用 checkExpression 的结果，不重复写死。
 */
export function buildReplaceExpression(replace: string, newtext: string): string {
  return `${replace}=>${newtext}`
}

/**
 * 第 0 组是固定组：不可改名、不可删除（原版守卫 `!(t < 1)`，:56871/:56876）。
 *
 * 有意偏离（原版 bug，不复刻）：
 * - `getGroupName` 写成 `if (t < 1 && t > this.info.length)`（:56881），`&&` 让守卫永远为假；
 * - `addItem/deleteItem/changeItem` 的守卫是 `!(t < 1) || !(t > len)`（:56841/:56846/:56851），
 *   恒为真，等于没守。原版实际靠 UI 隐藏组 0 的 ＋ 与右键菜单（:56687、:57058 `e != 0`）。
 * 我们统一收敛到 `isGroupEditable`（`index >= 1 && index < length`）并在模型层守着，单测盯住。
 */
export function isGroupEditable(index: number, length: number): boolean {
  return index >= 1 && index < length
}

function requireEditableGroup(preset: RenamePreset, index: number): RenameGroup {
  if (!isGroupEditable(index, preset.length)) {
    throw new CepError('PARSE', msg.validate.text.renameFixedGroup)
  }
  const group = preset[index]
  if (!group) throw new CepError('PARSE', msg.validate.text.renameGroupMissing)
  return group
}

function clone(preset: RenamePreset): RenamePreset {
  return preset.map((group) => ({ ...group, list: [...group.list] }))
}

/** 展开/收起（原版 `latelyUsed`，:57005） */
export function toggleGroupAt(preset: RenamePreset, index: number): RenamePreset {
  const next = clone(preset)
  const group = next[index]
  if (!group) throw new CepError('PARSE', msg.validate.text.renameGroupMissing)
  group.show = !group.show
  return next
}

/** 新建分组：`afterIndex` 有效时插到它后面（原版 `addGroup(name, e)`，:56855-56866） */
export function addGroupAt(preset: RenamePreset, name: string, afterIndex?: number): RenamePreset {
  const text = name.trim()
  if (!text) throw new CepError('PARSE', msg.validate.text.renameGroupNameRequired)

  const next = clone(preset)
  const group: RenameGroup = { name: text, show: true, list: [] }
  if (typeof afterIndex === 'number' && afterIndex >= 0 && afterIndex + 1 < next.length) {
    next.splice(afterIndex + 1, 0, group)
  } else {
    next.push(group)
  }
  return next
}

/** 组改名（原版 `renameGroup`，:56876；非法下标返回 false，这里抛） */
export function renameGroupAt(preset: RenamePreset, index: number, name: string): RenamePreset {
  const text = name.trim()
  if (!text) throw new CepError('PARSE', msg.validate.text.renameNewGroupNameRequired)
  requireEditableGroup(preset, index)
  const next = clone(preset)
  next[index].name = text
  return next
}

/** 删组（原版 `deleteGroup`，:56871；第 0 组受保护） */
export function deleteGroupAt(preset: RenamePreset, index: number): RenamePreset {
  requireEditableGroup(preset, index)
  const next = clone(preset)
  next.splice(index, 1)
  return next
}

/**
 * 往组里加一条预设（原版 `addItem`，:56841）。
 *
 * 第 0 组（最近使用）由批量重命名自动写入，不给手加入口：
 * 原版只靠 UI 隐藏 ＋ 按钮（`:56687` `a > 0`），模型层放行；我们在模型层也守住，
 * 免得留下一条没有 UI 路径、也没人测的分支。
 */
export function addItemAt(preset: RenamePreset, groupIndex: number, text: string): RenamePreset {
  const value = text.trim()
  if (!value) throw new CepError('PARSE', msg.validate.text.renameItemTextRequired)
  requireEditableGroup(preset, groupIndex)

  const next = clone(preset)
  next[groupIndex].list.push(value)
  return next
}

/** 改一条预设（原版 `changeItem`，:56851；第 0 组受保护） */
export function changeItemAt(
  preset: RenamePreset,
  groupIndex: number,
  itemIndex: number,
  text: string,
): RenamePreset {
  const value = text.trim()
  if (!value) throw new CepError('PARSE', msg.validate.text.renameLayerOrExprRequired)
  requireEditableGroup(preset, groupIndex)
  const next = clone(preset)
  if (next[groupIndex].list[itemIndex] === undefined)
    throw new CepError('PARSE', msg.validate.text.renamePresetMissing)
  next[groupIndex].list[itemIndex] = value
  return next
}

/** 删一条预设（原版 `deleteItem`，:56846；第 0 组受保护） */
export function deleteItemAt(
  preset: RenamePreset,
  groupIndex: number,
  itemIndex: number,
): RenamePreset {
  requireEditableGroup(preset, groupIndex)
  const next = clone(preset)
  if (next[groupIndex].list[itemIndex] === undefined)
    throw new CepError('PARSE', msg.validate.text.renamePresetMissing)
  next[groupIndex].list.splice(itemIndex, 1)
  return next
}

/**
 * 记录最近使用（原版 `addHistory`，:56822-56834）：去重 → 插到最前 → 最多 8 条。
 *
 * 原版上限写了两遍（先 `> 11` pop 一次，再 `> 8` 裁到 8），净效果就是 8；这里只留 8。
 */
export function pushHistory(preset: RenamePreset, expression: string): RenamePreset {
  const next = clone(preset)
  const history = next[0]
  if (!history) throw new CepError('PARSE', msg.validate.text.renameHistoryMissing)
  history.list = [expression, ...history.list.filter((item) => item !== expression)].slice(0, 8)
  return next
}

export interface ParsedPreset {
  preset: RenamePreset
}

/** 判断一份 JSON 是否真的是预设数组（字段类型全对才认） */
function isPreset(value: unknown): value is RenamePreset {
  return (
    Array.isArray(value) &&
    value.every(
      (group) =>
        typeof group === 'object' &&
        group !== null &&
        typeof (group as RenameGroup).name === 'string' &&
        typeof (group as RenameGroup).show === 'boolean' &&
        Array.isArray((group as RenameGroup).list) &&
        (group as RenameGroup).list.every((item) => typeof item === 'string'),
    )
  )
}

/**
 * 旧格式 `.cmm` 转新格式（原版 `oldFileToNewFile`，:57051-57071）：
 * 组用 `"<z>"` 分隔、组名与条目用 `"<>"` 分隔，末尾多一个 `<z>` 要 pop 掉。
 */
export function parseLegacyPreset(text: string): RenamePreset {
  const preset: RenamePreset = []
  const groups = text.split('<z>')
  groups.pop()
  for (const chunk of groups) {
    const parts = chunk.split('<>')
    if (!parts.length) continue
    preset.push({ name: parts[0], show: true, list: parts.slice(1) })
  }
  return preset
}

/**
 * 导入 `.cmm`：先按 JSON 读（原版导出格式，:57022），失败再按旧格式兼容读。
 *
 * 有意偏离：原版直接 `this.data.info = JSON.parse(e)`，不做任何结构校验（:57037-57038），
 * 文件坏了就是白屏。这里校验形状，不合法就报错。
 */
export function parsePreset(text: string): RenamePreset {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const legacy = parseLegacyPreset(text)
    if (!legacy.length) throw new CepError('PARSE', msg.validate.text.renameImportFailed)
    return legacy
  }
  if (!isPreset(parsed)) throw new CepError('PARSE', msg.validate.text.renameImportBadFormat)
  return parsed
}

/** 导出 `.cmm`：原版 `JSON.stringify(this.data.info)`（:57022） */
export function serializePreset(preset: RenamePreset): string {
  return JSON.stringify(preset)
}

/**
 * 首次使用的种子数据（原版 `$S` 构造里的默认值，:56807-56816）：
 * 最近使用 5 条 + 序列 4 条。原版注释里的 `%%N`（大写）照抄。
 */
export function seedPreset(): RenamePreset {
  return [
    {
      name: '最近使用',
      show: false,
      list: ['%n背景层', '%n', '收%nn', '批量改名演示', '倒叙演示%%N'],
    },
    { name: '序列', show: true, list: ['%n', '%%n', '%n###', '%%n###'] },
  ]
}

/** 条目形状：`{ name, show, list }`（原版 `.cmm` 存的就是它，:57022） */
function isRenameGroup(x: unknown): x is RenameGroup {
  return isRecord(x) && typeof x.name === 'string' && Array.isArray(x.list)
}

/** 读边界：重命名预设（必须是 `[{ name, show, list }]`；有条目坏 → 整份失败 + 原因） */
export function decodeRenamePreset(raw: unknown): Decoded<RenamePreset> | DecodeFail {
  return decodeList(raw, isRenameGroup)
}

/** 图层颜色标记个数（原版 colorData 7 个，:56905）；0 号位是「清除颜色」 */
export const RENAME_LAYER_COLORS = 7
