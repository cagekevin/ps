/**
 * 图标尺寸阶梯。取自原版模板里 `svg-N` 的真实使用频率
 * （16px 12 次、10px 10 次、14px 9 次、9px 8 次、18px 5 次、20px 4 次、24px 1 次）。
 *
 * 规则见 docs/视觉规范.md。组件里不要写裸数字，用这些预设名。
 */
export const ICON_SIZE = {
  '2xs': 9,
  xs: 10,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const

export type IconSize = keyof typeof ICON_SIZE

export const ICON_SIZE_NAMES = Object.keys(ICON_SIZE) as IconSize[]

/** 把预设名或数字统一成 px 字符串 */
export function toPx(size: number | IconSize): string {
  if (typeof size === 'number') return `${size}px`
  return `${ICON_SIZE[size] ?? ICON_SIZE.md}px`
}
