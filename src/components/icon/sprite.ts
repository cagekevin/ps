import raw from '@/assets/icons-sprite.svg?raw'

let injected = false

/**
 * 把 SVG sprite 注入文档，<use href="#id"> 才能生效。
 *
 * 为什么不用外部引用：CEP 走 file://，跨文档的 <use> 会被拦。
 * sprite 由 10-逆向流水线/14-sprite.cjs 从原面板 app.js 抽出，189 个图标。
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
