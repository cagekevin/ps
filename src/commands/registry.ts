import { starsRepo, tagsRepo } from '@/cep/data'
import { actionIndexRepo, actionLibraryRepo } from '@/cep/data/actions'
import { freePanelRepo } from '@/cep/data/free-panel'
import { settingsSnapshot } from '@/cep/data/settings'
import { jsx } from '@/cep/jsx'
import { current, refresh, type SelectionSnapshot } from '@/selection'
import { CepError } from '@/utils/errors'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'
import type { CommandId, CommandPayloads } from './payloads'
import { noopProgressHandle, progressPort } from './runtime'
import type {
  Command,
  CommandContext,
  CommandGroup,
  CommandMeta,
  CommandResult,
  ProgressHandle,
  Requirement,
} from './types'

const registry = new Map<string, Command<unknown>>()

/**
 * 定义命令：id 必须存在于 `CommandPayloads` 映射表，payload 类型自动推断。
 * 写错 id 或 payload 字段，直接编译失败——这是 payload 契约的落地点。
 */
export function defineCommand<K extends CommandId>(
  command: Command<CommandPayloads[K]> & { id: K },
): Command<unknown> {
  return command
}

export function register<P>(command: Command<P>): void {
  if (registry.has(command.id)) {
    // 覆盖是允许的（模块热替换/测试重置），但必须留痕，避免"两份同名命令"悄悄打架
    log.warn('cmd', `命令 id 重复注册：${command.id}，后者覆盖前者`)
  }
  registry.set(command.id, command)
}

export function get(id: string): Command<unknown> | undefined {
  return registry.get(id)
}

export function list(opts: { group?: CommandGroup } = {}): CommandMeta[] {
  return [...registry.values()]
    .filter((command) => !opts.group || command.group === opts.group)
    .map(({ id, title, group, icon, requires, kind }) => ({
      id,
      title,
      group,
      icon,
      requires,
      kind,
    }))
}

/** 仅供测试：清空注册表 */
export function __resetForTest() {
  registry.clear()
}

function canRun(requires: Requirement, selection: SelectionSnapshot): boolean {
  switch (requires) {
    case 'none':
    case 'document':
      return true
    case 'layer':
      return selection.hasSelection
    case 'textLayer':
      return selection.hasSelection && selection.typeNumber === 2
    default:
      return false
  }
}

function context(selection: SelectionSnapshot, progress: ProgressHandle): CommandContext {
  return {
    selection,
    settings: settingsSnapshot(),
    data: {
      stars: starsRepo,
      tags: tagsRepo,
      actionIndex: actionIndexRepo,
      actionLibrary: actionLibraryRepo,
      freePanel: freePanelRepo,
    },
    jsx,
    progress,
  }
}

function unmetReason(requires: Requirement): string {
  return requires === 'textLayer' ? '请先选择一个文字图层' : '请先选择一个图层'
}

/** 给定快照下这个命令能否执行；`useCommand.disabled` 传 `selectionRef.value` 进来 */
export function isEnabled(id: string, snapshot: SelectionSnapshot = current()): boolean {
  const command = registry.get(id)
  if (!command) return false
  return canRun(command.requires, snapshot)
}

/**
 * 在给定选区快照下跑一条命令。
 *
 * 顺序固定：检查 requires → run → catch 归一 → 日志 + 耗时。
 * 页面拿不到命令内部异常，只拿 `CommandResult`，所以"忘记处理失败"写不出来。
 */
async function runWith(
  id: string,
  payload: unknown,
  selection: SelectionSnapshot,
): Promise<CommandResult> {
  const command = registry.get(id)
  if (!command) return { ok: false, reason: `命令不存在：${id}` }

  // requires 检查放在 run 之前：没选区就不该调 jsx，否则只会拿到一句看不懂的 evalScript 错
  if (!canRun(command.requires, selection)) {
    return { ok: false, reason: unmetReason(command.requires) }
  }

  // 长任务由 registry 统一管理生命周期，命令只管上报进度
  const progress =
    command.kind === 'long' ? progressPort().begin(command.title) : noopProgressHandle()

  const started = Date.now()
  try {
    await command.run(context(selection, progress), payload as never)
    log.info('cmd', `${id} ${Date.now() - started}ms`)
    return { ok: true }
  } catch (e) {
    const reason = describeCepError(e)
    const code = e instanceof CepError ? e.code : undefined
    log.warn('cmd', `${id} 失败：${reason}`)
    return { ok: false, reason, code }
  } finally {
    progress.end()
  }
}

/**
 * 唯一执行入口。一次执行只刷新一次选区。
 */
export async function execute<K extends CommandId>(
  id: K,
  payload?: CommandPayloads[K],
): Promise<CommandResult>
/** 宽松重载：测试里用假 id、网格里用 string 时走这条 */
export async function execute(id: string, payload?: unknown): Promise<CommandResult>
export async function execute(id: string, payload?: unknown): Promise<CommandResult> {
  // 命令不存在就不必去问 PS 要选区（保持"未知 id 不 refresh"的旧行为）
  if (!registry.get(id)) return { ok: false, reason: `命令不存在：${id}` }

  // 一次执行只查一次选区，不再让每个命令自己调 getLayerState
  const selection = await refresh().catch(() => null)
  if (!selection) return { ok: false, reason: '读取选区失败' }

  return runWith(id, payload, selection)
}

/**
 * 子命令入口：复用父命令刚刷新过的选区快照，**不再 refresh**（D-33）。
 *
 * 为什么要有它：`freePanel.execute` 要在同一次执行里跑一条子命令。走 `execute` 会二次
 * refresh（多一次 evalScript 往返），而且子命令的失败被外层再包一层 `CepError('JSX')`，
 * 把子命令原本的 `code`（如 `FONT_MISSING`）冲掉，页面的"弹字体下载确认"分支就失效。
 *
 * 调用方负责把子命令的 `code` 原样抛回去：
 * `throw new CepError(result.code ?? 'JSX', result.reason)`。
 */
export async function executeInherited(
  id: string,
  payload: unknown,
  parent: { selection: SelectionSnapshot },
): Promise<CommandResult> {
  return runWith(id, payload, parent.selection)
}
