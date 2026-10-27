// 是什么：`CepError` 的**用户文案**渲染处（④层，给 toast / 错误条）
// 唯一入口：`CepError` → 一句中文，只在这里；页面与 store 不再各写各的
// 谁在用：`useCommand` · 6 个 store · `ErrorBoundary.vue` · `error-handler.ts` · `usePagedList`
// 禁止：这里不读 `cause`（技术原文归 `utils/logger` 的 `renderError`）；也不处理 `DecodeFail` / `CloudFailure`
//   —— 那两个各有自己的渲染处（`repo-read.describeDecodeFail` / `cloud/types.describeCloudFailure`）

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
