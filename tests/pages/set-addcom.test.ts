import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import AddcomDialog from '@/pages/set/components/AddcomDialog.vue'
import { PRESET_COUNT_MESSAGE } from '@/domain/font-preset-text'

/**
 * `addcom` 弹窗（T-68）。CepModal 走 Teleport，断言一律查 document。
 * 测的是：打开时的文本、非法时拒绝提交且不关窗、合法时 emit 数组、重置、关闭。
 */
function mountDialog(text: string) {
  return mount(AddcomDialog, {
    props: { visible: true, title: '配置字号', text },
    attachTo: document.body,
  })
}

function textarea() {
  return document.querySelector<HTMLTextAreaElement>('.addcom__textarea')!
}

function okButton() {
  return document.querySelector<HTMLButtonElement>('.modal__btn.is-primary')!
}

describe('addcom 弹窗', () => {
  it('打开时把父级给的文本填进输入框', async () => {
    const wrapper = mountDialog('6,8,10,11,12,14\n16,18')
    await nextTick()
    expect(textarea().value).toBe('6,8,10,11,12,14\n16,18')
    wrapper.unmount()
  })

  it('个数不合法时点确定：显示原版文案、不提交、弹窗不关', async () => {
    const wrapper = mountDialog('')
    await nextTick()
    textarea().value = '1,2,3'
    textarea().dispatchEvent(new Event('input'))
    await nextTick()

    okButton().click()
    await nextTick()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(document.querySelector('.modal')).not.toBeNull()
    expect(document.querySelector('.addcom__err')?.textContent).toBe(PRESET_COUNT_MESSAGE)
    wrapper.unmount()
  })

  it('合法时点确定：emit 数值数组并允许关窗', async () => {
    const wrapper = mountDialog('')
    await nextTick()
    textarea().value = '6,8,10,11,12,14'
    textarea().dispatchEvent(new Event('input'))
    await nextTick()

    okButton().click()
    await nextTick()

    expect(wrapper.emitted('submit')?.[0]).toEqual([[6, 8, 10, 11, 12, 14]])
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
    wrapper.unmount()
  })

  it('重置回到打开时的文本', async () => {
    const wrapper = mountDialog('6,8,10,11,12,14')
    await nextTick()
    textarea().value = '9,9,9'
    textarea().dispatchEvent(new Event('input'))
    await nextTick()

    document.querySelector<HTMLButtonElement>('.addcom__reset')!.click()
    await nextTick()

    expect(textarea().value).toBe('6,8,10,11,12,14')
    wrapper.unmount()
  })

  it('取消直接关窗（非法文本也允许放弃）', async () => {
    const wrapper = mountDialog('')
    await nextTick()
    textarea().value = '1'
    textarea().dispatchEvent(new Event('input'))
    await nextTick()

    document.querySelectorAll<HTMLButtonElement>('.modal__btn')[0]!.click()
    await nextTick()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
    wrapper.unmount()
  })
})
