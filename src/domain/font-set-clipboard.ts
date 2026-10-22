// 是什么：字体面板"复制文字属性 → 粘贴文字属性"之间的临时数据
// 唯一入口：复制/粘贴的共享板只在这里；页面与 store 都不持有它
// 替代了什么：原版根组件的 `data.copyFont`（app.v4.js:42957）
// 谁在用：commands/fontSet.ts（copyFont 写、pasteFont 读）
// 禁止：落盘、进 store、跨页面共享；PS 重启即失效是预期行为

let clipboard: unknown = null

export function setFontClipboard(data: unknown): void {
  clipboard = data
}

export function getFontClipboard(): unknown {
  return clipboard
}

export function hasFontClipboard(): boolean {
  return clipboard !== null && clipboard !== undefined
}

/** 仅测试用 */
export function __resetFontClipboardForTest(): void {
  clipboard = null
}
