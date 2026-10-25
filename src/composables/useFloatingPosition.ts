import { ref, toValue, type Ref } from 'vue'
import {
  computeFloatingPosition,
  type FloatingPlacement,
  type FloatingRect,
} from './floating-position'

export type FloatingReference = HTMLElement | { x: number; y: number }

export interface UseFloatingPositionOptions {
  /** 触发器元素，或鼠标坐标 */
  reference: Ref<FloatingReference | null | undefined>
  /** 浮层元素 */
  floating: Ref<HTMLElement | null | undefined>
  placement?: FloatingPlacement | Ref<FloatingPlacement>
  offset?: number
  padding?: number
}

/**
 * 元素 → 锚点矩形；鼠标坐标折成零尺寸矩形。
 *
 * **全仓唯一取矩形点**：页面/组件不要再自己 `getBoundingClientRect()` 再把 `{x,y}` 传进来
 * （那样"取矩形"就有 N 个入口，改一处漏一处）。直接把元素交给它。
 * 例外只有两类，都不属锚点：① 浮层自己的尺寸（本文件 `update()` 内）；② 纯布局判断（如 clamp 宽度）。
 */
export function anchorRect(reference: FloatingReference): FloatingRect {
  if ('getBoundingClientRect' in reference) {
    const rect = reference.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }
  }
  return {
    left: reference.x,
    top: reference.y,
    right: reference.x,
    bottom: reference.y,
    width: 0,
    height: 0,
  }
}

/**
 * 只负责“算位置”，不管开关、外部点击、Esc。
 * 生命周期由 `usePopover` 或调用方负责。
 */
export function useFloatingPosition(options: UseFloatingPositionOptions) {
  const resolvedPlacement = ref<FloatingPlacement>(
    typeof options.placement === 'string' ? options.placement : 'bottom-start',
  )

  function update() {
    const reference = options.reference.value
    const floating = options.floating.value
    if (!reference || !floating) return

    const box = floating.getBoundingClientRect()
    const position = computeFloatingPosition(
      anchorRect(reference),
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
      {
        placement: toValue(options.placement ?? 'bottom-start'),
        offset: options.offset ?? 4,
        padding: options.padding ?? 4,
      },
    )

    resolvedPlacement.value = position.placement
    // 直接写元素上的 CSS 变量，模板不再出现 :style：
    // 定位规则放在浮层自己的 <style> 里（D-22，模板内联样式会绕过 style-guard）。
    floating.style.setProperty('--floating-x', `${position.left}px`)
    floating.style.setProperty('--floating-y', `${position.top}px`)
  }

  return { resolvedPlacement, update }
}
