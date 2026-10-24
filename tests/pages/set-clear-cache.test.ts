import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { formatBytes } from '@/pages/set/cache-format'

/**
 * 缓存占用的格式化（纯函数）+ 清缓存弹窗的只读约束（T-68）：
 * 清理与上限都必须是 disabled——删除范围没有一手证据，误删 = 丢用户库。
 */
describe('formatBytes', () => {
  it('按 1024 进制并去掉多余的 .0', () => {
    expect(formatBytes(0)).toBe('0B')
    expect(formatBytes(1023)).toBe('1023B')
    expect(formatBytes(1024)).toBe('1KB')
    expect(formatBytes(1536 * 1024)).toBe('1.5MB')
    expect(formatBytes(3 * 1024 ** 3)).toBe('3GB')
  })

  it('负数与非有限值给占位符，不显示 0', () => {
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('ClearCacheDialog 只读', () => {
  it('清理缓存与上限下拉都是 disabled，且不显示自拟档位', async () => {
    vi.resetModules()
    vi.doMock('@/cep/fs', () => ({
      dirUsage: () => ({ bytes: 1536 * 1024, files: 3, skipped: 0 }),
      userDir: () => '/tmp/x',
    }))
    const { default: ClearCacheDialog } =
      await import('@/pages/set/components/ClearCacheDialog.vue')

    const wrapper = mount(ClearCacheDialog, {
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()

    const clear = document.querySelector<HTMLButtonElement>('.cache__clear')!
    expect(clear.disabled).toBe(true)
    expect(clear.textContent).toContain('清理缓存')

    const limit = document.querySelector<HTMLButtonElement>('.cache__limit .select-box__content')!
    // SelectBox 的禁用态在触发器按钮上
    expect(limit.disabled).toBe(true)
    expect(limit.textContent).toContain('未设置')
    expect(document.querySelector('.cache__value')?.textContent).toBe('1.5MB')

    wrapper.unmount()
    vi.doUnmock('@/cep/fs')
  })

  it('Node 不可用（读不到目录）时显示「无法读取」，不显示 0B', async () => {
    vi.resetModules()
    vi.doMock('@/cep/fs', () => ({
      dirUsage: () => null,
      userDir: () => {
        throw new Error('NO_NODE')
      },
    }))
    const { default: ClearCacheDialog } =
      await import('@/pages/set/components/ClearCacheDialog.vue')

    const wrapper = mount(ClearCacheDialog, {
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()

    expect(document.querySelector('.cache__value')?.textContent).toBe('无法读取')
    wrapper.unmount()
    vi.doUnmock('@/cep/fs')
  })
})
