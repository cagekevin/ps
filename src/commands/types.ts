import type { Repo } from '@/cep/data/types'
import type { RawStar, RawTag } from '@/cep/data'
import type { ActionLibrary, ActionWarehouseIndex } from '@/cep/data/actions'
import type { FreePanelFile } from '@/domain/free-panel'
import type { JsxPort } from '@/cep/jsx/types'
import type { SelectionSnapshot } from '@/selection'

/**
 * 命令层类型（ADR-16）。
 *
 * 命令是插件的最小可执行单位：页面、常用页、自定义面板、快捷键都只消费它。
 * `requires` / `kind` **没有默认值**——新命令不写就编译不过。
 */
/**
 * 命令分组。**`seban` 是色板独立面板专用的**：
 * 那 7 条命令只该由 `#/seBan` 调用，主面板任何页面都不请求这一组，
 * 所以进注册表后主面板可见面零变化（`CommandGrid` 只按显式 `group` 渲染）。
 */
export type CommandGroup = 'font' | 'layer' | 'style' | 'action' | 'file' | 'system' | 'seban'

/** 执行前置。`textLayer` 依赖 `Layer_getTypeNumber === 2`，该值未在真机确认 */
export type Requirement = 'none' | 'layer' | 'textLayer' | 'document'

export type CommandKind = 'instant' | 'form' | 'batch' | 'long'

/** 长任务的进度句柄；非 long 命令拿到的是 no-op */
export interface ProgressHandle {
  /** progress 0–1；不传表示"还在跑但不知道百分比" */
  update(progress?: number, detail?: string): void
  end(): void
  /** 注册取消回调；命令不注册时 UI 不显示取消 */
  setCancel?: (cancel: () => void) => void
}

export interface ProgressPort {
  begin(title: string): ProgressHandle
}

export interface CommandContext {
  selection: SelectionSnapshot
  /**
   * **没有 `settings` 字段**（删掉的）。
   *
   * 原来这里是一个 `Record<string, unknown>`：40+ 个偏好键没有任何键名约束，
   * 拼错一个字母既不报错也不崩，只是"这个设置永远不生效"。而且它当时**零个消费者**——
   * 命令要读设置时走的是有型的 `readFontSetSettings()`（返回 `FontSetSettings`）
   * 或 `getPref(key: PrefKey)`。与其给一个没人用的口袋补键名，不如删掉这个口袋。
   */
  data: DataPort
  jsx: JsxPort
  /** 只有 `kind: 'long'` 时才真正上报；其余是 no-op */
  progress: ProgressHandle
}

export interface DataPort {
  stars: Repo<RawStar[]>
  tags: Repo<RawTag[]>
  actionIndex: Repo<ActionWarehouseIndex>
  actionLibrary: Repo<ActionLibrary>
  freePanel: Repo<FreePanelFile>
}

import type { CepErrorCode } from '@/utils/errors'

export interface Command<P = void> {
  /** 稳定标识：快捷键、设置、日志、错误归因共用 */
  id: string
  title: string
  group: CommandGroup
  icon?: string
  requires: Requirement
  kind: CommandKind
  /** 成功不返回值，失败直接 throw；统一由 registry.execute 归一 */
  invoke(ctx: CommandContext, payload: P): Promise<void>
}

/** 给 UI 渲染用的元数据（不含 `invoke`，避免页面直接调用） */
export interface CommandMeta {
  id: string
  title: string
  group: CommandGroup
  icon?: string
  requires: Requirement
  kind: CommandKind
}

/**
 * 命令的统一结果。失败臂的 `code` **必填且是 `CepErrorCode`**（R3）——
 * 以前是 `code?: string`，于是消费侧要写 `(result.code ?? 'JSX') as CepErrorCode`
 * （`??` 默认值 + `as` 假收窄，纪律 2 违约）；现在写不出来。
 */
export type CommandOutcome =
  | { ok: true; message?: string }
  | { ok: false; reason: string; code: CepErrorCode }
  | { ok: 'cancelled' }
