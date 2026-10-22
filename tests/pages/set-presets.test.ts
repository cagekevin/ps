import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'

/**
 * 设置页「字体面板」三组预设（T-68）：原来是三个只能存单值的输入框，
 * 原版是三个按钮开 `addcom` 数组弹窗。这里钉住：按钮存在、打开时带当前数组、
 * 保存失败要回滚（P0 级：静默写丢用户预设）。
 */
const settings = reactive({
  ztShowQuick: false,
  ztShowCustom: false,
  ztExpandMultiple: false,
  ztDefaultSize: [6, 8, 10, 11, 12, 14, 16, 18],
  ztDefaultLeading: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
  ztDefaultTracking: [-100, -50, -25, 0, 25, 50],
  appUnit: 'px',
})

vi.mock('@/stores/cloud', () => ({
  useCloudStore: () => ({ refresh: vi.fn(), status: reactive({ autoSyncEnabled: false }) }),
}))
vi.mock('@/stores/font-set', () => ({
  useFontSetStore: () => ({ settings, load: vi.fn(async () => {}) }),
}))

const { default: SetPage } = await import('@/pages/set/index.vue')

function mountPage() {
  return mount(SetPage, {
    global: { stubs: { PageShell: { template: '<div><slot/></div>' } } },
    attachTo: document.body,
  })
}

function buttonByText(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.includes(text),
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  settings.ztDefaultSize = [6, 8, 10, 11, 12, 14, 16, 18]
})

describe('字体面板预设按钮', () => {
  it('三个按钮按原版文案渲染，且不再是单值输入框', () => {
    const wrapper = mountPage()
    const labels = [...document.querySelectorAll('button')].map((b) => b.textContent?.trim())
    expect(labels).toContain('配置字号')
    expect(labels).toContain('配置行间距')
    expect(labels).toContain('配置字间距')
    // 原版是按钮开弹窗；页面里不该再有「请输入默认字体大小」这类单值输入
    expect(document.body.innerHTML).not.toContain('请输入默认字体大小')
    wrapper.unmount()
  })

  it('点「配置字号」把当前数组按每 6 个换行填进弹窗', async () => {
    const wrapper = mountPage()
    buttonByText('配置字号')!.click()
    await nextTick()
    await nextTick()

    const area = document.querySelector<HTMLTextAreaElement>('.addcom__textarea')
    expect(area?.value).toBe('6,8,10,11,12,14\n16,18')
    wrapper.unmount()
  })

  it('点底部「清理缓存」打开只读弹窗（清理按钮 disabled）', async () => {
    const wrapper = mountPage()
    buttonByText('清理缓存')!.click()
    await nextTick()
    await nextTick()

    expect(document.querySelector('.modal__title')?.textContent).toBe('清理缓存')
    expect(document.querySelector<HTMLButtonElement>('.cache__clear')?.disabled).toBe(true)
    wrapper.unmount()
  })

  it('保存失败时把设置回滚，不吞掉用户的旧预设', async () => {
    const wrapper = mountPage()
    buttonByText('配置字号')!.click()
    await nextTick()
    await nextTick()

    const area = document.querySelector<HTMLTextAreaElement>('.addcom__textarea')!
    area.value = '10,20,30,40,50,60'
    area.dispatchEvent(new Event('input'))
    await nextTick()

    document.querySelector<HTMLButtonElement>('.modal__btn.is-primary')!.click()
    await nextTick()
    await nextTick()
    await nextTick()

    // 提交成功才会关窗（不合法时 AddcomDialog 会留在原地）
    expect(document.querySelector('.modal')).toBeNull()
    // 测试环境没有注册命令 → 保存失败 → 页面必须回到原值
    expect(settings.ztDefaultSize).toEqual([6, 8, 10, 11, 12, 14, 16, 18])
    wrapper.unmount()
  })
})
