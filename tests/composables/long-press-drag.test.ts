import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLongPressDrag, type LongPressDragResult } from '@/composables/useLongPressDrag'

/**
 * 长按拖拽 —— 原版 `am()`（`app.v4.js:37402-37532`）的复刻。
 *
 * 能真验的：300ms 长按门槛、第二段 50ms 延迟、浮层跟手坐标、`<p>` 变白、落点前/后判定、
 * 克隆占位插入位置、抬起后的还原与回调。**都在 jsdom + 假时钟里真跑**（`vi.useFakeTimers()`）。
 *
 * UNVERIFIED（jsdom 给不了，只能真机看）：
 * 1. `position:absolute` 的浮层在面板里落在哪 —— jsdom 不算布局，`left/top` 只是字符串；
 * 2. `offsetWidth/offsetHeight/offsetTop/offsetLeft` 的真实值 —— 这里全部用 `defineProperty` 假造；
 * 3. `.drag-hidden` 克隆占位撑开的空档视觉效果（原版靠 `opacity:0` 占位，没有 CSS 规则）。
 */
function setGeometry(
  element: HTMLElement,
  box: { left?: number; top?: number; width?: number; height?: number },
): void {
  Object.defineProperty(element, 'offsetLeft', { configurable: true, value: box.left ?? 0 })
  Object.defineProperty(element, 'offsetTop', { configurable: true, value: box.top ?? 0 })
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: box.width ?? 0 })
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: box.height ?? 0 })
}

/** 用一个宿主组件承载 composable，`onBeforeUnmount` 才不会在 setup 外调用 */
function useHost() {
  // **直接持有** composable 的返回值：不用从 `wrapper.vm` 里反射
  // （Vue 的 `vm` 类型里没有 expose 出来的成员 ⇒ 那条路必须转型）
  let drag: ReturnType<typeof useLongPressDrag> | undefined
  const host = defineComponent({
    setup() {
      drag = useLongPressDrag()
      return () => h('div')
    },
  })
  const wrapper = mount(host)
  if (!drag) throw new Error('宿主组件没挂上，拿不到 drag')
  return { wrapper, drag }
}

interface Fixture {
  node: HTMLElement
  paragraph: HTMLElement
  target: HTMLElement
  scrollRoot: HTMLElement
}

/** 一条被拖的项 + 一个落点候选；两者在**不同**父容器里，兄弟关系断言才干净 */
function buildFixture(): Fixture {
  const nodeParent = document.createElement('div')
  const targetParent = document.createElement('div')
  const node = document.createElement('div')
  const paragraph = document.createElement('p')
  const target = document.createElement('div')
  const scrollRoot = document.createElement('div')

  node.appendChild(paragraph)
  nodeParent.appendChild(node)
  targetParent.appendChild(target)
  document.body.append(nodeParent, targetParent, scrollRoot)

  setGeometry(node, { left: 0, top: 0, width: 25, height: 25 })
  setGeometry(target, { left: 0, top: 0, width: 25, height: 25 })
  setGeometry(scrollRoot, {})

  return { node, paragraph, target, scrollRoot }
}

describe('useLongPressDrag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('没有 ctrl/meta：start 返回 false，什么都不挂（原版 `am()` 的闸门 `:37418`）', () => {
    const { drag } = useHost()
    const { node, target } = buildFixture()
    const onEnd = vi.fn()

    const started = drag.start({
      event: new MouseEvent('mousedown'),
      node,
      targets: () => [target],
      axis: 'x',
      onEnd,
    })

    expect(started).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(node.style.cssText).toBe('')
    expect(document.querySelector('.drag-hidden')).toBeNull()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('300ms 内抬起 = 普通点击：不进拖拽态、不改样式、回调 dragged=false', () => {
    const { drag } = useHost()
    const { node, target } = buildFixture()
    const results: LongPressDragResult[] = []

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      onEnd: (result) => results.push(result),
    })

    vi.advanceTimersByTime(299)
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(node.style.cssText).toBe('')
    expect(document.querySelector('.drag-hidden')).toBeNull()
    expect(results).toEqual([{ dragged: false, target: null, position: 'before' }])
  })

  it('300ms 到点后还要等 50ms 才建克隆（原版 `:37476-37498` 的两段 setTimeout）', () => {
    const { drag } = useHost()
    const { node, target } = buildFixture()

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      onEnd: vi.fn(),
    })

    vi.advanceTimersByTime(300)
    // 第一段到点：只跑 before()，还没克隆、还没挂 mousemove
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    expect(node.style.cssText).toBe('')

    vi.advanceTimersByTime(50)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    expect(node.style.cssText).toContain('position: absolute')
  })

  it('浮层跟手：left = clientX + 5 + ml、top = clientY + 5 + mt、z-index 999；<p> 变白', () => {
    const { drag } = useHost()
    const { node, paragraph: p, target } = buildFixture()

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      offsetX: -40,
      onEnd: vi.fn(),
    })

    vi.advanceTimersByTime(350)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))

    // jsdom 的 CSSOM 会重排 `left:65px` → `left: 65px`、`#ffffff` → `rgb(255, 255, 255)`，
    // 所以断言取值而不是原始串
    expect(node.style.position).toBe('absolute')
    expect(node.style.left).toBe('65px')
    expect(node.style.top).toBe('55px')
    expect(node.style.zIndex).toBe('999')
    expect(p.style.color).toBe('rgb(255, 255, 255)')
  })

  it('落点判定：指针在左半 → 插到目标前；右半 → 插到目标后（原版 `M`，`:37502`）', () => {
    const { drag } = useHost()
    const { node, target } = buildFixture()
    const hovers: string[] = []

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      onHover: (_element, position) => hovers.push(position),
      onEnd: vi.fn(),
    })

    vi.advanceTimersByTime(350)

    // 目标 25px 宽，中线 12.5
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 0, bubbles: true }))
    const clone = document.querySelector('.drag-hidden')
    expect(clone).not.toBeNull()
    // 插前：克隆紧挨在目标前面
    expect(clone?.nextSibling).toBe(target)
    expect(clone?.previousSibling).toBeNull()

    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 0, bubbles: true }))
    // 插后：克隆紧挨在目标后面
    expect(clone?.previousSibling).toBe(target)
    expect(clone?.nextSibling).toBeNull()

    expect(hovers).toEqual(['before', 'after'])
  })

  it('纵向（组拖拽）：用 clientY + scrollTop 判定，且克隆里带着被拖节点', () => {
    const { drag } = useHost()
    const { node, target, scrollRoot } = buildFixture()
    setGeometry(target, { left: 0, top: 100, width: 200, height: 22 })
    scrollRoot.scrollTop = 10
    node.appendChild(document.createElement('span'))
    const hovers: string[] = []

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'y',
      scrollRoot,
      floatClass: 'is-floating',
      onHover: (_element, position) => hovers.push(position),
      onEnd: vi.fn(),
    })

    vi.advanceTimersByTime(350)
    expect(node.classList.contains('is-floating')).toBe(true)

    // 105 + 10 - 100 = 15 > 11（中线）
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 105, bubbles: true }))
    expect(hovers).toEqual(['after'])
    // 克隆是整棵子树的深拷贝：`<p>`（fixture 自带）+ 这里追加的 `<span>`
    expect(document.querySelector('.drag-hidden span')).not.toBeNull()
  })

  it('抬起：删克隆、还原 cssText 与浮层类、回调带落点与位置', () => {
    const { drag } = useHost()
    const { node, paragraph: p, target } = buildFixture()
    node.style.width = '25px'
    p.style.fontSize = '12px'
    const nodeCss = node.style.cssText
    const paragraphCss = p.style.cssText
    const results: LongPressDragResult[] = []

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      floatClass: 'is-floating',
      onEnd: (result) => results.push(result),
    })

    vi.advanceTimersByTime(350)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 0, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(document.querySelector('.drag-hidden')).toBeNull()
    expect(node.style.cssText).toBe(nodeCss)
    expect(p.style.cssText).toBe(paragraphCss)
    expect(node.classList.contains('is-floating')).toBe(false)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ dragged: true, target, position: 'after' })
  })

  it('cancel()：拖到一半卸载也不留下克隆与监听', () => {
    const { drag, wrapper } = useHost()
    const { node, target } = buildFixture()

    drag.start({
      event: new MouseEvent('mousedown', { ctrlKey: true }),
      node,
      targets: () => [target],
      axis: 'x',
      onEnd: vi.fn(),
    })

    vi.advanceTimersByTime(350)
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 0, bubbles: true }))
    expect(document.querySelector('.drag-hidden')).not.toBeNull()

    wrapper.unmount()
    expect(document.querySelector('.drag-hidden')).toBeNull()
    expect(node.style.cssText).toBe('')
  })
})
