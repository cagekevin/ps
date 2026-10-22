// 是什么：长按拖拽 —— 原版 `am()`（`app.v4.js:37402-37532`）的共用复刻：300ms 长按进入拖拽态 + 克隆占位 + 浮层跟手 + 落点前/后布尔
// 替代了什么：HTML5 DnD（`ActionGrid` 的 `draggable` / `dragstart` / `dragover` / `drop`）；T-67 起三页已迁完
// 谁在用：`pages/style/index.vue`（四库项/组）、`pages/action/index.vue`（项/组）、`pages/rename/index.vue`（项/组）、`pages/freePanel/components/FreePanel.vue`（项，可跨 block）
// 禁止：不要和 HTML5 DnD 混用（`mousedown/mousemove/mouseup` 与 `dragstart/dragover/drop` 是两条链）；不要在这里认页面、库、分组

import { onBeforeUnmount } from 'vue'
import type { DropPosition } from '@/domain/reorder'

/** 原版 `am()` 的 `time` 默认值（`app.v4.js:37409`） */
const DEFAULT_TIME = 300
/** 原版启动后的第二个 `setTimeout(..., 50)`（`:37498`）：等 `before()` 引起的 DOM 变化落定再取落点 */
const SETTLE = 50
/** 浮层跟手偏移：原版 `event.clientX + 5 + ml`（`:37453`） */
const FLOAT_GAP = 5
/** 克隆占位用的标记类（原版 `:37447`，结束时按它找回来删掉，`:37466`） */
const DRAG_HIDDEN = 'drag-hidden'

export interface LongPressDragResult {
  /** 真的进入过拖拽态（原版 `v`）。`false` = 300ms 内抬起，按普通点击处理，什么都没改 */
  dragged: boolean
  /** 最后落到的候选节点；`null` = 全程没进过任何候选 */
  target: HTMLElement | null
  /** 插在目标前还是后（原版那个布尔 `_`，`:37442` 默认 `true`） */
  position: DropPosition
}

export interface LongPressDragOptions {
  /**
   * 触发拖拽的 mousedown 事件。
   * 原版 `am()` 的闸门是 `if (!event || Object(ft.f)())`（`:37418`）——`event` 是全局
   * `window.event`：同步调用时它一定在，所以等价于"必须按住 ctrl/meta"（`ft.f` = `:70624`
   * `window.event.ctrlKey || window.event.metaKey`）。`$nextTick` 里调用时它为空，闸门恒过，
   * 所以组拖拽把判断写在了调用点（`:50079` / `:56119`）——两处合起来就是"全都要按 ctrl/meta"。
   */
  event: MouseEvent
  /** 被拖节点（原版 `y = c || O`，`:37435`）：拖拽期间它自己就是浮层 */
  node: HTMLElement
  /** 落点候选。**函数**：原版在 `F()` 里才 `querySelectorAll(classval)`（`:37434`），即 `before()` 之后 */
  targets: () => HTMLElement[]
  /** 判定轴：`x` 横向（项，原版 `M`，`:37502`）/ `y` 纵向（组，原版 `L`，`:37517`） */
  axis: 'x' | 'y'
  /** 滚动容器：`y` 轴要 `clientY + scrollTop`（原版 `Qp(e)` + `S.scrollTop`，`:37521`） */
  scrollRoot?: HTMLElement | null
  /** 长按时长，原版 `time`（`:37409`） */
  time?: number
  /** 浮层横向偏移，原版 `ml`（`:37413`） */
  offsetX?: number
  /** 浮层纵向偏移，原版 `mt`（`:37415`） */
  offsetY?: number
  /**
   * 拖拽期间挂到节点上的类名。原版用 `floatStyle` 内联皮肤（组拖拽的蓝条 `:50093`），
   * 这里换成类名，颜色与尺寸仍走 token。
   */
  floatClass?: string
  /** 启动前回调，原版 `before`（`:37477`）：组拖拽用它把该组折叠（`show = false`） */
  before?: () => void
  /** 落点变化，原版 `drop` / `dragColorWrapDrop` 记 `moveEndIndex`，同时 `M`/`L` 改那个布尔 */
  onHover?: (target: HTMLElement, position: DropPosition) => void
  /** 结束，原版 `Callback(n)`（`:37463` 未拖动 / `:37471` 拖动过） */
  onEnd: (result: LongPressDragResult) => void
}

/** 原版 `Qp(t)`（`:37365-37373`）：沿 `offsetParent` 链累加 `offsetTop` */
function absoluteTop(element: HTMLElement): number {
  let top = element.offsetTop
  let parent = element.offsetParent as HTMLElement | null
  while (parent) {
    top += parent.offsetTop
    parent = parent.offsetParent as HTMLElement | null
  }
  return top
}

/** 原版 `Zp(t)`（`:37374-37382`）：沿 `offsetParent` 链累加 `offsetLeft` */
function absoluteLeft(element: HTMLElement): number {
  let left = element.offsetLeft
  let parent = element.offsetParent as HTMLElement | null
  while (parent) {
    left += parent.offsetLeft
    parent = parent.offsetParent as HTMLElement | null
  }
  return left
}

/** 原版 `tm(t, e)`（`:37383-37390`）：把节点插到 `e` 之后 */
function insertAfter(node: Node, target: HTMLElement): void {
  const parent = target.parentNode
  if (!parent) return
  if (parent.lastChild === target) parent.appendChild(node)
  else parent.insertBefore(node, target.nextSibling)
}

/** 原版 `em(t, e)`（`:37391-37394`）：把节点插到 `e` 之前 */
function insertBefore(node: Node, target: HTMLElement): void {
  target.parentNode?.insertBefore(node, target)
}

export function useLongPressDrag() {
  /** 当前这一轮的收尾函数；`null` = 没在拖 */
  let abort: (() => void) | null = null

  function cancel(): void {
    abort?.()
    abort = null
  }

  /**
   * 开始一次长按拖拽。返回 `false` = 没按 ctrl/meta，闸门没过，什么都没发生
   * （原版 `am()` 直接 return，连 `mouseup` 都不挂）。
   */
  function start(options: LongPressDragOptions): boolean {
    if (!(options.event.ctrlKey || options.event.metaKey)) return false
    cancel()

    const { node, axis } = options
    const offsetX = options.offsetX ?? 0
    const offsetY = options.offsetY ?? 0
    const floatClass = options.floatClass ?? ''

    // 原版在 `F()`（拖拽真正开始时）才存这三个，`before()` 引起的 DOM 变化要算进去（`:37436-37440`）
    let nodeCss = ''
    let paragraph: HTMLElement | null = null
    let paragraphCss = ''

    let clone: HTMLElement | null = null
    let bound: HTMLElement[] = []
    /** 原版 `v`：拖拽态已建立 */
    let started = false
    /** 原版 `g`：还在拖（`mouseup` 置 `false`，`:37459`） */
    let active = true
    /** 原版 `_`：插在目标前/后，`F()` 里默认 `true`（`:37442`） */
    let position: DropPosition = 'before'
    let target: HTMLElement | null = null
    let settleTimer: ReturnType<typeof setTimeout> | undefined

    function unbind(): void {
      for (const element of bound) element.onmousemove = null
      bound = []
    }

    function removeClone(): void {
      if (clone?.parentNode) clone.parentNode.removeChild(clone)
      clone = null
    }

    function restore(): void {
      node.style.cssText = nodeCss
      if (paragraph) paragraph.style.cssText = paragraphCss
      if (floatClass) node.classList.remove(floatClass)
    }

    /** 原版 `A()`（`:37452-37457`）：浮层跟手 + 浮层里的 `<p>` 变白 */
    function follow(event: MouseEvent): void {
      node.style.cssText = [
        nodeCss,
        `position: absolute`,
        `left:${event.clientX + FLOAT_GAP + offsetX}px`,
        `top:${event.clientY + FLOAT_GAP + offsetY}px`,
        `z-index: 999`,
      ]
        .filter(Boolean)
        .join(';')
      if (paragraph) paragraph.style.cssText = `${paragraphCss};color:#ffffff`
    }

    /** 原版 `F()`（`:37433-37451`）：存原样、造克隆占位、给每个候选挂落点判定 */
    function begin(): void {
      nodeCss = node.style.cssText
      paragraph = node.querySelector('p')
      paragraphCss = paragraph ? paragraph.style.cssText : ''

      clone = node.cloneNode(true) as HTMLElement
      clone.style.cssText = `${clone.style.cssText};opacity: 0;`
      clone.className += ` ${DRAG_HIDDEN}`
      clone.ondragstart = (event: DragEvent) => event.preventDefault()

      if (floatClass) node.classList.add(floatClass)

      // 原版把 `onmousemove` 挂在每个候选上，回调里读全局 `event.currentTarget`（`:37486-37491`）。
      // 这里直接把候选元素本身传进去，等价且不依赖全局 event。
      bound = options.targets()
      for (const element of bound)
        element.onmousemove = (event: MouseEvent) => hover(element, event)
    }

    /** 原版 `M()`（横向，`:37502-37516`）/ `L()`（纵向，`:37517-37531`）：判定插前还是插后，并挪克隆占位 */
    function hover(element: HTMLElement, event: MouseEvent): void {
      if (!active || !started || !clone) return

      const half = axis === 'y' ? element.offsetHeight / 2 : element.offsetWidth / 2
      const pointer =
        axis === 'y'
          ? event.clientY + (options.scrollRoot?.scrollTop ?? 0) - absoluteTop(element)
          : event.clientX - absoluteLeft(element)

      if (pointer > half) {
        position = 'after'
        insertAfter(clone, element)
      } else if (pointer < half) {
        position = 'before'
        insertBefore(clone, element)
      } else {
        // 原版两个分支都不走时什么都不做（`:37508-37514`）：位置与占位都保持上一次
        return
      }

      target = element
      options.onHover?.(element, position)
    }

    /** 原版 `j()`（`:37458-37474`）：抬起 */
    function finish(): void {
      active = false
      document.removeEventListener('mouseup', finish)

      if (!started) {
        clearTimeout(startTimer)
        clearTimeout(settleTimer)
        unbind()
        abort = null
        // 原版这里 `p(_)`，`_` 还是 `null`（`:37463`）→ 落点下标没变时是空操作。
        // 但 `moveEndIndex` 可能已被这 300ms 里的 `mousemove` 改过，照抄会让一次普通点击
        // 变成排序（`docs/规范/原版缺陷.md`：工程别照抄）。有意偏离：`dragged=false`，
        // 页面按普通点击处理，不写盘。
        options.onEnd({ dragged: false, target: null, position })
        return
      }

      removeClone()
      restore()
      document.removeEventListener('mousemove', follow)
      unbind()
      abort = null
      options.onEnd({ dragged: true, target, position })
    }

    // 原版两段定时：`time` 到点先跑 `before()`，再等 50ms 才建克隆并挂落点判定（`:37476-37498`）
    const startTimer = setTimeout(() => {
      options.before?.()
      settleTimer = setTimeout(() => {
        if (!active) return
        begin()
        document.addEventListener('mousemove', follow)
        started = true
      }, SETTLE)
    }, options.time ?? DEFAULT_TIME)

    document.addEventListener('mouseup', finish)

    abort = () => {
      active = false
      clearTimeout(startTimer)
      clearTimeout(settleTimer)
      document.removeEventListener('mousemove', follow)
      document.removeEventListener('mouseup', finish)
      if (started) {
        removeClone()
        restore()
      }
      unbind()
    }

    return true
  }

  onBeforeUnmount(cancel)

  return { start, cancel }
}
