import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import License from '@/pages/fontManage/components/FontLicense.vue'

describe('FontLicense', () => {
  it('commercials 命中显示免费商用 45×15', () => {
    const wrapper = mount(License, {
      props: { family: 'MiSans', commercials: ['MiSans'] },
    })

    const svg = wrapper.get('svg')
    expect(svg.attributes('width')).toBe('45')
    expect(svg.attributes('aria-label')).toBe('免费商用')
  })

  it('未命中显示商用授权 56×15', () => {
    const wrapper = mount(License, {
      props: { family: '思源黑体', commercials: ['MiSans'] },
    })

    const svg = wrapper.get('svg')
    expect(svg.attributes('width')).toBe('56')
    expect(svg.attributes('aria-label')).toBe('商用授权')
  })
})
