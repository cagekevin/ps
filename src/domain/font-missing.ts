/**
 * 原版字体缺失下载页地址（app.v4.js:43518-43525）。
 *
 * 这里**只有常量**：缺字体提示的响应式状态在 `stores/font-missing.ts`。
 * 以前这个文件里挂着 `ref`（domain 零框架，layer-boundary L5），TD-12-20 已搬走。
 */
export const FONT_DOWNLOAD_URL = 'http://mb.pszhuli.com/508.html'
