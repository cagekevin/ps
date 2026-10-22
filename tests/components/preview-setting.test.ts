import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PreviewSetting from '@/pages/fontManage/components/PreviewSetting.vue'

function mountSetting(mode: 'none' | 'small' | 'medium' | 'large' | 'extra-large' = 'small') {
  return mount(PreviewSetting, {
    props: { mode },
    global: { stubs: { teleport: true } },
  })
}

describe('PreviewSetting', () => {
  it('两个图标按钮都有可读名字', () => {
    const wrapper = mountSetting()
    const labels = wrapper.findAll('.ps__icon').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual(['预览设置', '编辑预览文案'])
  })

  it('点眼睛展开档位卡片，五个档位都在', async () => {
    const wrapper = mountSetting()
    expect(wrapper.find('.ps__card').exists()).toBe(false)

    await wrapper.findAll('.ps__icon')[0].trigger('click')
    expect(wrapper.find('.ps__card').exists()).toBe(true)
    expect(wrapper.findAll('.ps__item')).toHaveLength(5)
    expect(wrapper.findAll('.ps__icon')[0].attributes('aria-expanded')).toBe('true')
  })

  it('选档位 emit update:mode 并收起卡片', async () => {
    const wrapper = mountSetting()
    await wrapper.findAll('.ps__icon')[0].trigger('click')

    const items = wrapper.findAll('.ps__item')
    await items[0].trigger('click')

    expect(wrapper.emitted('update:mode')?.[0]).toEqual(['none'])
    expect(wrapper.find('.ps__card').exists()).toBe(false)
  })

  it('当前档位有选中样式和勾', async () => {
    const wrapper = mountSetting('large')
    await wrapper.findAll('.ps__icon')[0].trigger('click')

    const active = wrapper.findAll('.ps__item').filter((i) => i.classes().includes('is-active'))
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('大预览')
    expect(active[0].find('.ps__check').exists()).toBe(true)
  })

  it('点 Aa 按钮 emit toggle-text', async () => {
    const wrapper = mountSetting()
    await wrapper.findAll('.ps__icon')[1].trigger('click')
    expect(wrapper.emitted('toggle-text')).toHaveLength(1)
  })
})
