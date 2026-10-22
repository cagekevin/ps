import { nextTick, onBeforeUnmount, ref, toValue, watch, type Ref } from 'vue'
import { useFloatingPosition, type FloatingReference } from './useFloatingPosition'
import type { FloatingPlacement } from './floating-position'

export interface UsePopoverOptions {
  /** 外部 v-model；不传则内部维护 */
  open?: Ref<boolean>
  placement?: FloatingPlacement | Ref<FloatingPlacement>
  offset?: number
  padding?: number
  /** 浮层宽度跟触发器一致：width 设实际宽度，min 只设最小宽度 */
  matchWidth?: 'width' | 'min' | false
  closeOnOutside?: boolean
  closeOnEscape?: boolean
  /** 可选：由调用方持有模板 ref，避免解构后 TS 认为未使用 */
  triggerRef?: Ref<HTMLElement | null>
  panelRef?: Ref<HTMLElement | null>
}

/**
 * 浮层行为层：开关、点外部关闭、Esc、resize/scroll 重算、清理。
 * 几何计算在 `useFloatingPosition`，这里不重复。
 */
export function usePopover(options: UsePopoverOptions = {}) {
  const internalOpen = ref(false)
  const open = options.open ?? internalOpen
  const triggerRef = options.triggerRef ?? ref<HTMLElement | null>(null)
  const panelRef = options.panelRef ?? ref<HTMLElement | null>(null)
  const closeOnOutside = options.closeOnOutside ?? true
  const closeOnEscape = options.closeOnEscape ?? true

  const {
    style,
    resolvedPlacement,
    update: updatePosition,
  } = useFloatingPosition({
    reference: triggerRef as Ref<FloatingReference | null>,
    floating: panelRef,
    placement: options.placement,
    offset: options.offset,
    padding: options.padding,
  })

  let observer: ResizeObserver | null = null

  function update() {
    updatePosition()
    const trigger = triggerRef.value
    if (!trigger || !options.matchWidth) return
    const width = `${Math.round(trigger.getBoundingClientRect().width)}px`
    style.value = {
      ...style.value,
      ...(options.matchWidth === 'width' ? { width } : { minWidth: width }),
    }
  }

  function close() {
    open.value = false
  }

  function toggle() {
    open.value = !open.value
  }

  function onDocMouseDown(event: MouseEvent) {
    if (!open.value) return
    const target = event.target as Node | null
    if (!target) return
    if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return
    close()
  }

  function onKeydown(event: KeyboardEvent) {
    if (open.value && closeOnEscape && event.key === 'Escape') close()
  }

  function onViewportChange() {
    update()
  }

  function bind() {
    if (closeOnOutside) document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', onViewportChange)
    document.addEventListener('scroll', onViewportChange, true)

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => update())
      if (panelRef.value) observer.observe(panelRef.value)
      if (triggerRef.value) observer.observe(triggerRef.value)
    }
  }

  function unbind() {
    document.removeEventListener('mousedown', onDocMouseDown)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onViewportChange)
    document.removeEventListener('scroll', onViewportChange, true)
    observer?.disconnect()
    observer = null
  }

  function onTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close()
      return
    }
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
    style,
    resolvedPlacement,
    close,
    toggle,
    update,
    onTriggerKeydown,
    placement: toValue(options.placement ?? 'bottom-start'),
  }
}
