import raw from '@/assets/icons-sprite.svg?raw'

let injected = false

/**
 * 把 SVG sprite 注入文档。
 *
 * 保留这个函数是为了兼容旧代码，但图标已经不再走 `<use>` ——
 * 见下方 getSymbol：`<use href="#id">` 在旧版 Chromium 里会随父级重绘
 * 重新解析 symbol，表现为图标闪一下。改成直接内联路径就没这个问题了。
 */
export function injectSprite() {
  if (injected) return
  injected = true

  const host = document.createElement('div')
  host.id = 'psz-sprite'
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  host.innerHTML = raw
  document.body.insertBefore(host, document.body.firstChild)
}

interface SymbolShape {
  viewBox: string
  inner: string
}

let cache: Map<string, SymbolShape> | null = null

/**
 * 解析 sprite，拿到每个 symbol 的 viewBox 和内部路径。
 * 只在第一次调用时解析一次，之后走缓存。
 */
export function getSymbol(id: string): SymbolShape | undefined {
  if (!cache) {
    cache = new Map()
    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml')
    for (const node of Array.from(doc.getElementsByTagName('symbol'))) {
      cache.set(node.id, {
        viewBox: node.getAttribute('viewBox') ?? '0 0 24 24',
        inner: node.innerHTML,
      })
    }
  }
  return cache.get(id)
}
