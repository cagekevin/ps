import { describe, expect, it } from 'vitest'
import { computeFloatingPosition } from '@/composables/floating-position'

const viewport = { width: 340, height: 600 }
const options = { placement: 'bottom-start' as const, offset: 4, padding: 4 }

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, right: left + width, bottom: top + height, width, height }
}

describe('computeFloatingPosition', () => {
  it('空间足够时按 bottom-start 展开', () => {
    const result = computeFloatingPosition(
      rect(20, 100, 100, 26),
      { width: 100, height: 120 },
      viewport,
      options,
    )

    expect(result).toEqual({ left: 20, top: 130, placement: 'bottom-start' })
  })

  it('靠近右边时翻到 end', () => {
    const result = computeFloatingPosition(
      rect(300, 100, 30, 26),
      { width: 100, height: 120 },
      viewport,
      options,
    )

    expect(result.placement).toBe('bottom-end')
    expect(result.left).toBe(230)
  })

  it('靠近左边且原方向是 end 时翻回 start', () => {
    const result = computeFloatingPosition(
      rect(4, 100, 30, 26),
      { width: 100, height: 120 },
      viewport,
      {
        ...options,
        placement: 'bottom-end',
      },
    )

    expect(result.placement).toBe('bottom-start')
    expect(result.left).toBe(4)
  })

  it('底部空间不足时翻到 top', () => {
    const result = computeFloatingPosition(
      rect(20, 540, 100, 26),
      { width: 100, height: 120 },
      viewport,
      options,
    )

    expect(result.placement).toBe('top-start')
    expect(result.top).toBe(416)
  })

  it('上方优先：贴顶空间不够时翻到下方（T-60 的 .describe）', () => {
    const result = computeFloatingPosition(
      rect(20, 10, 26, 26),
      { width: 190, height: 80 },
      viewport,
      { placement: 'top-start', offset: 6, padding: 8 },
    )

    expect(result.placement).toBe('bottom-start')
    expect(result.top).toBe(42)
  })

  it('上方优先：右边界越界时内收，不翻到上方左侧', () => {
    const result = computeFloatingPosition(
      rect(300, 300, 26, 26),
      { width: 190, height: 80 },
      viewport,
      { placement: 'top-start', offset: 6, padding: 8 },
    )

    expect(result.placement).toBe('top-end')
    expect(result.left).toBe(136)
    expect(result.top).toBe(214)
  })

  it('翻转后仍超出时夹在视口内', () => {
    const result = computeFloatingPosition(
      rect(320, 10, 20, 20),
      { width: 400, height: 700 },
      viewport,
      options,
    )

    expect(result.left).toBe(4)
    expect(result.top).toBe(4)
  })
})
