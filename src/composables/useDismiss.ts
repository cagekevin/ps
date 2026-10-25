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
 * ## 唯一入口（`document` 上 `mousedown` / `keydown` 只允许有本文件这两行）
 *
 * **所有**弹窗、菜单、下拉、右键菜单、卡片都调它：
 * - 有开关态（`ref(false)` / `v-model`）：`useDismiss(() => open.value, 容器, close)`
 * - 面板被 `Teleport` 到 body：**必须**再传 `inside: () => [触发器, 面板]`，
 *   否则点触发器会被判成"点了外面"——先 close 再 toggle，表现为**点触发器关不掉**
 * - 遮罩自己负责关闭的弹窗：`{ outside: false }`，只接 Esc
 *
 * ## 两个手势语义不同，**不要改成一样**
 * - 点外部 ⇒ 关掉**所有**开着的浮层（取消整个浮层态，原生菜单同此）
 * - Esc   ⇒ 只关**最近打开的那一个**（逐层退出）
 *
 * ## 禁止 & 碰了会怎样（**结构上拦不住，只能靠这段注释**）
 * - 禁止在组件/composable/页面里再写 `document.addEventListener('mousedown' | 'keydown')`。
 *   DOM API 在类型层拦不住，没有 lint 规、也没有扫描测试（本仓不要那类闸）。
 * - 碰了会怎样：同一个 Esc 会有两条路各关各的 —— 一次按下去关掉两层，
 *   且谁先跑取决于挂载顺序（`usePopover` 历史上就是这么和本文件并存的，2026-10-25 已合并）。
 * - 也不许在这一层判"这个浮层该不该存在"（那是调用方的业务判断）；
 *   这里只回答"**点到外面了 / 按了 Esc**"，然后调它给的 `close`。
 *
 * ## "最上层"的判据
 * 是**打开序号 `seq`**，不是挂载顺序、也不是 z-index ——
 * 多入口并存（`Teleport` 到 body / 就地渲染）时，后两者与视觉层叠对不上。
 * 挂载时就已打开的 entry 必须取到号，否则 `seq=0` 会被当成最老的那个，Esc 永远轮不到它。
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
