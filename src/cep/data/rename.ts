// 是什么：重命名预设的仓库（读写 `<userDir>/sj_cmmRename.ini`）
// 唯一入口：预设的读写只能经过这里；页面/组件不许自己拼路径
// 替代了什么：原版 `$S extends lt` 用 `N.a.path.rename` 自己读写的隐式实现（app.v4.js:56800-56816）
// 谁在用：`commands/rename.ts`、`stores/rename.ts`
// 禁止：CEP 里不许退回内存兜底（ADR-14）；读失败要带 degraded

import { DATA_FILES } from '@/cep/env'
import { userDir } from '@/cep/fs'
import { seedPreset, type RenamePreset } from '@/domain/rename'
import { pick } from './pick'
import type { Repo } from './types'

/**
 * 原版文件名叫 `.ini`，内容是 JSON 数组（导出 `.cmm` 也是同一份 `JSON.stringify`，:57022）。
 * 首次打开没有文件时用种子数据（:56807-56816）。
 */
export const renameRepo: Repo<RenamePreset> = pick(
  () => `${userDir()}/${DATA_FILES.cmmRename}`,
  seedPreset,
  seedPreset,
)
