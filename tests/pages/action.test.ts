import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, storeToRefs, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readValue } from '../support/repo-read'

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

  it('底栏用公共 PageBottomBar（样式页同一份），图标按钮与竖线在位', async () => {
    const wrapper = await mountPage()

    const bar = wrapper.find('.g-bottom-bar')
    expect(bar.exists()).toBe(true)
    expect(bar.findAll('.g-bottom-bar__icon')).toHaveLength(4)
    expect(bar.findAll('.g-bottom-bar__divider')).toHaveLength(1)
    // 旧的页面私有底栏必须消失，否则就是两份皮肤
    expect(wrapper.find('.action-bottom').exists()).toBe(false)
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

  it('长按拖动同组动作：插后落点补偿一位（旧内联 splice 最容易错的分支）', async () => {
    const wrapper = await mountPage()
    const buttons = wrapper.findAll('.action-item__run')
    // 按钮顺序 = 修图：磨皮、锐化；新建：800
    vi.useFakeTimers()
    try {
      await buttons[0].trigger('mousedown', { ctrlKey: true })
      vi.advanceTimersByTime(350)
      // jsdom 的 offsetWidth 是 0，指针在任意正坐标都算目标右半 → 插后
      await buttons[1].trigger('mousemove', { clientX: 10 })
      document.dispatchEvent(new MouseEvent('mouseup'))
    } finally {
      vi.useRealTimers()
    }
    await flushPromises()

    const value = readValue(await actionLibraryRepo.read())
    expect(value[0].list.map((item) => item.name)).toEqual(['锐化', '磨皮'])
    wrapper.unmount()
  })

  it('空库显示空态', async () => {
    await actionLibraryRepo.write([])
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('还没有动作')
  })

  /**
   * TD-03-2：列数的投影只能经 store 的写入口改，落盘归命令。
   * 判据（可观察）：点「单列」之后 store 的 `listType` 变 1，且偏好里写的是原版 0/1/2 口径（单列 = 0）。
   * 用「单列」而不是「三列」：默认投影本来就是 3（`dzShowListType` 默认 2 + 1），
   * 点「三列」的断言在"投影压根没更新"时也会绿——那种断言测不到接线。
   */
  it('选「单列」→ 命令落盘 + store 投影更新（页面不自己改 ref）', async () => {
    const { getPref } = await import('@/cep/data/settings')
    const { useActionStore } = await import('@/stores/action')
    const wrapper = await mountPage()

    await wrapper.find('button[title="显示方式"]').trigger('click')
    const items = wrapper.findAll('.action-layout-menu button')
    expect(items.map((item) => item.text())).toEqual(['单列', '双列', '三列'])

    await items[0].trigger('click')
    await flushPromises()

    expect(useActionStore().listType).toBe(1)
    expect(getPref('dzShowListType', 2)).toBe(0)
    wrapper.unmount()
  })

  /**
   * TD-03-3：`listType` 的只读是**判据**，不是注释。
   *
   * TD-03-2 的"唯一写入口"只改了页面一处：store 仍导出可写 ref、页面仍 `storeToRefs` 取，
   * 把 `listType.value = columns` 改回去测试照样绿 ⇒ 判据没有执行者。
   *
   * 这里的 `@ts-expect-error` 是**反向断言**（不是绕过类型）：两行一旦能编译，说明有人
   * 把可写 ref 又导出了 ⇒ `npm run typecheck` 直接红。它盯的正是债里那两种形态：
   * ① `store.listType = …`（store 自己的出口）；② `storeToRefs(store).listType.value = …`
   * （页面拿到的那份）。运行时补一句：赋值不改值（只读 computed 只告警），投影只能经 `setListType`。
   */
  it('listType 只读：直写它编译期就红，且写不进值', async () => {
    const { useActionStore } = await import('@/stores/action')
    const store = useActionStore()
    const before = store.listType

    // @ts-expect-error TD-03-3：listType 是只读投影，store 外的唯一写入口是 setListType
    store.listType = 2
    // @ts-expect-error TD-03-3：storeToRefs 对只读 getter 给 ComputedRef，页面拿不到可写 ref
    storeToRefs(store).listType.value = 2

    expect(store.listType).toBe(before)
  })

  it('仓库触发器渲染当前仓库，点击展开下拉', async () => {
    const wrapper = await mountPage()
    const trigger = wrapper.find('.action-warehouse__trigger')

    expect(trigger.text()).toContain('默认仓库')
    await trigger.trigger('click')
    expect(wrapper.find('.action-warehouse__down').exists()).toBe(true)
  })
})
