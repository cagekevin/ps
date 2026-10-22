import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 2 }))

const jsx = vi.hoisted(() => ({
  action: { callAction: vi.fn(), getActionList: vi.fn() },
  font: { setFont: vi.fn(), initSystemList: vi.fn() },
  layer: { isSelectLayer: vi.fn(), getTypeNumber: vi.fn() },
  env: { setEnv: vi.fn() },
}))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx }))

await import('@/commands')
const ActionPage = (await import('@/pages/action/index.vue')).default
const { actionLibraryRepo } = await import('@/cep/data/actions')
const { bindActionData } = await import('@/stores/action')

// 命令写库后要能刷新投影（生产里由 main.ts 装配）
bindActionData()

const seed = [
  {
    groupName: '修图',
    show: true,
    list: [
      { group: '修图', name: '磨皮' },
      { group: '修图', name: '锐化', alias: '清晰' },
    ],
  },
  { groupName: '新建', show: true, list: [{ group: '新建', name: '800' }] },
]

let pinia: Pinia

async function mountPage() {
  const wrapper = mount(ActionPage, { global: { plugins: [pinia] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(async () => {
  // 必须先有 active pinia：写库会触发 bindActionData 的 onChange，回调里要取 store
  pinia = createPinia()
  setActivePinia(pinia)

  vi.clearAllMocks()
  jsx.action.callAction.mockResolvedValue(null)
  await actionLibraryRepo.write(JSON.parse(JSON.stringify(seed)))
})

describe('动作页', () => {
  it('渲染仓库、分组与动作，别名优先显示', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('默认仓库')
    expect(wrapper.text()).toContain('修图')
    expect(wrapper.text()).toContain('清晰')
    expect(wrapper.text()).not.toContain('锐化')
    expect(wrapper.findAll('.action-item__run')).toHaveLength(3)
  })

  it('点击动作调用 dz_callAction，传 group + name', async () => {
    const wrapper = await mountPage()
    const buttons = wrapper.findAll('.action-item__run')

    await buttons[0].trigger('click')
    await flushPromises()

    expect(jsx.action.callAction).toHaveBeenCalledWith({
      group: '修图',
      name: '磨皮',
      alias: undefined,
    })
  })

  it('空库显示空态', async () => {
    await actionLibraryRepo.write([])
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('还没有动作')
  })

  it('仓库触发器渲染当前仓库，点击展开下拉', async () => {
    const wrapper = await mountPage()
    const trigger = wrapper.find('.action-warehouse__trigger')

    expect(trigger.text()).toContain('默认仓库')
    await trigger.trigger('click')
    expect(wrapper.find('.action-warehouse__down').exists()).toBe(true)
  })
})
