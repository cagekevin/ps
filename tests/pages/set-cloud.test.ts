import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import type { CloudStatus, PendingChange } from '@/cloud/types'

/**
 * 设置页云同步区（T-74 状态 + T-78 手动拉取）。
 *
 * 钉住四件事：
 * 1. 三样状态都显示，且「待推送」与「冲突」不是一个数；
 * 2. 冲突与"没配置"的文案不一样；
 * 3. 按钮开确认框，确认框写明"覆盖本机 / 会丢"；
 * 4. 点确认才真的调 cloud.download（并且带 onConfirm，由确认框负责）。
 */
const cloudState = vi.hoisted(() => ({
  status: null as unknown as CloudStatus,
  queuedUnits: null as unknown as ReturnType<typeof ref<number>>,
}))

const calls = vi.hoisted(() => [] as Array<{ id: string; payload: unknown }>)

vi.mock('@/stores/cloud', () => ({
  useCloudStore: () => ({
    refresh: vi.fn(),
    refreshLive: vi.fn(),
    status: reactive(cloudState.status),
    queuedUnits: cloudState.queuedUnits,
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

vi.mock('@/components/command/useCommand', async () => {
  const vue = await import('vue')
  return {
    useCommand: (id: string) => ({
      command: undefined,
      disabled: vue.computed(() => false),
      running: vue.ref(false),
      run: async (payload?: unknown) => {
        calls.push({ id, payload })
        return true
      },
    }),
  }
})

const { default: SetPage } = await import('@/pages/set/index.vue')

function status(over: Partial<CloudStatus> = {}): CloudStatus {
  return {
    configured: true,
    autoSyncEnabled: true,
    hasLedger: true,
    rev: 4,
    syncedAt: 0,
    localHash: 'h',
    pending: 0,
    pendingItems: [],
    ...over,
  }
}

function conflict(unit: string): PendingChange {
  return { unit, at: 1, reason: 'conflict' }
}

let wrapper: VueWrapper | null = null

function mountPage() {
  wrapper = mount(SetPage, {
    global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    attachTo: document.body,
  })
  return wrapper
}

function clickByText(text: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
    item.textContent?.includes(text),
  )
  expect(button, `找不到按钮：${text}`).toBeTruthy()
  button!.click()
}

beforeEach(() => {
  setActivePinia(createPinia())
  calls.length = 0
  cloudState.status = status()
  cloudState.queuedUnits = ref(0)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('设置页 · 云同步状态（T-74）', () => {
  it('没同步过时写「尚未同步」，待推送为 0 时写「无」', () => {
    const page = mountPage()

    expect(page.text()).toContain('上次同步')
    expect(page.text()).toContain('尚未同步')
    expect(page.text()).toContain('待推送')
    expect(page.text()).toContain('无')
  })

  it('待推送（队列）与冲突同时存在时，两个数分开显示', () => {
    cloudState.status = status({
      pending: 2,
      pendingItems: [conflict('font.tags'), conflict('action.library')],
    })
    cloudState.queuedUnits = ref(3)

    const text = mountPage().text()

    expect(text).toContain('3 项（等下一次自动同步）')
    expect(text).toContain('2 项 —— 云端和本地都改过，需要你决定保留哪边')
  })

  it('「没配置地址」的提示与「冲突」提示互斥，不混成一句', () => {
    cloudState.status = status({ configured: false })
    const notConfigured = mountPage().text()
    expect(notConfigured).toContain('没设置同步地址')
    expect(notConfigured).not.toContain('都改过')
    wrapper?.unmount()

    cloudState.status = status({ pendingItems: [conflict('font.tags')] })
    const conflictText = mountPage().text()
    expect(conflictText).toContain('都改过')
    expect(conflictText).not.toContain('没设置同步地址')
  })

  it('自动同步关着时明说改动只在本地', () => {
    cloudState.status = status({ autoSyncEnabled: false, hasLedger: true })
    expect(mountPage().text()).toContain('自动同步已关闭')
  })
})

describe('设置页 · 从云端拉取（T-78）', () => {
  it('点按钮先出确认框，确认框写明覆盖本地、会丢本地改动', async () => {
    cloudState.queuedUnits = ref(2)
    mountPage()

    clickByText('从云端拉取')
    await nextTick()
    await nextTick()

    const body = document.body.textContent ?? ''
    expect(document.querySelector('.modal')).toBeTruthy()
    expect(body).toContain('覆盖本机现有的同类数据')
    expect(body).toContain('本机还没推上去的改动会被覆盖丢失')
    expect(body).toContain('2 项')

    // 还没确认：不许发请求
    expect(calls.some((item) => item.id === 'cloud.download')).toBe(false)
  })

  it('确认后才调 cloud.download，并带 onConfirm（覆盖已在框里说清）', async () => {
    mountPage()

    clickByText('从云端拉取')
    await nextTick()
    await nextTick()

    document.querySelector<HTMLButtonElement>('.modal__btn.is-primary')!.click()
    await nextTick()

    const call = calls.find((item) => item.id === 'cloud.download')
    expect(call).toBeTruthy()
    const payload = call!.payload as { onConfirm?: () => Promise<boolean> }
    await expect(payload.onConfirm?.()).resolves.toBe(true)
  })

  it('取消不发请求', async () => {
    mountPage()

    clickByText('从云端拉取')
    await nextTick()
    await nextTick()

    const cancel = [...document.querySelectorAll<HTMLButtonElement>('.modal__btn')].find(
      (button) => button.textContent?.trim() === '取消',
    )
    cancel!.click()
    await nextTick()

    expect(calls.some((item) => item.id === 'cloud.download')).toBe(false)
  })
})
