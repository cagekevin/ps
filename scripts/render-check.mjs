/**
 * 构建期渲染检查（不启浏览器、不模拟点击、不需要 PS）。
 *
 *   node scripts/render-check.mjs
 *
 * 用 Vite 的 SSR 管道把页面组件渲染成 HTML 字符串，验证：
 *   1. 组件树能实例化，不抛异常（很多白屏在这一步就会炸）
 *   2. setup 里的计算属性、props 默认值不炸
 *   3. 关键结构出现在输出里
 *
 * 它验不了：真实数据、点击行为、视觉。这些不该假装验过。
 */
// 页面里有模块级 window 访问（logger 挂 __pszDump）。SSR 下补一个最小壳，
// 只为让模块能求值——不模拟浏览器行为，也不代表运行时验证。
globalThis.window ??= {
  innerWidth: 400,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
}

import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createServer } from 'vite'

const PAGES = [
  { name: 'fontManage', file: '/src/pages/fontManage/index.vue', expect: ['我的字体', '搜索'] },
]

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const results = []
for (const page of PAGES) {
  try {
    const mod = await server.ssrLoadModule(page.file)
    const app = createSSRApp(mod.default)
    app.use(createPinia())
    const html = await renderToString(app)

    const missing = page.expect.filter((text) => !html.includes(text))
    const empty = html.replace(/<!--.*?-->/g, '').trim().length < 200

    results.push({
      name: page.name,
      ok: missing.length === 0 && !empty,
      bytes: html.length,
      missing,
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
    console.log(`[render] ok   ${r.name}  ${r.bytes} bytes`)
    continue
  }
  failed++
  console.error(`[render] FAIL ${r.name}`)
  if (r.error) console.error(r.error)
  if (r.missing?.length) console.error(`  缺少结构：${r.missing.join(' / ')}`)
  if (r.empty) console.error('  输出为空（疑似整页没渲染）')
}

process.exit(failed ? 1 : 0)
