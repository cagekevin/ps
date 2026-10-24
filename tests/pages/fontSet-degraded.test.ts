import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * T-111 判据 A 的**页面那一半**：`/fontSet` 真的把 `store.degraded` 渲染出来。
 *
 * 与 `tests/stores/font-set-degraded.test.ts` 配合：那边从 `node:fs` 喂坏、验 store 的汇总；
 * 这边用**真 store**（同一个坏 fs 桥）挂整页，验"用户能在页面上看见"。
 * 两个文件合起来就是端到端：坏文件 → `degraded` 有值 → 页面文本里有它。
 *
 * 只把"与本次无关的重依赖"换成假的：字体列表（`stores/font`）与选区快照（`selection`）。
 */
const disk = vi.hoisted(() => ({ code: 'EPERM' }))

const fakeFs = {
  existsSync: () => {
    throw new Error('用例：实现不许再用 existsSync')
  },
  readFileSync: () => {
    throw Object.assign(new Error(`模拟 ${disk.code}`), { code: disk.code })
  },
  writeFileSync: () => undefined,
  mkdirSync: () => undefined,
  renameSync: () => undefined,
  unlinkSync: () => undefined,
}

function installBridges() {
  const w = window as unknown as { require?: (id: string) => unknown }
  w.require = (id: string) => {
    if (id === 'fs') return fakeFs
    if (id === 'path') return { join: (...parts: string[]) => parts.join('/'), dirname: () => '' }
    if (id === 'os') return { homedir: () => '/home/u' }
    throw new Error(`用例没准备 ${id}`)
  }
  const cep = window as unknown as {
    __adobe_cep__?: { evalScript: (script: string, cb: (res: string) => void) => void }
  }
  cep.__adobe_cep__ = {
    evalScript: (_script, cb) =>
      cb(disk.code === 'ENOENT' ? `${ERR_PREFIX}文件不存在: /x` : `${ERR_PREFIX}用例：jsx 不可用`),
  }
}

// `pick()` 在模块加载时按 `hasCep()` 定死实现，桥必须先进
installBridges()

// 与本次无关的重依赖：字体列表 + 选区快照。页面只为它们提供 props，不参与本判据
vi.mock('@/stores/font', async () => {
  const { ref } = await import('vue')
  return {
    useFontStore: () => ({
      tags: ref([]),
      stars: ref({}),
      loadTags: vi.fn(async () => {}),
      loadStars: vi.fn(async () => {}),
      fetchList: vi.fn(async () => []),
    }),
  }
})

vi.mock('@/selection/current-text', async () => {
  const { ref } = await import('vue')
  return {
    textInfoRef: ref(null),
    textInfoError: ref(''),
    typeUnitsRef: ref('TypeUnits.POINTS'),
    refreshTextInfo: vi.fn(async () => {}),
    refreshTypeUnits: vi.fn(async () => {}),
    startTextInfoWatch: vi.fn(async () => () => {}),
  }
})

const FontSetPage = (await import('@/pages/fontSet/index.vue')).default

beforeEach(() => {
  setActivePinia(createPinia())
  disk.code = 'EPERM'
  installBridges()
})

describe('/fontSet 的 degraded 槽（T-111）', () => {
  it('判据 A：读坏时页面文本里能看到"读取失败"', async () => {
    const wrapper = mount(FontSetPage, { global: { plugins: [createPinia()] } })
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.fontset__degraded').exists()).toBe(true)
    expect(wrapper.find('.fontset__degraded').text()).toContain('读取失败')
    wrapper.unmount()
  })

  it('判据 C：首次使用（ENOENT）时页面不显示这条提示', async () => {
    disk.code = 'ENOENT'

    const wrapper = mount(FontSetPage, { global: { plugins: [createPinia()] } })
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.fontset__degraded').exists()).toBe(false)
    wrapper.unmount()
  })
})
