import { ref } from 'vue'

/** 原版字体缺失下载页（app.v4.js:43518-43525） */
export const FONT_DOWNLOAD_URL = 'http://mb.pszhuli.com/508.html'

/** 命令层只负责置位；弹窗由页面用 CepModal 展示 */
export const missingFont = ref<string | null>(null)

export function signalMissingFont(name: string): void {
  missingFont.value = name
}

export function clearMissingFont(): void {
  missingFont.value = null
}
