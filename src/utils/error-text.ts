import { CepError } from './errors'
import { codeText } from './code-registry'

/**
 * 把错误翻成人话，UI 层直接拿去 toast。页面里不要再各写各的文案。
 *
 * 只做"错误 → 文案"，**不依赖 store / feedback**：
 * 需要弹提示的地方用 `components/command/useCommand` 的 `invoke()`。
 *
 * 码→文案的映射在 `utils/code-registry` 的 **`CODE_REGISTRY` 一张表**里
 * （本文件不再 `switch (e.code)`，新增码也不会漏文案）。
 */
export function describeCepError(e: unknown): string {
  if (e instanceof CepError) {
    return codeText(e.code, e.message)
  }
  return e instanceof Error ? e.message : String(e)
}
