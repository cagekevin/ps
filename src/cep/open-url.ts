import { CepError } from '@/utils/errors'

/**
 * 打开外部链接的两个出口。
 *
 * - `openUrlInDefaultBrowser`：CEP 的 `window.cep.util.openURLInDefaultBrowser`，交给**系统浏览器**。
 *   官方所有"打开外链"都走它（`$cep.openUrl`，`app.v4.js:5031` 附近的 `$cep` 封装；
 *   色板面板 `sf.js:394-396` 打开作者站）。
 * - `openUrl`：`window.open`。CEP 里会开一个 CEF 子窗口，多数版本直接拦掉 —— 新代码别用，
 *   保留只是因为字体面板已经接了它（`pages/fontSet/index.vue:72`）。
 */
export function openUrlInDefaultBrowser(url: string): void {
  const util = window.cep?.util
  if (!util?.openURLInDefaultBrowser) {
    throw new CepError('NO_CEP', 'CEP 外链接口不可用（window.cep.util.openURLInDefaultBrowser）')
  }
  util.openURLInDefaultBrowser(url)
}

/** 旧出口：CEP 里不可靠，新代码用 `openUrlInDefaultBrowser` */
export function openUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
