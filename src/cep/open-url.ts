/**
 * 打开外部链接的唯一出口。
 * CEP 面板里统一走 window.open，避免每个页面各写一遍。
 */
export function openUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
