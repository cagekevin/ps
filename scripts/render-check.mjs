/**
 * 构建期渲染检查（不启浏览器、不模拟点击、不需要 PS）。
 *
 *   node scripts/render-check.mjs
 *
 * 用 Vite 的 SSR 管道把页面组件渲染成 HTML 字符串，验证：
 *   1. 组件树能实例化，不抛异常（很多白屏在这一步就会炸）
 *   2. setup 里的计算属性、props 默认值不炸
 *   3. 关键结构出现在输出里（`expect` = 文本、`checks` = 结构/计数断言）
 *
 * 它验不了：真实数据、点击行为、视觉。这些不该假装验过。
 *
 * 页面要真实数据才能渲染出列表时，`prepare(pinia)` 先把投影灌进去——
 * 灌的是**假数据**，只证明"有数据时结构对"，不证明"读库读对了"（那是 store/命令测试的事）。
 */
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createServer } from 'vite'
import { JSDOM } from 'jsdom'

// 页面里有模块级 window 访问（logger 挂 __pszDump），`Icon` 要 DOMParser 解析 sprite，
// `usePopover` / `useDismiss` 要 document。SSR 下用 jsdom 补这层壳（Node 里跑，不开浏览器），
// 只为让模块能求值——不模拟点击，也不代表运行时验证。
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window ??= dom.window
globalThis.document ??= dom.window.document
globalThis.DOMParser ??= dom.window.DOMParser
globalThis.HTMLElement ??= dom.window.HTMLElement
globalThis.Element ??= dom.window.Element
globalThis.Node ??= dom.window.Node
globalThis.navigator ??= dom.window.navigator
// `cep/data/settings.ts` 用的是裸 `localStorage`（浏览器分支），不是 window.localStorage
globalThis.localStorage ??= dom.window.localStorage

/** 样式页四库的假数据：每库一组一项，字段形状照 `domain/style-library.ts` 的 `KuItem` */
const STYLE_LIBRARIES = {
  color: [{ name: '灰白', show: true, items: [{ name: '未命名', swatch: '#302F34' }] }],
  gradient: [
    {
      name: '渐变默认分组',
      show: true,
      items: [
        { name: '未命名', swatch: 'linear-gradient(180deg, #D8C09E 0%, #E5D6BD 48.7548828125%)' },
      ],
    },
  ],
  font: [
    {
      name: '等线字组',
      show: true,
      items: [
        {
          name: '未命名',
          fontPreview: {
            count: 2,
            size: '20点',
            color: 'rgb(255, 0, 0)',
            family: '等线',
            weight: 'Regular',
            scriptFamily: 'DengXian',
          },
        },
      ],
    },
  ],
  style: [{ name: '样式默认分组', show: true, items: [{ name: '描边', thumb: 'X1.png' }] }],
}

/** html 里出现 needle 的次数（结构断言用计数，不做正则匹配 HTML） */
function countOf(html, needle) {
  return html.split(needle).length - 1
}

/**
 * 断言清单：每项返回 null（通过）或一句话（失败原因）。
 * 只断言"这个结构在不在 / 有几个"，不断言样式与视觉——SSR 里没有布局。
 */
function structureChecks(html, teleports) {
  const menuHtml = String(teleports?.body ?? '')
  return [
    // 四个 tab（清单 #7-15）
    [
      '四个 tab 文案',
      countOf(html, 'g-tabs__label') === 4,
      `实际 ${countOf(html, 'g-tabs__label')} 段`,
    ],
    [
      'tab 分隔竖线 3 条',
      countOf(html, 'g-tabs__line') === 3,
      `实际 ${countOf(html, 'g-tabs__line')} 条`,
    ],
    // 四库 section 的库类名（清单 #16-30，CSS 靠它分派尺寸）
    [
      '四库 style-lib--<kind>',
      ['color', 'gradient', 'font', 'style'].every((kind) => html.includes(`style-lib--${kind}`)),
      '缺少 style-lib--color/gradient/font/style 之一',
    ],
    // 回顶按钮（清单 #80-86；实现类名是 .back-top）
    [
      '回顶按钮 .back-top',
      countOf(html, 'class="back-top"') === 1,
      `实际 ${countOf(html, 'class="back-top"')} 个`,
    ],
    // 仓库条 + 下拉（清单 #70-76）
    ['仓库条 .style-warehouse', html.includes('style-warehouse__row'), '缺仓库条行'],
    ['仓库名文本', html.includes('默认仓库'), '缺仓库名'],
    // 下拉初始收起：warehouseOpen 初值 false
    ['仓库下拉初始不渲染', !html.includes('style-warehouse__down'), '初始状态就渲染了下拉'],
    // 底排 6 个按钮（清单 #88-101）
    [
      '底排 g-bottom-bar__icon 6 个',
      countOf(html, 'g-bottom-bar__icon') === 6,
      `实际 ${countOf(html, 'g-bottom-bar__icon')} 个`,
    ],
    [
      '底排分隔竖线 1 条',
      countOf(html, 'g-bottom-bar__divider') === 1,
      `实际 ${countOf(html, 'g-bottom-bar__divider')} 条`,
    ],
    // 字体卡片四件套（清单 #24）
    [
      '字体卡片四件套',
      [
        'style-item__font-count',
        'style-item__font-size',
        'style-item__font-dot',
        'style-item__font-sample',
      ].every((cls) => html.includes(cls)),
      '缺 字体数 / N点 / 色点 / 中文字 之一',
    ],
    ['字体预览文案 中文字', html.includes('中文字'), '缺「中文字」'],
    // 各组末尾的添加入口（清单 #52-61）：四库各一个
    [
      '四库各一个添加入口',
      countOf(html, 'style-item__add') === 4,
      `实际 ${countOf(html, 'style-item__add')} 个`,
    ],
    // 右键菜单初始不挂载（清单 #31-51：只有 contextmenu 后才挂）
    ['右键菜单初始不挂载', !menuHtml.includes('style-menu'), 'Teleport 里已经有 style-menu'],
  ]
}

const PAGES = [
  {
    name: 'fontManage',
    file: '/src/pages/fontManage/index.vue',
    expect: ['我的字体', '搜索'],
  },
  {
    name: 'style',
    file: '/src/pages/style/index.vue',
    expect: ['颜色', '渐变', '字体', '样式', '仓库分组，管理样式', '回到顶部'],
    /**
     * 页面靠 `onMounted` 里的 `store.load()` 出内容，SSR 不跑 onMounted →
     * 这里把投影灌成假数据，四库才会渲染。tab 默认只有「颜色」，
     * 四库同时出现要先把 `styleShowTab` 偏好写成全 true。
     */
    async prepare(pinia, server) {
      const settings = await server.ssrLoadModule('/src/cep/data/settings.ts')
      settings.setPref('styleShowTab', [true, true, true, true])

      const { useStyleLibraryStore } = await server.ssrLoadModule('/src/stores/style-library.ts')
      const store = useStyleLibraryStore(pinia)
      store.warehouses = [{ name: '默认仓库' }]
      store.activeIndex = 0
      store.libraries = STYLE_LIBRARIES
    },
    checks: structureChecks,
  },
]

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const results = []
for (const page of PAGES) {
  try {
    const pinia = createPinia()
    if (page.prepare) await page.prepare(pinia, server)

    const mod = await server.ssrLoadModule(page.file)
    const app = createSSRApp(mod.default)
    app.use(pinia)

    const ctx = {}
    const html = await renderToString(app, ctx)

    // 排查用：RENDER_CHECK_DUMP=<目录> 把每页的 HTML 落盘，方便贴片段/对比
    if (process.env.RENDER_CHECK_DUMP) {
      const { mkdirSync, writeFileSync } = await import('node:fs')
      mkdirSync(process.env.RENDER_CHECK_DUMP, { recursive: true })
      writeFileSync(`${process.env.RENDER_CHECK_DUMP}/${page.name}.html`, html, 'utf8')
    }

    const missing = page.expect.filter((text) => !html.includes(text))
    const failures = (page.checks?.(html, ctx.teleports) ?? [])
      .filter(([, ok]) => !ok)
      .map(([name, , detail]) => `${name}：${detail}`)
    const empty = html.replace(/<!--.*?-->/g, '').trim().length < 200

    results.push({
      name: page.name,
      ok: missing.length === 0 && !empty && failures.length === 0,
      bytes: html.length,
      checks: page.checks ? page.checks(html, ctx.teleports).length : 0,
      missing,
      failures,
      empty,
    })
  } catch (error) {
    results.push({ name: page.name, ok: false, error: String(error?.stack ?? error) })
  }
}

await server.close()

let failed = 0
for (const r of results) {
  if (r.ok) {
    console.log(`[render] ok   ${r.name}  ${r.bytes} bytes  ${r.checks} 条结构断言`)
    continue
  }
  failed++
  console.error(`[render] FAIL ${r.name}`)
  if (r.error) console.error(r.error)
  if (r.missing?.length) console.error(`  缺少结构：${r.missing.join(' / ')}`)
  if (r.failures?.length) console.error(`  断言失败：\n    ${r.failures.join('\n    ')}`)
  if (r.empty) console.error('  输出为空（疑似整页没渲染）')
}

process.exit(failed ? 1 : 0)
