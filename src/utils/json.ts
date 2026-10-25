// 是什么：`JSON.parse` 之后"还像不像一个有结构的数据"的**唯一**判据（不是业务校验）
// 替代了什么：`domain/ku-io.ts` 与 `cep/data/swatch-repo.ts` 各自写的 try/JSON.parse 判断
// 谁在用：库文件备份可用性（`style-library-io` 的 `backupOriginal`）、色板备份可用性（`swatch-repo`）
// 禁止：不在这里判业务（字段名、目录归属、库类型）；要看"是不是合法库"用 `domain/ku-io`
//   的解析器。本函数只回答一句话：这段文本能不能被当成"某个结构的数据"。

/**
 * 顶层是**对象或数组**的合法 JSON → `true`；其余一律 `false`。
 *
 * 为什么这几档要判死（实战形态）：
 * - 写一半的 JSON（进程被杀 / 磁盘满）→ `JSON.parse` 抛 → 不是数据；
 * - 二进制乱码（把图片当文本读）→ `JSON.parse` 抛 → 不是数据；
 * - 空文件 / 只有空白 → 没有内容；
 * - `123` / `"x"` / `true` / `null` → 是合法 JSON，但**不可能是**我们的数据文件形态，
 *   当真备份留着只会让人以为"有退路"。
 */
export function isUsableJsonText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return false
  }
  return typeof parsed === 'object' && parsed !== null
}
