import type { CepErrorCode } from './errors'

/**
 * 码 → 行为的**唯一一张表**（R3-3）。三类行为都在这里，不许在别处再 `if (code === '…')`：
 *
 * 1. `text` / `prefix` —— 用户文案（`describeCepError` 读）；
 * 2. `toast` —— `useCommand` 是否自动 toast（`FONT_MISSING` 交给页面弹窗，不自动弹）；
 * 3. `cancelled` —— `registry` 是否归一成 `CommandOutcome.status === 'cancelled'`（用户取消不是失败）。
 *
 * **never 收尾（穷尽性证明）**：`Record<CepErrorCode, …>` 保证这张表覆盖所有码 ——
 * 新增 `CepErrorCode` 而不补这张表 ⇒ **编译不过**。以前散在三处（`error-text.ts` 的
 * switch、`useCommand.ts` 的 `!== 'FONT_MISSING'`、`registry.ts` 的 `=== 'CANCELLED'`），
 * 新增码只补一处就会漏另两处。
 */
export interface CodeEntry {
  /** 固定文案；缺省时用原始 `message` */
  text?: string
  /** 「前缀：message」形态；与 `text` 互斥 */
  prefix?: string
  /** 是否自动 toast。`false` = 页面自己处理（FONT_MISSING 弹下载确认）或不提示（CANCELLED） */
  toast: boolean
  /** 是否归一成 `status: 'cancelled'`（用户取消不是失败） */
  cancelled?: boolean
}

export const CODE_REGISTRY: Record<CepErrorCode, CodeEntry> = {
  NO_CEP: { text: '当前不在 Photoshop 面板中运行', toast: true },
  NO_NODE: { text: 'Node 不可用，请检查 manifest 里的 --enable-nodejs', toast: true },
  TIMEOUT: { text: 'Photoshop 没有响应，请稍后重试', toast: true },
  TIMEOUT_UNKNOWN: {
    text: 'Photoshop 没有及时回应，无法确认这条操作是否生效：可能已经执行，也可能还在执行。请先确认结果，再决定要不要再做一次',
    toast: true,
  },
  JSX: { toast: true },
  PARSE: { toast: true },
  INIT: { prefix: 'Photoshop 脚本初始化失败', toast: true },
  IO: { toast: true },
  /** 落盘前 CAS 比对失败（另一面板改过，本次未写）。正常会被 `rawUpdate` 重试掉，不该到用户 */
  CONFLICT: { prefix: '文件已被其他面板改过，本次未写入', toast: true },
  NETWORK: { toast: true },
  NO_SELECTION: { toast: true },
  /** 字体缺失：页面弹下载确认，`useCommand` 不自动 toast */
  FONT_MISSING: { toast: false },
  /** 用户自己取消：不是失败，不提示 */
  CANCELLED: { toast: false, cancelled: true },
  /** 非 `CepError` 的分类（registry 捕到的未知异常） */
  INTERNAL: { toast: true },
}

/** 码 → 用户文案。固定文案优先，其次「前缀：message」，最后原样用 message */
export function codeText(code: CepErrorCode, message: string): string {
  const entry = CODE_REGISTRY[code]
  if (entry.text !== undefined) return entry.text
  if (entry.prefix !== undefined) return `${entry.prefix}：${message}`
  return message
}
