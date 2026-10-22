import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import BaseGroup from '@/components/BaseGroup.vue'

/**
 * 折叠组头（原版 `baseGroup`，`app.v4.js:2564-2621`）。
 *
 * 跨页共用：动作页（`:55086`）与样式页四库（`:49939` / `:50522` / `:50908` / `:51326`）用的是
 * **同一个** `baseGroup`（注册一次 `:2938`，样式只有一段 `data-v-3837342d`），
 * 所以色值与左距按原版改一次，两页一起对齐。
 *
 * 事件：原版组头 `click` → `clickHandle`（ctrl 与否由调用方判），`contextmenu` → `contextmenu`。
 * 我们把它拆成 `change(value)` / `ctrl(event)` / `menu(event)` 三个事件。
 */
function mountGroup(props: Record<string, unknown> = {}) {
  return mount(BaseGroup, { props: { text: '灰白', value: true, ...props } })
}

describe('BaseGroup 事件', () => {
  it('普通点击 → change(!value)', async () => {
    const wrapper = mountGroup({ value: true })

    await wrapper.find('.base-group__head').trigger('click')

    expect(wrapper.emitted('change')).toEqual([[false]])
    expect(wrapper.emitted('ctrl')).toBeUndefined()
  })

  it('ctrl+点击 → 只发 ctrl，不发 change（原版 changeGroupShowStatus 的 showOnly 分支）', async () => {
    const wrapper = mountGroup({ value: true })

    await wrapper.find('.base-group__head').trigger('click', { ctrlKey: true })

    expect(wrapper.emitted('ctrl')).toHaveLength(1)
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('右键 → menu 事件（原版 contextmenu 里 preventDefault）', async () => {
    const wrapper = mountGroup()

    await wrapper.find('.base-group__head').trigger('contextmenu')

    expect(wrapper.emitted('menu')).toHaveLength(1)
  })

  it('value=false 时只渲染组头，不渲染默认插槽', () => {
    const closed = mount(BaseGroup, {
      props: { text: '灰白', value: false },
      slots: { default: '<div class="child">项</div>' },
    })
    expect(closed.find('.child').exists()).toBe(false)

    const open = mount(BaseGroup, {
      props: { text: '灰白', value: true },
      slots: { default: '<div class="child">项</div>' },
    })
    expect(open.find('.child').exists()).toBe(true)
  })
})

describe('BaseGroup 的两个色值与左距（原版 data-v-3837342d + 全局 .icon/.ml8）', () => {
  const ROOT = process.cwd()
  const SFC = readFileSync(join(ROOT, 'src/components/BaseGroup.vue'), 'utf8')
  const TOKENS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')

  /** 按「选择器列表 → 声明块」解析，支持逗号分组与换行（Prettier 会把长选择器拆行） */
  function rule(selector: string): string {
    const blocks = SFC.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{[^}]*\}/g) ?? []
    for (const block of blocks) {
      const [selectors, body] = block.split('{')
      if (selectors.split(',').some((part) => part.trim() === selector)) {
        return body.replace(/\s+/g, ' ').trim()
      }
    }
    throw new Error(`BaseGroup.vue 里找不到 ${selector} 规则`)
  }

  function token(name: string): string {
    const match = TOKENS.match(new RegExp(`--${name}:\\s*([^;]+);`))
    expect(match, `tokens.css 里找不到 --${name}`).toBeTruthy()
    return (match?.[1] ?? '').trim()
  }

  it('名称左距 8px：原版 `<p class="ml8">`，.ml8{margin-left:8px}', () => {
    expect(token('sp-4')).toBe('8px')
    expect(rule('.base-group__text')).toContain('margin: 0 0 0 var(--sp-4)')
  })

  it('箭头常态 #c3c3c3（原版全局 .icon{color:#c3c3c3}）', () => {
    expect(token('c-text')).toBe('#c3c3c3')
    expect(rule('.base-group__chevron')).toContain('color: var(--text)')
  })

  it('hover 变 #fff（原版 .base-group-mian:hover p,.base-group-mian:hover svg{color:#fff}）', () => {
    expect(token('c-text-inverse')).toBe('#ffffff')
    // 原版 hover 同时管文字和箭头（`:hover p` + `:hover svg`），两条都得是 #fff
    for (const selector of [
      '.base-group__head:hover .base-group__text',
      '.base-group__head:hover .base-group__chevron',
    ]) {
      expect(rule(selector), selector).toContain('color: var(--c-text-inverse)')
    }
    // 旧的灰值不许回潮
    expect(SFC).not.toContain('--text-faint')
    expect(SFC).not.toContain('--text-strong')
  })
})
