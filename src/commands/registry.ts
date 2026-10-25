import { starsWriter, tagsWriter } from '@/cep/data'
import { msg } from '@/domain/messages'
import { actionIndexWriter, actionLibraryWriter } from '@/cep/data/actions'
import { freePanelWriter } from '@/cep/data/free-panel'
import { jsx } from '@/cep/jsx'
import { current, refresh, type SelectionSnapshot } from '@/selection'
import { CepError } from '@/utils/errors'
import { CODE_REGISTRY } from '@/utils/code-registry'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'
import type { CommandId, CommandPayloads } from './payloads'
import { noopProgressHandle, progressPort } from './runtime'
import type {
  Command,
  CommandContext,
  CommandGroup,
  CommandMeta,
  CommandOutcome,
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
    data: {
      stars: starsWriter,
      tags: tagsWriter,
      actionIndex: actionIndexWriter,
      actionLibrary: actionLibraryWriter,
      freePanel: freePanelWriter,
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
 * 顺序固定：检查 requires → invoke → catch 归一 → 日志 + 耗时。
 * 页面拿不到命令内部异常，只拿 `CommandOutcome`，所以"忘记处理失败"写不出来。
 */
async function runWith(
  id: string,
  payload: unknown,
  selection: SelectionSnapshot,
): Promise<CommandOutcome> {
  const command = registry.get(id)
  if (!command)
    // UNVERIFIED: `命令不存在` 是开发者诊断还是用户提示待定；若是提示语应归 msg.command
    return { ok: false, reason: `命令不存在：${id}`, code: 'INTERNAL' }

  // requires 检查放在 invoke 之前：没选区就不该调 jsx，否则只会拿到一句看不懂的 evalScript 错
  if (!canRun(command.requires, selection)) {
    // `unmetReason` 只产选区类文案（"请先选择…"）⇒ 归 `NO_SELECTION`
    return { ok: false, reason: unmetReason(command.requires), code: 'NO_SELECTION' }
  }

  // 长任务由 registry 统一管理生命周期，命令只管上报进度
  const progress =
    command.kind === 'long' ? progressPort().begin(command.title) : noopProgressHandle()

  const started = Date.now()
  try {
    // payload 来自命令网格 / 自由面板 / 快捷键，编译期只有 `unknown`；形状由各自的入口保证
    // （`CommandPayloads` 是类型契约，自由面板那条还有运行时校验）。
    // 这里不再写 `as never`：那会把"形状不确定"说成"确定"，让类型检查在这个口子上彻底失效。
    await command.invoke(context(selection, progress), payload)
    log.info('cmd', `${id} ${Date.now() - started}ms`)
    return { ok: true }
  } catch (e) {
    // 非 `CepError` 统一落 `INTERNAL`：失败臂 `code` 必填，不许"失败但没码"
    const code = e instanceof CepError ? e.code : 'INTERNAL'
    // 用户自己取消不是失败——是否 cancelled 由 `CODE_REGISTRY` 一张表决定
    if (CODE_REGISTRY[code].cancelled) {
      log.info('cmd', `${id} 已被用户取消`)
      return { ok: 'cancelled' }
    }
    const reason = describeCepError(e)
    // 带上原 error：文案层只给用户看「能看懂的那句」，日志必须留 PS 侧原话
    log.warn('cmd', `${id} 失败：${reason}`, e)
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
): Promise<CommandOutcome>
/** 宽松重载：测试里用假 id、网格里用 string 时走这条 */
export async function execute(id: string, payload?: unknown): Promise<CommandOutcome>
export async function execute(id: string, payload?: unknown): Promise<CommandOutcome> {
  // 命令不存在就不必去问 PS 要选区（保持"未知 id 不 refresh"的旧行为）
  const command = registry.get(id)
  if (!command) return { ok: false, reason: `命令不存在：${id}`, code: 'INTERNAL' }

  // 一次执行只查一次选区，不再让每个命令自己调 getLayerState
  let selection: SelectionSnapshot
  try {
    selection = await refresh()
  } catch (e) {
    // 读不到选区 ≠ 没有选区：原因（INIT / TIMEOUT_UNKNOWN / PARSE…）必须原样带走，
    // 以前 `.catch(() => null)` 把 code 和原文都丢了，用户只看到一句「读取选区失败」
    const reason = describeCepError(e)
    const code = e instanceof CepError ? e.code : 'INTERNAL'
    log.warn('cmd', `${id} 前置查询选区失败：${reason}`, e)
    if (needsSelection(command.requires)) {
      return { ok: false, reason: msg.command.fn.readSelectionFailed(reason), code }
    }
    // requires 为 none / document 的命令本来就不看选区，不能被无关失败连坐；
    // 继续用上一次快照（`canRun` 对这两档不看内容，命令拿到的 selection 只是转发）
    selection = current()
  }

  return runWith(id, payload, selection)
}

/** 这条命令的成败是否真的取决于选区快照 */
function needsSelection(requires: Requirement): boolean {
  return requires === 'layer' || requires === 'textLayer'
}

/**
 * 子命令入口：复用父命令刚刷新过的选区快照，**不再 refresh**（D-33）。
 *
 * 为什么要有它：`freePanel.execute` 要在同一次执行里跑一条子命令。走 `execute` 会二次
 * refresh（多一次 evalScript 往返），而且子命令的失败被外层再包一层 `CepError('JSX')`，
 * 把子命令原本的 `code`（如 `FONT_MISSING`）冲掉，页面的"弹字体下载确认"分支就失效。
 *
 * 调用方负责把子命令的 `code` 原样抛回去（`code` 必填，不需要 `?? 'JSX'`）：
 * `throw new CepError(result.code, result.reason)`。
 */
export async function executeInherited(
  id: string,
  payload: unknown,
  parent: { selection: SelectionSnapshot },
): Promise<CommandOutcome> {
  return runWith(id, payload, parent.selection)
}
