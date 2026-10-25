// 是什么｜替代了什么｜谁在用
// 是什么：base64 ⇄ UTF-8 文本互转（库文件 `.kus/.kug/.kux` 的 `data` 字段就是 base64(JSON 文本)）
// 替代了什么：`cep/fs.ts:224-243`（原来挂在"文件系统"文件里，其实与 IO 无关，是纯编解码）
// 谁在用：`data/style-library-io.ts`（读库 → 文本 → JSON；写回时反向）
// 说明：不依赖 `cep.encoding`（原版走 `app.v4.js:72751-72760` 的 `b64_to_utf8`），atob/TextDecoder 在 CEP 与 jsdom 都有

/**
 * base64 → UTF-8 文本。库文件 `.kus/.kug/.kux` 的 `data` 字段就是 `base64(库文件 JSON 文本)`。
 *
 * 调用方必须先判 `typeof data === 'string'`——布尔 `false` 会在这里抛（契约 §2.5）。
 */
export function b64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/** UTF-8 文本 → base64。与 `b64ToUtf8` 成对：库文件导出时 `data = base64(库文件 JSON 文本)`（契约 §1.1 ②） */
export function utf8ToB64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  // 分块拼，避免 20 万字符级库文件逐字符追加时的长字符串开销
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
