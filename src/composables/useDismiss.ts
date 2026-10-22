import { onBeforeUnmount, onMounted, type Ref } from 'vue'

interface Entry {
  visible: () => boolean
  container: Ref<HTMLElement | null | undefined>
  close: () => void
  outside: boolean
}

const entries = new Set<Entry>()
let installed = false

function onPointerDown(event: MouseEvent) {
  for (const entry of entries) {
    if (!entry.outside || !entry.visible()) continue
    const el = entry.container.value
    if (el && !el.contains(event.target as Node)) entry.close()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  let handled = false
  for (const entry of [...entries].reverse()) {
    if (!entry.visible()) continue
    entry.close()
    handled = true
  }
  // 只阻止一次冒泡，避免同时关掉外层弹窗
  if (handled) event.stopPropagation()
}

function install() {
  if (installed) return
  installed = true
  document.addEventListener('mousedown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
}

function uninstall() {
  if (!installed || entries.size) return
  installed = false
  document.removeEventListener('mousedown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
}

/**
 * 浮层的统一关闭行为：点外部 + Esc。
 *
 * 所有弹窗、菜单、下拉、卡片都必须用它，不要各自 document.addEventListener。
 * 现在只挂一份全局监听，多个浮层共用；顺序不保证，但行为与逐组件注册等价。
 *
 * @param visible   是否打开（传函数，避免拿到旧的布尔值）
 * @param container 浮层根元素，点它内部不关闭
 * @param close     关闭动作
 * @param options   outside=false 时只处理 Esc（遮罩点击已负责关闭的弹窗用这个）
 */
export function useDismiss(
  visible: () => boolean,
  container: Ref<HTMLElement | null | undefined>,
  close: () => void,
  options: { outside?: boolean } = {},
) {
  const entry: Entry = {
    visible,
    container,
    close,
    outside: options.outside ?? true,
  }

  onMounted(() => {
    entries.add(entry)
    install()
  })

  onBeforeUnmount(() => {
    entries.delete(entry)
    uninstall()
  })
}
