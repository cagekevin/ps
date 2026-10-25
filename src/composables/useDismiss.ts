// 是什么：浮层关闭原语（点外部 / Esc）的唯一实现｜替代了什么：各浮层自己挂的 document mousedown+keydown｜谁在用：CepModal、usePointPopover、usePopover、页面级菜单
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

interface Entry {
  visible: () => boolean
  container: Ref<HTMLElement | null | undefined>
  close: () => void
  outside: boolean
  /**
   * 除 `container` 之外，还有哪些元素算"内部"。
   * 浮层把面板 `Teleport` 到 body 时，触发器和面板不再同属一棵子树，必须两边都算内部——
   * 否则点触发器会被判成"点了外面"：先 close 再 toggle，表现为"点触发器关不掉"。
   */
  inside?: () => Array<HTMLElement | null | undefined>
  /** 打开序号：越大越"上面"。Esc 只关 seq 最大的那个可见浮层。 */
  seq: number
}

const entries = new Set<Entry>()
let installed = false
let openCounter = 0

/** 点是否落在该浮层的"内部"（容器 + 声明的内部元素）。一个都没渲染时算内部，不误关。 */
function isInside(entry: Entry, target: Node): boolean {
  const known = [entry.container.value, ...(entry.inside?.() ?? [])].filter(
    (el): el is HTMLElement => !!el,
  )
  if (!known.length) return true
  return known.some((el) => el.contains(target))
}

function onPointerDown(event: MouseEvent) {
  for (const entry of entries) {
    if (!entry.outside || !entry.visible()) continue
    if (!isInside(entry, event.target as Node)) entry.close()
  }
}

/** 最近打开且仍可见的那个浮层；没有就返回 null。 */
function topmostVisible(): Entry | null {
  let top: Entry | null = null
  for (const entry of entries) {
    if (!entry.visible()) continue
    if (!top || entry.seq > top.seq) top = entry
  }
  return top
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const top = topmostVisible()
  if (!top) return
  top.close()
  event.stopPropagation()
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
 * **唯一实现**：所有弹窗、菜单、下拉、卡片都必须用它，不要各自 `document.addEventListener`。
 * 两个手势语义不同，**不要改成一样**：
 * - 点外部 ⇒ 关掉**所有**开着的浮层（取消整个浮层态）
 * - Esc   ⇒ 只关**最近打开的那一个**（逐层退出）
 *
 * "最上层"的判据是**打开序号**，不是挂载顺序、也不是 z-index ——
 * 多入口并存（`Teleport` 到 body / 就地渲染）时，后两者与视觉层叠对不上。
 *
 * @param visible   是否打开（传函数，避免拿到旧的布尔值）
 * @param container 浮层根元素，点它内部不关闭
 * @param close     关闭动作
 * @param options   outside=false 时只处理 Esc（遮罩点击已负责关闭的弹窗用这个）；
 *                  inside 用来声明"除 container 外还有哪些元素算内部"（面板被 Teleport 的浮层必须传）
 */
export function useDismiss(
  visible: () => boolean,
  container: Ref<HTMLElement | null | undefined>,
  close: () => void,
  options: { outside?: boolean; inside?: () => Array<HTMLElement | null | undefined> } = {},
) {
  const entry: Entry = {
    visible,
    container,
    close,
    outside: options.outside ?? true,
    inside: options.inside,
    seq: 0,
  }

  // 挂载时就已打开的要先取号，否则 seq=0 会被当成"最老的那个"，Esc 永远轮不到它。
  watch(
    () => visible(),
    (value) => {
      if (value) entry.seq = ++openCounter
    },
    { immediate: true },
  )

  onMounted(() => {
    entries.add(entry)
    install()
  })

  onBeforeUnmount(() => {
    entries.delete(entry)
    uninstall()
  })
}
