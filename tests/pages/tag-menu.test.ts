import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import TagMenu from '@/pages/fontManage/components/TagMenu.vue'
import TagContextMenu from '@/pages/fontManage/components/TagContextMenu.vue'
import type { FontTag } from '@/cep/types'

const tags: FontTag[] = [
  { text: '收藏', arr: ['MiSans'], xz: false },
  { text: '免费', arr: [], xz: false },
]

function mountMenu(active: string[] = ['收藏']) {
  return mount(TagMenu, {
    props: { visible: true, x: 0, y: 0, tags, active },
    global: { stubs: { teleport: true } },
  })
}

describe('TagContextMenu', () => {
  it('按官方顺序渲染删除 / 重命名，并关闭后发事件', async () => {
    const wrapper = mount(TagContextMenu, {
      props: { visible: true, x: 10, y: 10 },
      global: { stubs: { teleport: true } },
    })

    const items = wrapper.findAll('.font-manage__user-tag-overlay div')
    expect(items.map((item) => item.text())).toEqual(['删除', '重命名'])

    await items[0].trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])

    await items[1].trigger('click')
    expect(wrapper.emitted('rename')).toHaveLength(1)
  })
})

describe('TagMenu', () => {
  it('分「已添加」和「全部」两段，数量对得上', () => {
    const wrapper = mountMenu()
    const text = wrapper.text()
    expect(text).toContain('已添加的标签(1)')
    expect(text).toContain('全部(2)')
    expect(wrapper.findAll('.tm__chip')).toHaveLength(2)
  })

  it('输入已有标签回车 → 切换（不新建）', async () => {
    const wrapper = mountMenu([])
    const input = wrapper.find('.tag-input__field')
    await input.setValue('免费')
    // setValue 后清空按钮出现，Vue 重建了 input 节点 → 必须重新查，否则触发的是已脱离 DOM 的旧节点
    await wrapper.find('.tag-input__field').trigger('keydown.enter')

    expect(wrapper.emitted('toggle')?.[0]).toEqual(['免费'])
    expect(wrapper.emitted('create')).toBeUndefined()
    // 提交后输入被清空：清空按钮跟着消失（比读 DOM value 稳）
    await nextTick()
    expect(wrapper.find('.tag-input__clear').exists()).toBe(false)
  })

  it('输入新名字回车 → 新建', async () => {
    const wrapper = mountMenu([])
    const input = wrapper.find('.tag-input__field')
    await input.setValue('新标签')
    await wrapper.find('.tag-input__field').trigger('keydown.enter')

    expect(wrapper.emitted('create')?.[0]).toEqual(['新标签'])
  })

  it('空输入或纯空格回车不发事件', async () => {
    const wrapper = mountMenu([])
    const input = wrapper.find('.tag-input__field')
    await input.setValue('   ')
    await wrapper.find('.tag-input__field').trigger('keydown.enter')
    expect(wrapper.emitted('toggle')).toBeUndefined()
    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('点已有 chip 切换标签', async () => {
    const wrapper = mountMenu()
    await wrapper.findAll('.tm__chip')[0].trigger('click')
    expect(wrapper.emitted('toggle')?.[0]).toEqual(['收藏'])
  })

  it('输入框限 8 个字，输入后出现清空按钮', async () => {
    const wrapper = mountMenu([])
    expect(wrapper.find('.tag-input__field').attributes('maxlength')).toBe('8')

    expect(wrapper.find('.tag-input__clear').exists()).toBe(false)
    await wrapper.find('.tag-input__field').setValue('abc')
    expect(wrapper.find('.tag-input__clear').exists()).toBe(true)

    await wrapper.find('.tag-input__clear').trigger('click')
    expect((wrapper.find('.tag-input__field').element as HTMLInputElement).value).toBe('')
  })
})
