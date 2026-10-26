// 是什么：设置页「预设输入」文本框的解析 / 格式化纯逻辑（无 IO、无 Vue、无提示）
// 唯一入口：字体面板三组预设（字号 / 行距 / 字距）的文本 ↔ 数组转换只走这里
// 替代了什么：`pages/set/index.vue` 的 `parseNumbers` 已删除，文本 ↔ 数组转换现由本文件负责。
// 谁在用：pages/set/components/AddcomDialog.vue、pages/set/index.vue、tests/domain/font-preset-text.test.ts
// 禁止：这里不读设置、不弹 toast；错误文案怎么显示由调用方决定（命令层统一由 useCommand 提示）

/** 允许的数值个数区间：6–24。依据原版错误文案「输入数值个数需在6到24个之间」
 *  （`docs/生成/页面规格/08-设置.md:307`；`docs/页面/08-设置.md:57` 的「逗号数 >=23 或 <=4 报错」= 个数 6..24） */
export const PRESET_COUNT_MIN = 6
export const PRESET_COUNT_MAX = 24
/** 原版每 6 个换行（`docs/页面/08-设置.md:57`） */
export const PRESET_GROUP_SIZE = 6

/** 原版文案，逐字照抄（`docs/生成/页面规格/08-设置.md:307`） */
export const PRESET_COUNT_MESSAGE = '输入数值个数需在6到24个之间'
/** 原版只有上面这一条 err 文案；非数字这一条是我方补充（原版未提取），见文件末 UNVERIFIED */
export const PRESET_NUMBER_MESSAGE = '只能输入数字，多个数值用逗号分隔'
export const PRESET_EMPTY_MESSAGE = '请输入数值'

export type PresetTextIssue = 'empty' | 'number' | 'count'

export type PresetTextResult =
  { status: 'ok'; values: number[] } | { status: 'error'; fail: PresetTextIssue; reason: string }

/** 按逗号（中英文）、空格、换行切词；空串丢掉——允许尾逗号与「每 6 个换行」的排版文本原样贴回 */
export function tokenizePresetText(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((token) => token.trim())
    .filter((token) => token !== '')
}

export function isPresetCountValid(count: number): boolean {
  return count >= PRESET_COUNT_MIN && count <= PRESET_COUNT_MAX
}

/**
 * 文本 → 数值数组。三档错误各自带文案，顺序是「空 → 非数字 → 个数」：
 * 空文本不该报「个数不够」，那会把"还没输入"说成"输错了"。
 */
export function parsePresetText(text: string): PresetTextResult {
  const tokens = tokenizePresetText(text)
  if (!tokens.length) return { status: 'error', fail: 'empty', reason: PRESET_EMPTY_MESSAGE }
  // 只认十进制数字（行距 1.1、字距 -100 都要过）；'' 与 '1,2abc' 这类由这里拦
  if (tokens.some((token) => !/^-?\d+(\.\d+)?$/.test(token))) {
    return { status: 'error', fail: 'number', reason: PRESET_NUMBER_MESSAGE }
  }
  const values = tokens.map(Number)
  if (!isPresetCountValid(values.length)) {
    return { status: 'error', fail: 'count', reason: PRESET_COUNT_MESSAGE }
  }
  return { status: 'ok', values }
}

/** 数组 → 文本：每 6 个换行（原版 textarea 的排版），组内逗号分隔 */
export function formatPresetText(values: readonly number[]): string {
  const groups: string[] = []
  for (let i = 0; i < values.length; i += PRESET_GROUP_SIZE) {
    groups.push(values.slice(i, i + PRESET_GROUP_SIZE).join(','))
  }
  return groups.join('\n')
}

// UNVERIFIED: `PRESET_NUMBER_MESSAGE` / `PRESET_EMPTY_MESSAGE` 是我方文案——原版 render 只有
// 「输入数值个数需在6到24个之间」一条 err（`生成/页面规格/08-设置.md:305-308`），非数字与空文本
// 分别报什么未提取。拿到原版 `anon_56d7_L55059.md` 原文后按原文替换。
