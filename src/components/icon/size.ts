/**
 * 图标尺寸。
 *
 * **默认是 1em，跟随字号** —— 这是原版 `.icon{width:1em;height:1em}` 的真实行为。
 * 绝大多数场景不需要传 size，让图标自然跟文字同高。
 *
 * 只有在原版显式用 `class="svg-14"` 之类覆盖过的地方，才用下面的预设名。
 * 预设值取自原版模板里 svg-N 的实际使用频率。
 *
 * 规则见 docs/视觉规范.md。
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

/**
 * 统一成 CSS 长度：
 * - 预设名 → px
 * - 数字 → px
 * - 带单位的字符串（如 '1em'、'1.2em'）→ 原样
 */
export function toPx(size: number | IconSize | string): string {
  if (typeof size === 'number') return `${size}px`
  if (size in ICON_SIZE) return `${ICON_SIZE[size as IconSize]}px`
  return size
}
