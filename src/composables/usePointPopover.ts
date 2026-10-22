import { nextTick, ref, watch, type Ref } from 'vue'
import { useDismiss } from './useDismiss'
import { useFloatingPosition } from './useFloatingPosition'
import type { FloatingPlacement } from './floating-position'

/**
 * 鼠标坐标浮层：定位 + 点外部关闭 + Esc。
 *
 * 替代 TagMenu / TagContextMenu 各自复制的 `point + useFloatingPosition + useDismiss + watch`。
 * 只负责浮层行为，不定义内容样式。
 */
export function usePointPopover(options: {
  visible: () => boolean
  x: () => number
  y: () => number
  close: () => void
  floating: Ref<HTMLElement | null>
  placement?: FloatingPlacement
}) {
  const point = ref({ x: options.x(), y: options.y() })
  const { update } = useFloatingPosition({
    reference: point,
    floating: options.floating,
    placement: options.placement ?? 'bottom-start',
  })

  useDismiss(options.visible, options.floating, options.close)

  watch(options.visible, async (visible) => {
    if (!visible) return
    point.value = { x: options.x(), y: options.y() }
    await nextTick()
    update()
  })

  return { update }
}
