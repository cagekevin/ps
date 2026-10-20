import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * 浮层的统一关闭行为：点外部 + Esc。
 *
 * 所有弹窗、菜单、下拉、卡片都必须用它，不要各自 document.addEventListener。
 * 之前 TagMenu / TagContextMenu / PreviewSetting / GDropdown 各写了一遍，行为不一致。
 *
 * @param visible   是否打开（传函数，避免拿到旧的布尔值）
 * @param container 浮层根元素，点它内部不关闭
 * @param close     关闭动作
 * @param options   outside=false 时只处理 Esc（遮罩点击已负责关闭的弹窗用这个）
 */
export function useDismiss(
  visible: () => boolean,
  container: Ref<HTMLElement | undefined>,
  close: () => void,
  options: { outside?: boolean } = {},
) {
  const { outside = true } = options

  function onPointerDown(event: MouseEvent) {
    if (!visible()) return
    const el = container.value
    if (!el) return
    if (!el.contains(event.target as Node)) close()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible()) {
      // 阻止冒泡，避免同时关掉外层弹窗
      event.stopPropagation()
      close()
    }
  }

  onMounted(() => {
    if (outside) document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  })
}
