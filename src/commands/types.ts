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
export type CommandGroup = 'font' | 'layer' | 'style' | 'action' | 'file' | 'system'

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
  settings: Record<string, unknown>
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

export interface Command<P = void> {
  /** 稳定标识：快捷键、设置、日志、错误归因共用 */
  id: string
  title: string
  group: CommandGroup
  icon?: string
  requires: Requirement
  kind: CommandKind
  /** 成功不返回值，失败直接 throw；统一由 registry.execute 归一 */
  run(ctx: CommandContext, payload: P): Promise<void>
}

/** 给 UI 渲染用的元数据（不含 run，避免页面直接调用） */
export interface CommandMeta {
  id: string
  title: string
  group: CommandGroup
  icon?: string
  requires: Requirement
  kind: CommandKind
}

export type CommandResult =
  | { ok: true; message?: string }
  | { ok: false; reason: string; code?: string }
  | { ok: 'cancelled' }
