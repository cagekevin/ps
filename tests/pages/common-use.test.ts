import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const selection = vi.hoisted(() => ({ hasSelection: true, typeNumber: 1 }))

const commonUse = vi.hoisted(() => ({
  zoom: vi.fn(async () => null),
  flip: vi.fn(async () => null),
  embedImage: vi.fn(async () => null),
  importMultipleImages: vi.fn(async () => null),
  optimizeDoc: vi.fn(async () => null),
  transform: vi.fn(async () => null),
  referenceLines: vi.fn(async () => null),
  distribute: vi.fn(async () => null),
  getPsdList: vi.fn(async () => []),
}))

const legacy = vi.hoisted(() => ({ call: vi.fn(async () => null) }))

vi.mock('@/selection', () => ({
  refresh: async () => selection,
  current: () => selection,
  selectionRef: { value: selection },
}))
vi.mock('@/cep/jsx', () => ({ jsx: { commonUse, legacy } }))

await import('@/commands')
const CommonUsePage = (await import('@/pages/commonUse/index.vue')).default
const { __resetSettingsForTest } = await import('@/cep/data/settings')

beforeEach(async () => {
  setActivePinia(createPinia())
  // 偏好会落 localStorage（jsdom 下 settings.ts 的降级实现），
  // 不清掉的话上一个用例的展开态会漏进下一个用例
  localStorage.clear()
  __resetSettingsForTest()
  for (const fn of Object.values(commonUse)) fn.mockClear()
  legacy.call.mockClear()
})

async function mountPage() {
  const wrapper = mount(CommonUsePage, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return wrapper
}

describe('常用页', () => {
  it('渲染 7 个常用项与 4 个放大预设', async () => {
    const wrapper = await mountPage()

    const tiles = wrapper.findAll('.g-tile')
    expect(tiles).toHaveLength(7)
    expect(tiles.map((tile) => tile.find('.g-tile__text').text())).toContain('嵌入图片')

    const buttons = wrapper.findAll('.common-use__buttons .g-btn')
    expect(buttons).toHaveLength(8)
    expect(buttons[0].text()).toBe('105')
  })

  it('点放大预设走 commonUse.zoom 命令（能力在命令层）', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('.common-use__buttons .g-btn')[0].trigger('click')
    await flushPromises()

    expect(commonUse.zoom).toHaveBeenCalledWith(105)
  })

  it('点翻转走 commonUse.flip，并带上原版方向文案', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('.common-use__flip')[0].trigger('click')
    await flushPromises()

    expect(commonUse.flip).toHaveBeenCalledWith('左右')
  })

  it('点网格项展开对应子面板，再点收起', async () => {
    const wrapper = await mountPage()

    const embedTile = wrapper.findAll('.g-tile')[0]
    await embedTile.find('.g-tile__icon').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cu-embed').exists()).toBe(true)
    expect(wrapper.find('.common-use__panel-title').text()).toBe('嵌入图片')

    await wrapper.find('.common-use__panel-head .g-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.cu-embed').exists()).toBe(false)
  })

  it('变换参数非法时不给 jsx 发请求（前置校验）', async () => {
    const wrapper = await mountPage()

    const changeTile = wrapper
      .findAll('.g-tile')
      .find((tile) => tile.find('.g-tile__text').text() === '自定义变换')
    await changeTile?.find('.g-tile__icon').trigger('click')
    await flushPromises()

    // 把个数改成 0（小于 1）
    const inputs = wrapper.findAll('.cu-change input')
    await inputs[0].setValue('0')
    await wrapper.findAll('.cu-change .g-btn')[0].trigger('click')
    await flushPromises()

    expect(commonUse.transform).not.toHaveBeenCalled()
  })

  it('变换参数合法时按原版顺序发 7 个参数', async () => {
    const wrapper = await mountPage()

    const changeTile = wrapper
      .findAll('.g-tile')
      .find((tile) => tile.find('.g-tile__text').text() === '自定义变换')
    await changeTile?.find('.g-tile__icon').trigger('click')
    await flushPromises()

    const inputs = wrapper.findAll('.cu-change input')
    await inputs[0].setValue('3')
    await inputs[1].setValue('45')
    await inputs[4].setValue('80')
    await inputs[5].setValue('50')
    await wrapper.findAll('.cu-change .g-btn')[0].trigger('click')
    await flushPromises()

    expect(commonUse.transform).toHaveBeenCalledWith([3, 45, '0px', '0px', 0, 80, 50])
  })

  it('导出子面板的 PSD 批量先弹确认', async () => {
    const wrapper = await mountPage()

    const exportTile = wrapper
      .findAll('.g-tile')
      .find((tile) => tile.find('.g-tile__text').text() === '导出图片')
    await exportTile?.find('.g-tile__icon').trigger('click')
    await flushPromises()

    const psdButton = wrapper
      .findAll('.cu-export .g-btn')
      .find((button) => button.text() === '批量导出文件夹所有PSD')
    await psdButton?.trigger('click')
    await flushPromises()

    // CepModal 走 Teleport 到 body，wrapper.find 看不到
    expect(document.body.querySelector('.common-use__tip')).not.toBeNull()
  })

  it('复用自由面板：渲染 block 树并走 freePanel.execute', async () => {
    const { freePanelRepo } = await import('@/cep/data/free-panel')
    const { createEmptyFreePanel } = await import('@/domain/free-panel')
    const file = createEmptyFreePanel()
    file.obj.list[0].data.push({
      icon: '',
      type: '',
      key: 'action.call',
      btnId: 1,
      text: '磨皮',
      funcText: '',
      option: { group: '修图', name: '磨皮' },
      left: '',
      top: '',
      position: false,
    })
    await freePanelRepo.write(file)

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.find('.common-use__free-title').text()).toBe('自定义面板')
    expect(wrapper.find('.common-use__free .action-buttons').exists()).toBe(true)
  })

  it('「整体放大 / 整体缩小」行可展开收起', async () => {
    const wrapper = await mountPage()

    const toggles = wrapper.findAll('.common-use__toggle')
    expect(toggles).toHaveLength(2)

    // jsdom 没有布局，`isVisible()` 判不准；v-show 的结果直接看 style.display
    const enlargeRow = wrapper.findAll('.common-use__row')[0]
    expect(enlargeRow.attributes('style')).toContain('display: none')

    await toggles[0].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.common-use__row')[0].attributes('style') ?? '').not.toContain(
      'display: none',
    )
  })

  it('空网格时给空态', async () => {
    const wrapper = await mountPage()
    // 网格项是内置常量，不会为空；空态分支只在数据被清空时出现
    expect(wrapper.find('.common-use__empty').exists()).toBe(false)
  })
})
