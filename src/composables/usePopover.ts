// 是什么：锚点浮层的开关态 + 几何（定位/重算）｜替代了什么：它以前自己也挂 document mousedown+keydown 关浮层｜谁在用：GPopover、GDropdown、SelectBox、ActionWarehouse
import { nextTick, onBeforeUnmount, ref, toValue, watch, type Ref } from 'vue'
import { anchorRect, useFloatingPosition, type FloatingReference } from './useFloatingPosition'
import { useDismiss } from './useDismiss'
import type { FloatingPlacement } from './floating-position'

export interface UsePopoverOptions {
  /** 外部 v-model；不传则内部维护 */
  open?: Ref<boolean>
  placement?: FloatingPlacement | Ref<FloatingPlacement>
  offset?: number
  padding?: number
  /** 浮层宽度跟触发器一致：width 设实际宽度，min 只设最小宽度 */
  matchWidth?: 'width' | 'min' | false
  /** 可选：由调用方持有模板 ref，避免解构后 TS 认为未使用 */
  triggerRef?: Ref<HTMLElement | null>
  panelRef?: Ref<HTMLElement | null>
}

/**
 * 浮层行为层：开关 + 几何（resize / scroll 重算、宽度对齐、清理）。
 *
 * **关闭（点外部 / Esc）不在这里** —— 统一交给 `useDismiss`。
 * 想改"点外面关不关、Esc 关几个"，改 `useDismiss` 一处；**不要在这里再挂监听**，
 * 否则同一个 Esc 会有两条路各关各的 —— 一次按下去关掉两层（历史上就是这么坏的）。
 *
 * 结构上拦不住：`document.addEventListener` 是 DOM API，类型层没有约束，
 * 本仓**不建**扫描型闸（不写白名单、不设上限）⇒ 这条规矩只靠注释和 code review。
 * 本文件只负责**几何**（resize / scroll 重算、宽度对齐、清理）与开关态。
 */
export function usePopover(options: UsePopoverOptions = {}) {
  const internalOpen = ref(false)
  const open = options.open ?? internalOpen
  const triggerRef = options.triggerRef ?? ref<HTMLElement | null>(null)
  const panelRef = options.panelRef ?? ref<HTMLElement | null>(null)

  const { resolvedPlacement, update: updatePosition } = useFloatingPosition({
    reference: triggerRef as Ref<FloatingReference | null>,
    floating: panelRef,
    placement: options.placement,
    offset: options.offset,
    padding: options.padding,
  })

  // 关闭统一走 useDismiss：面板被 Teleport 出去后不在触发器子树里，两端都要声明为"内部"。
  useDismiss(
    () => open.value,
    panelRef,
    () => close(),
    {
      inside: () => [triggerRef.value, panelRef.value],
    },
  )

  let observer: ResizeObserver | null = null

  function update() {
    updatePosition()
    const trigger = triggerRef.value
    const panel = panelRef.value
    if (!trigger || !panel || !options.matchWidth) return
    // 宽度同样走 CSS 变量：面板自己的 <style> 用 var(--floating-width) 消费。
    const width = `${Math.round(anchorRect(trigger).width)}px`
    panel.style.setProperty(
      options.matchWidth === 'width' ? '--floating-width' : '--floating-min-width',
      width,
    )
  }

  function close() {
    open.value = false
  }

  function toggle() {
    open.value = !open.value
  }

  function onViewportChange() {
    update()
  }

  /** 只挂几何监听；关闭监听归 useDismiss。 */
  function bind() {
    window.addEventListener('resize', onViewportChange)
    document.addEventListener('scroll', onViewportChange, true)

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => update())
      if (panelRef.value) observer.observe(panelRef.value)
      if (triggerRef.value) observer.observe(triggerRef.value)
    }
  }

  function unbind() {
    window.removeEventListener('resize', onViewportChange)
    document.removeEventListener('scroll', onViewportChange, true)
    observer?.disconnect()
    observer = null
  }

  /** 触发器键盘：只负责"打开"。Esc 由 `useDismiss` 统一处理（只关最上层那一个）。 */
  function onTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      open.value = true
    }
  }

  watch(
    open,
    async (value) => {
      if (value) {
        await nextTick()
        update()
        bind()
      } else {
        unbind()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(unbind)

  return {
    open,
    triggerRef,
    panelRef,
    resolvedPlacement,
    close,
    toggle,
    update,
    onTriggerKeydown,
    placement: toValue(options.placement ?? 'bottom-start'),
  }
}
