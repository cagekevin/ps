import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

/**
 * TD-18-1：`/seBan` 必须把 store 的 `degraded` 说到用户眼前。
 *
 * 改造前：store 有 `error`（两个数据文件都读不到）与 `degraded`（只坏一个 / 有条目认不出），
 * 而页面只渲染 `error` ⇒ 只坏一个时**一句提示都没有**，用户"存了 16 条显示 15 条"也查不出来。
 *
 * 这里用**真 store** + 假的磁盘（`@/cep/fs`），端到端钉三件事：
 * 1. 只坏一个文件 → 页面出现提示，且**另一个文件的色点照常渲染**（不是整页失败）；
 * 2. 读全了 → 提示**消失**（提示跟"这一次读的结果"绑定，不是常驻文案）；
 * 3. 两个都坏 → 仍走原来的整页 `error` 分支（行为不变，反向对照）。
 *
 * 只钉可观察结果（页面文本 / 色点数量），不测布局。
 */
const fsMock = vi.hoisted(() => ({
  files: new Map<string, string>(),
}))

vi.mock('@/cep/node', () => ({
  hasNode: () => true,
}))

vi.mock('@/cep/paths', () => ({
  userDir: () => 'ROAM/SheJiZhuLi',
}))

vi.mock('@/cep/fs-read', () => ({
  readTextOutcome: async (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  readTextSync: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined ? { status: 'notSeen' as const } : { status: 'ok' as const, text }
    },
  writeTextFileAtomic: (path: string, text: string) => {
      fsMock.files.set(path, text)
      return true
    },
  writeTextFile: (path: string, text: string) => {
      fsMock.files.set(path, text)
    },
  readBase64Outcome: (path: string) => {
      const text = fsMock.files.get(path)
      return text === undefined
        ? { status: 'notSeen' as const }
        : { status: 'ok' as const, base64: Buffer.from(text).toString('base64') }
    },
  writeBase64File: (path: string, base64: string) => {
      fsMock.files.set(path, Buffer.from(base64, 'base64').toString('utf8'))
      return true
    },
  removeFile: (path: string) => {
      fsMock.files.delete(path)
      return { ok: true as const }
    },
}))

vi.mock('@/cep/codec', () => ({
  b64ToUtf8: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
  utf8ToB64: (text: string) => Buffer.from(text, 'utf8').toString('base64'),
}))

/** 真实宿主事件桥在 jsdom 里不存在，换成手动可触发的表 */
vi.mock('@/cep/events', () => ({
  APP_EVENT_SEBAN: 'com.fengzi.event.seban',
  onAppEvent: () => () => undefined,
}))

/** 命令层与本次判据无关，换成假的（只关心"点了发哪条命令"） */
vi.mock('@/components/command/useCommand', () => ({
  useCommand: () => ({ invoke: vi.fn(), disabled: { value: false }, running: { value: false } }),
}))

const { default: SeBanPage } = await import('@/pages/seBan/index.vue')
const { default: SwatchDot } = await import('@/pages/seBan/components/SwatchDot.vue')

const CUSTOM = 'ROAM/FengZiSeBan/userColor.ini'
const RECENT = 'ROAM/FengZiSeBan/vecently.ini'
const LIMIT = 'ROAM/FengZiSeBan/zuiJinShuLiang.txt'

const RED = { name: '未命名', color: { hex: 'FF0000', c: 0, m: 100, y: 100, k: 0 } }

beforeEach(() => {
  setActivePinia(createPinia())
  fsMock.files.clear()
})

async function mountPage() {
  const wrapper = mount(SeBanPage)
  await flushPromises()
  return wrapper
}

describe('/seBan：读不全时必须说得出', () => {
  it('只坏一个数据文件 → 页面显示提示（少了哪一组、为什么），另一个文件的色点照常渲染', async () => {
    fsMock.files.set(CUSTOM, '{坏掉的')
    fsMock.files.set(RECENT, JSON.stringify([RED]))

    const wrapper = await mountPage()

    const hint = wrapper.find('.strip__error')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('自定义色读取失败')
    // 说的是"哪一组读不到"，不是笼统的"部分数据异常"
    expect(hint.text()).toContain('自定义色')
    // 不是整页失败：最近色照常渲染
    expect(wrapper.findAllComponents(SwatchDot)).toHaveLength(1)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('有条目认不出 → 提示里写清少了几条', async () => {
    fsMock.files.set(
      CUSTOM,
      JSON.stringify([RED, { name: '没有 color' }, { name: '坏 hex', color: { hex: 'zzz' } }]),
    )

    const wrapper = await mountPage()

    expect(wrapper.find('.strip__error').text()).toContain('2 条认不出')
    wrapper.unmount()
  })

  it('读全了 → 没有任何提示（提示跟这一次读的结果绑定，不是常驻文案）', async () => {
    fsMock.files.set(CUSTOM, JSON.stringify([RED]))
    fsMock.files.set(RECENT, JSON.stringify([RED]))
    fsMock.files.set(LIMIT, '10')

    const wrapper = await mountPage()

    expect(wrapper.find('.strip__error').exists()).toBe(false)
    expect(wrapper.findAllComponents(SwatchDot)).toHaveLength(2)
    wrapper.unmount()
  })

  it('先坏后好：提示跟着跃迁走（修好后自己消失）', async () => {
    fsMock.files.set(CUSTOM, '{坏掉的')
    fsMock.files.set(RECENT, JSON.stringify([RED]))

    const wrapper = await mountPage()
    expect(wrapper.find('.strip__error').exists()).toBe(true)

    // 文件被外部修好 → 重读 → 提示消失
    fsMock.files.set(CUSTOM, JSON.stringify([RED]))
    await wrapper.find('.strip__retry').trigger('click')
    await flushPromises()

    expect(wrapper.find('.strip__error').exists()).toBe(false)
    expect(wrapper.findAllComponents(SwatchDot)).toHaveLength(2)
    wrapper.unmount()
  })
})

describe('/seBan：反向对照（整页失败的行为不许变）', () => {
  it('两个数据文件都读不到 → 仍走 error 分支（role=alert + 重试按钮），不显示降级提示', async () => {
    fsMock.files.set(CUSTOM, '{坏掉的')
    fsMock.files.set(RECENT, '不是数组')

    const wrapper = await mountPage()

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('自定义色读取失败')
    expect(wrapper.find('.strip__retry').exists()).toBe(true)
    // 整页失败时色点不渲染（改前行为）
    expect(wrapper.findAllComponents(SwatchDot)).toHaveLength(0)
    wrapper.unmount()
  })
})
