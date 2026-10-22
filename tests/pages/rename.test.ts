import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RenamePreset } from '@/domain/rename'

/**
 * 重命名页的四个分支：加载中 / 空态 / 读失败（重试）/ 正常。
 *
 * 不测布局与坐标（jsdom 没有），只测"页面给出了什么 DOM、点了发什么命令"。
 * 表达式求值在 PS 侧，这里只断言我们传出去的字符串。
 */

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  rename: { batchName: vi.fn(), setLayerColor: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  env: { setEnv: vi.fn() },
  legacy: { call: vi.fn() },
}))

/** 可控的假仓库：让"读失败""空预设""读很慢"这三种分支都能被写出来 */
const repo = vi.hoisted(() => {
  const state = {
    value: [] as unknown,
    fail: false,
    /** true 时 read() 挂起，直到测试调用 release() */
    hold: false,
    release: () => {},
    listeners: new Set<(value: unknown) => void>(),
  }
  return state
})

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))
vi.mock('@/cep/data/rename', () => ({
  renameRepo: {
    read: async () => {
      if (repo.hold) await new Promise<void>((resolve) => (repo.release = resolve))
      if (repo.fail) throw new Error('预设文件损坏')
      return { value: JSON.parse(JSON.stringify(repo.value)) as unknown }
    },
    write: async (value: unknown) => {
      repo.value = value
      for (const listener of repo.listeners) listener(value)
    },
    update: async (mutator: (value: unknown) => unknown) => {
      const copy = JSON.parse(JSON.stringify(repo.value)) as unknown
      const result = mutator(copy)
      repo.value = result ?? copy
      for (const listener of repo.listeners) listener(repo.value)
      return repo.value
    },
    onChange: (listener: (value: unknown) => void) => {
      repo.listeners.add(listener)
      return () => repo.listeners.delete(listener)
    },
  },
}))

await import('@/commands')
const RenamePage = (await import('@/pages/rename/index.vue')).default
const { bindRenameData } = await import('@/stores/rename')

// 生产里由 main.ts 装配；命令写库后页面投影要能刷新
bindRenameData()

function seed(): RenamePreset {
  return [
    { name: '最近使用', show: false, list: ['%n背景层', '收%nn'] },
    { name: '序列', show: true, list: ['%n', '%%n'] },
  ]
}

let pinia: Pinia

async function mountPage() {
  const wrapper = mount(RenamePage, { global: { plugins: [pinia] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  repo.fail = false
  repo.hold = false
  repo.release = () => {}
  repo.value = seed()
})

/** 预设项 chip；`--add` 那个是「添加预设」按钮，不算预设 */
const CHIP = '.rename-chip:not(.rename-chip--add)'

describe('重命名页 · 正常态', () => {
  it('渲染分组与预设', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('最近使用')
    expect(wrapper.text()).toContain('序列')
    // 组 0 默认收起（种子数据 show:false），所以只渲染组 1 的两条
    expect(wrapper.findAll(CHIP)).toHaveLength(2)
    expect(wrapper.text()).toContain('%n')
  })

  it('点预设发出批量重命名，表达式原样透传 + 默认过滤子图层', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll(CHIP)[0].trigger('click')
    await flushPromises()

    expect(jsx.rename.batchName).toHaveBeenCalledWith('%n', true)
  })

  it('默认模式点应用按钮：空表达式只提示，不调 jsx', async () => {
    const wrapper = await mountPage()

    await wrapper.find('.rename-apply').trigger('click')
    await flushPromises()

    expect(jsx.rename.batchName).not.toHaveBeenCalled()
  })

  it('图层颜色：7 个色块 + 清除，点第 3 个传 3、点清除传 0', async () => {
    const wrapper = await mountPage()
    const swatches = wrapper.findAll('.rename-swatch')

    expect(swatches).toHaveLength(8)
    // 命令有 running 闸门，两次点击之间要让它跑完
    await swatches[2].trigger('click')
    await flushPromises()
    await swatches[7].trigger('click')
    await flushPromises()

    expect(jsx.rename.setLayerColor).toHaveBeenNthCalledWith(1, 3)
    expect(jsx.rename.setLayerColor).toHaveBeenNthCalledWith(2, 0)
  })

  it('组 0 没有右键菜单，组 1 有', async () => {
    const wrapper = await mountPage()
    const heads = wrapper.findAll('.base-group__head')

    await heads[0].trigger('contextmenu')
    expect(wrapper.find('.rename-menu').exists()).toBe(false)

    await heads[1].trigger('contextmenu')
    expect(wrapper.find('.rename-menu').exists()).toBe(true)
    expect(wrapper.find('.rename-menu').text()).toContain('创建新组')
    expect(wrapper.find('.rename-menu').text()).toContain('删除')
  })
})

describe('重命名页 · 空态 / 加载态 / 错误态', () => {
  it('没有任何分组时显示空态', async () => {
    repo.value = []
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('还没有重命名预设')
    expect(wrapper.findAll(CHIP)).toHaveLength(0)
  })

  it('读文件还没回来时显示加载中，回来后切换到正常态', async () => {
    repo.hold = true
    const wrapper = mount(RenamePage, { global: { plugins: [pinia] } })
    // onMounted 里的 load() 要到下一次渲染才体现，先等一个 tick
    await nextTick()

    expect(wrapper.text()).toContain('加载中')
    expect(wrapper.findAll(CHIP)).toHaveLength(0)

    repo.release()
    await flushPromises()

    expect(wrapper.text()).not.toContain('加载中')
    expect(wrapper.text()).toContain('序列')
  })

  it('读失败显示错误与重试按钮，重试成功后回到正常态', async () => {
    repo.fail = true
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('预设文件损坏')
    expect(wrapper.text()).toContain('重试')

    repo.fail = false
    const retry = wrapper.findAll('button').find((button) => button.text() === '重试')
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('序列')
    expect(wrapper.findAll(CHIP).length).toBeGreaterThan(0)
  })
})
