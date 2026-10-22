import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive, ref } from 'vue'

/**
 * 设置页空态（T-50）：快捷键与常用功能面板本版**不提供**配置项，
 * 页面必须显示诚实文案（不许写「暂无数据」让人误以为加载失败）。
 */
vi.mock('@/stores/cloud', () => ({
  // queuedUnits 是 T-74 新加的状态（队列里等自动同步的条数），页面会读它
  useCloudStore: () => ({
    refresh: vi.fn(),
    refreshLive: vi.fn(),
    status: reactive({ autoSyncEnabled: false, pendingItems: [] }),
    queuedUnits: ref(0),
  }),
}))
vi.mock('@/stores/font-set', () => ({
  useFontSetStore: () => ({
    settings: {
      ztShowQuick: false,
      ztShowCustom: false,
      ztExpandMultiple: false,
      ztDefaultSize: [],
      ztDefaultLeading: [],
      ztDefaultTracking: [],
      appUnit: 'px',
    },
    load: vi.fn(async () => {}),
  }),
}))

const { default: SetPage } = await import('@/pages/set/index.vue')

beforeEach(() => setActivePinia(createPinia()))

describe('set 页面空态', () => {
  it('快捷键与常用功能面板都写明本版未提供配置', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })
    const text = wrapper.text()
    expect(text).toContain('当前版本未提供快捷键配置')
    expect(text).toContain('当前版本未提供常用功能面板配置')
    expect(text).not.toContain('暂无数据')
  })

  it('快捷键区的两个按钮仍可点（命令已注册）', () => {
    const wrapper = mount(SetPage, {
      global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    })
    const buttons = wrapper.findAll('button')
    const labels = buttons.map((b) => b.text())
    expect(labels.some((t) => t.includes('手动拷贝配置文件'))).toBe(true)
    expect(labels.some((t) => t.includes('刷新配置文件'))).toBe(true)
  })
})
