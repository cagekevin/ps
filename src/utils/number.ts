/**
 * 从输入框文本里取数字。
 *
 * 原版/现有输入框都允许 "12 点"、"-25" 这类文本，统一去掉非数字字符再 parseFloat；
 * 解析失败按 0。集中在这里，避免 FontColor / FontSetNumber 各写一套清洗规则。
 */
export function parseNumericText(value: unknown): number {
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}
