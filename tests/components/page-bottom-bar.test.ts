import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import GDropdown from '@/components/GDropdown.vue'
import PageBottomBar from '@/components/PageBottomBar.vue'

/**
 * 底栏图标按钮皮肤。
 *
 * 为什么断言分两层（不测像素）：
 * - jsdom 不计算布局，`getComputedStyle` 拿不到样式表里的 width（永远 'auto'），
 *   所以尺寸/颜色只能断言**规则文本**，这条与 `docs/规范/测试规范.md`（不测布局与坐标）一致。
 * - 能测的是"机制"和"落地"：皮肤在哪个块里、选择器依赖什么属性、按钮有没有带这个类。
 *
 * 用户实测的 bug：动作页导入/导出按钮白底。根因是 `:slotted()` 编译成
 * `.g-bottom-bar .g-bottom-bar__icon[data-v-xxx-s]`，而这两个按钮由 GDropdown 的
 * `#trigger` 插槽渲染，没有 `-s` 属性 → 规则不命中，且 global.css 的 button 规则没重置背景。
 */

const SFC = readFileSync(join(process.cwd(), 'src/components/PageBottomBar.vue'), 'utf8')

/**
 * 按行取出所有 `<style …>` 块。
 * 不能用正则直接扫全文：脚本注释里出现了 `<style>` 这几个字，会把注释当成块首。
 */
function styleBlocks(): Array<{ scoped: boolean; css: string }> {
  const blocks: Array<{ scoped: boolean; css: string }> = []
  const lines = SFC.split(/\r?\n/)
  let current: { scoped: boolean; css: string } | null = null
  for (const line of lines) {
    const open = line.match(/^<style(\s+scoped)?>\s*$/)
    if (open) {
      current = { scoped: Boolean(open[1]), css: '' }
      continue
    }
    if (line.match(/^<\/style>\s*$/) && current) {
      blocks.push(current)
      current = null
      continue
    }
    if (current) current.css += `${line}\n`
  }
  return blocks
}

/** 非 scoped 的那个块：皮肤必须在这里才能覆盖插槽里的嵌套按钮 */
function globalStyleBlock(): string {
  const block = styleBlocks().find((item) => !item.scoped)
  if (!block) throw new Error('PageBottomBar 没有非 scoped 的 <style> 块')
  return block.css
}

/** 去掉 CSS 注释：注释里会引用原版选择器（含 `[data-v-…]`），不该算进断言 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('PageBottomBar 皮肤（机制）', () => {
  it('皮肤写在非 scoped 块里，且不再依赖 :slotted / data-v 属性', () => {
    const css = stripComments(globalStyleBlock())

    expect(css).toContain('.g-bottom-bar__icon')
    expect(css).toContain('.g-bottom-bar__divider')
    // 依赖 -s 属性的写法一个都不许留（就是白底的根因）；只看样式块，不看脚本里的说明文字
    const blocks = styleBlocks()
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    expect(blocks.filter((block) => block.scoped)).toHaveLength(1)
    for (const block of blocks) expect(stripComments(block.css)).not.toContain(':slotted(')
    expect(css).not.toContain('[data-v-')
  })

  it('按钮规格：26×26、1px 透明边框、透明底；hover 用 #222 底 + #444 边（走 token）', () => {
    const css = stripComments(globalStyleBlock())

    expect(css).toMatch(/width:\s*26px/)
    expect(css).toMatch(/height:\s*26px/)
    expect(css).toMatch(/border:\s*1px solid transparent/)
    expect(css).toMatch(/background:\s*transparent/)
    expect(css).toMatch(/background:\s*var\(--c-sunken\)/)
    expect(css).toMatch(/border-color:\s*var\(--c-icon-hover-border\)/)
  })
})

describe('PageBottomBar 皮肤（落地）', () => {
  it('直接子级按钮带 g-bottom-bar__icon 类', () => {
    const wrapper = mount(PageBottomBar, {
      slots: { default: '<button class="g-bottom-bar__icon">A</button>' },
    })

    expect(wrapper.find('.g-bottom-bar .g-bottom-bar__icon').exists()).toBe(true)
  })

  it('嵌套在 GDropdown trigger 插槽里的按钮同样带类（动作页导入/导出就是这种）', () => {
    const Host = defineComponent({
      components: { PageBottomBar, GDropdown },
      template: `
        <PageBottomBar>
          <button class="g-bottom-bar__icon" id="direct">A</button>
          <GDropdown :visible="true">
            <template #trigger>
              <button class="g-bottom-bar__icon" id="nested">B</button>
            </template>
            <div>menu</div>
          </GDropdown>
        </PageBottomBar>
      `,
    })
    const wrapper = mount(Host)

    const nested = wrapper.find('#nested')
    // 前置：它确实在 GDropdown 内部，不是底栏的直接子级
    expect(wrapper.find('.g-bottom-bar > #nested').exists()).toBe(false)
    expect(wrapper.find('.g-dropdown__trigger #nested').exists()).toBe(true)
    // 皮肤只认类名，所以嵌套深度不影响命中
    expect(nested.classes()).toContain('g-bottom-bar__icon')
  })
})

/**
 * 守卫：底排图标不许带尺寸档。
 *
 * 原版底排统一是 `baseIcon`，不带 `svg-N` 类 → 图标 `1em`（基准 `font-size:12px`，即 12px）。
 * 动作页曾经写成 `size="md"`（16px）导致三页不一致，这条测试就是防它回来。
 * 只扫 `.vue` 源码文本：能覆盖"类写在按钮上、图标在按钮里"这种结构，也不需要渲染整套页面。
 */

const ROOT = process.cwd()

function relative(file: string): string {
  return file.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '')
}

function vueFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...vueFiles(abs))
    else if (entry.name.endsWith('.vue')) out.push(abs)
  }
  return out
}

function bottomBarButtonInner(source: string): string[] {
  // <button … class="… g-bottom-bar__icon …" …> … </button>（class 可能和别的类混写、可能跨行）
  const re = /<button\b[^>]*\bclass="[^"]*\bg-bottom-bar__icon\b[^"]*"[^>]*>([\s\S]*?)<\/button>/g
  return [...source.matchAll(re)].map((match) => match[1])
}

describe('底排图标守卫', () => {
  it('凡被 g-bottom-bar__icon 包住的 <Icon> 都不许带 size', () => {
    const offenders: string[] = []
    let scannedButtons = 0
    const filesWithBar: string[] = []

    for (const file of vueFiles(join(ROOT, 'src/pages'))) {
      const source = readFileSync(file, 'utf8')
      const inners = bottomBarButtonInner(source)
      if (!inners.length) continue
      filesWithBar.push(relative(file))
      for (const inner of inners) {
        scannedButtons += 1
        // 只关心包在里面的 <Icon ...>：出现 size= 就记一笔
        for (const icon of inner.matchAll(/<Icon\b[^>]*>/g)) {
          if (/\bsize\s*=/.test(icon[0])) offenders.push(`${relative(file)}: ${icon[0].trim()}`)
        }
      }
    }

    expect(offenders).toEqual([])
    // 反空跑：扫描范围是 `src/pages` 全量（不是固定名单），三个有底排的页面都必须被扫到
    expect(filesWithBar).toEqual(
      expect.arrayContaining([
        expect.stringContaining('action'),
        expect.stringContaining('rename'),
        expect.stringContaining('style'),
      ]),
    )
    expect(scannedButtons).toBeGreaterThanOrEqual(6)
  })
})
