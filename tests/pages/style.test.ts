import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KuGroup, KuKind } from '@/domain/style-library'

/**
 * 三态测试：加载 / 空库 / 读失败（含重试）。
 *
 * 只 mock 数据入口 `readStyleLibrary`，store 与页面走真代码——
 * 这样测到的是"页面拿 loading/error/libraries 怎么渲染"，不是替身自己的行为。
 */
const repo = vi.hoisted(() => ({ read: vi.fn() }))

vi.mock('@/cep/data/style-library-repo', () => ({ readStyleLibrary: repo.read }))

const StylePage = (await import('@/pages/style/index.vue')).default

function libraries(overrides: Partial<Record<KuKind, KuGroup[]>> = {}): Record<KuKind, KuGroup[]> {
  return { color: [], gradient: [], font: [], style: [], ...overrides }
}

function snapshot(overrides: Partial<Record<KuKind, KuGroup[]>> = {}, degraded = '') {
  return {
    index: { index: 0, list: [{ name: '我的样式仓库' }] },
    libraries: libraries(overrides),
    degraded,
  }
}

let pinia: Pinia

function mountPage() {
  return mount(StylePage, { global: { plugins: [pinia] } })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  repo.read.mockReset()
})

describe('样式页三态', () => {
  it('加载态：读完之前显示正在读取', async () => {
    let release: (value: unknown) => void = () => {}
    repo.read.mockReturnValue(new Promise((resolve) => (release = resolve)))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-loading').exists()).toBe(true)

    release(snapshot())
    await flushPromises()
    expect(wrapper.find('.style-loading').exists()).toBe(false)
  })

  it('空库：四个库都没分组时显示空态，并保留仓库名', async () => {
    repo.read.mockResolvedValue(snapshot())

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('样式库还是空的')
    expect(wrapper.find('.style-warehouse').text()).toContain('我的样式仓库')
  })

  it('读失败：抛错时内联显示错误 + 重试按钮', async () => {
    repo.read.mockRejectedValue(new Error('磁盘读取失败'))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-error').exists()).toBe(true)
    expect(wrapper.find('.style-error').text()).toContain('磁盘读取失败')
    expect(wrapper.find('.style-retry').exists()).toBe(true)
  })

  it('读失败：降级信息（文件损坏）也算失败，不拿空库冒充"没有内容"', async () => {
    repo.read.mockResolvedValue(snapshot({}, 'sj_kuCol1.ini 读取失败'))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.style-error').text()).toContain('sj_kuCol1.ini 读取失败')
    expect(wrapper.text()).not.toContain('样式库还是空的')
  })

  it('重试：点重试重新读，成功后错误消失并显示库内容', async () => {
    repo.read.mockRejectedValueOnce(new Error('磁盘读取失败'))

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('.style-error').exists()).toBe(true)

    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
      }),
    )
    await wrapper.find('.style-retry').trigger('click')
    await flushPromises()

    expect(wrapper.find('.style-error').exists()).toBe(false)
    expect(wrapper.text()).toContain('灰白')
    expect(wrapper.find('.style-item__swatch').exists()).toBe(true)
  })

  it('四 tab：默认只显示颜色库，切到渐变后渲染渐变库', async () => {
    repo.read.mockResolvedValue(
      snapshot({
        color: [{ name: '灰白', show: true, items: [{ name: '未命名' }] }],
        gradient: [{ name: '渐变默认分组', show: true, items: [{ name: '未命名' }] }],
      }),
    )

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('灰白')
    expect(wrapper.text()).not.toContain('渐变默认分组')

    await wrapper.findAll('.g-tabs__label')[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('渐变默认分组')
    expect(wrapper.text()).not.toContain('灰白')
  })
})
