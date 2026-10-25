// 是什么：色板三个数据文件（自定义色 / 最近色 / 最近数量）的磁盘读写 + **全数据层唯一的写队列**
// 唯一入口：`%APPDATA%/FengZiSeBan/` 下三个文件的读写只能经过这里
// 替代了什么：原版 `sf.js` 的 `sf_DuQu` / `sf_XieRu`（`:486-528`）与 `g_FN`（`:10-14`）；
//   本仓 `style-library-repo.ts` 里的私有实现（`:206-213` / `:836-883`）
// 谁在用：`commands/swatch.ts`、`commands/style.ts`（四条色板命令）、`stores/swatch.ts`、
//   `cep/data/style-library-repo.ts`（只 import 队列）
// 禁止：页面/组件不许 import；读不到不许当"没有"；不许新增同步读（ADR-26 ④）

import { USER_DIR } from '@/cep/env'
import { readOwnFileText } from '@/cep/fs-read'
import { userDir } from '@/cep/paths'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { isUnknownArray } from '@/utils/guards'
import { repoAt } from './repo-at'
import { readRepoFile } from './repo-read'
import { writeProtectedText } from './protected-text'
import type { Repo, RepoRead } from './types'
import { shapeFail, type DecodeFail, type Decoded } from '@/utils/decode'

// 写队列已删：`Repo<T>` 全同步 ⇒ 读改写是不可打断的同步段，不需要排队（TD-09-18 的"只留一条链"变成"没有链"）
/**
 * 色板目录名。原版 `sf.js:11` 的 `g_FN.muLu = "/FengZiSeBan"`，挂在 `getUserDataPath()`（`%APPDATA%`）下。
 * 注意它**不在** `USER_DIR`（`/SheJiZhuLi`）里面 —— 原版 `path.seBan` =
 * `getUserDataPath() + "/FengZiSeBan/userColor.ini"`（`app.v4.js:5222`）。
 */
const SWATCH_DIR = 'FengZiSeBan'

/** 三个文件名，照抄原版 `sf.js:12-13` 与 `:43` */
export const SWATCH_FILES = {
  /** `g_FN.color`：自定义色（可右键删、可拖拽排序） */
  custom: 'userColor.ini',
  /** `g_FN.vecently`：最近用过（只读投影给面板，去重与截断由 `setRecentLimit` / 事件路径做） */
  recent: 'vecently.ini',
  /** `g_ljShuLiang`：最近色保留条数（纯数字字符串） */
  limit: 'zuiJinShuLiang.txt',
} as const

/**
 * `%APPDATA%` 根。`userDir()` = `getUserDataPath() + USER_DIR`（`cep/fs.ts:45-52`），
 * 剥掉后缀还原成根 —— 色板文件不在 `USER_DIR` 里，不能直接拼。
 */
function dataRoot(): string {
  const dir = userDir()
  if (!dir.endsWith(USER_DIR)) {
    throw new CepError('IO', msg.data.fn.swatchUserDirMismatch(USER_DIR, dir))
  }
  return dir.slice(0, -USER_DIR.length)
}

/** 自定义色文件绝对路径（`%APPDATA%/FengZiSeBan/userColor.ini`） */
export function swatchFilePath(): string {
  return `${dataRoot()}/${SWATCH_DIR}/${SWATCH_FILES.custom}`
}

/** 最近色文件绝对路径（`%APPDATA%/FengZiSeBan/vecently.ini`） */
export function recentFilePath(): string {
  return `${dataRoot()}/${SWATCH_DIR}/${SWATCH_FILES.recent}`
}

/** 最近数量文件绝对路径（`%APPDATA%/FengZiSeBan/zuiJinShuLiang.txt`） */
export function recentLimitPath(): string {
  return `${dataRoot()}/${SWATCH_DIR}/${SWATCH_FILES.limit}`
}

/**
 * 读色板数组。文件不存在 / 空文件 = 空数组（原版 `readToArray` 同语义，`app.v4.js:72714-72727`）。
 *
 * **有意偏离**：原版 `readToArray` 连 JSON 坏掉也吞成 `[]`，然后 `write` 覆盖回去 ——
 * 用户的色板会被一次追加抹平。这里坏文件直接抛，宁可这次操作失败。
 */
export function readSwatchItems(path: string): RepoRead<unknown[]> {
  const outcome = readRepoFile(path, decodeSwatchArray)
  if (outcome.kind === 'ok') return { ok: true, value: outcome.value }
  if (outcome.kind === 'absent') return { ok: true, value: [] }
  // 空文件 = 空数组（原版 `readToArray` 同语义）：零字节不是坏文件
  if (outcome.text === '') return { ok: true, value: [] }
  // T-112：读不到时**不许**返回 `[]`——调用方会把追加后的内容整份写回，等于把一份读不到的
  // 色板抹平。`ok:false` 分支上没有 `.value`，调用方**必须**显式处理（抛或提示），吞不掉。
  if (outcome.why === 'readError') {
    return { ok: false, reason: msg.data.fn.swatchReadFailed(path, outcome.reason), fallback: [] }
  }
  if (outcome.why === 'notJson') {
    return { ok: false, reason: msg.data.fn.swatchNotJson(path), fallback: [] }
  }
  return { ok: false, reason: msg.data.fn.swatchRootNotArray(path), fallback: [] }
}

/**
 * 写色板全文：旧内容先进 `.bak`，再原子写；写不进去抛（不让用户以为发送成功）。
 * 落盘成功后通知订阅者（`stores/swatch.ts` 靠它刷新投影）。
 */
/**
 * 色板数组文件的 decode：顶层必须是数组（条目是开放形状，由各消费侧自己判）。
 */
function decodeSwatchArray(raw: unknown): Decoded<unknown[]> | DecodeFail {
  return isUnknownArray(raw) ? { value: raw } : shapeFail('', 'array', raw)
}

/**
 * 色板文件的仓库实例（**按路径缓存**：同一文件的队列 / 监听表不能因多次构造而分裂）。
 *
 * 落盘序列（读原文 → `.bak` / `.corrupt-*` → 原子写）只有一份，在 `file-repo.persist`；
 * 这里不再手写 `readTextOutcome` + `backupOrQuarantine` + `writeTextFileAtomic`。
 *
 * **具名例外：用 `fileRepo` 而不是 `dataRepo`**（`file-repo.ts` 头上登记的那条）。
 * 色板是**用户资产**，`dataRepo` 的内存兜底会让"读不到"变成"空色板 + 写入落内存"（静默丢，
 * 比抛错更糟）。这里宁可在无 Node 时抛 `NO_NODE`（**响的**）。
 */
const swatchSubscribed = new Set<string>()
function swatchRepo(path: string): Repo<unknown[]> {
  // 「按路径取 Repo」只有一份实现：`./repo-at`（本文件不再自己维护 `Map<path, Repo>`）
  const repo = repoAt<unknown[]>(path, () => [], decodeSwatchArray)
  if (!swatchSubscribed.has(path)) {
    swatchSubscribed.add(path)
    // 仓库的"写成功"通知转发到色板自己的变更通道（`stores/swatch.ts` 订的是这个）
    repo.onChange(() => emitChange())
  }
  return repo
}

/**
 * 写色板全文：旧内容进 `.bak`（原文坏了改存 `.corrupt-*`）、原子写、写不进去抛、成功后 emit。
 *
 * T-112（读不到不许写）与 TD-09-21（坏原文隔离）由 `file-repo.rawOverwrite` 保证 ——
 * 调用方不必自己读原文，也不许在原文坏时退回普通写。
 */
export function writeSwatchItems(path: string, items: unknown[]): void {
  swatchRepo(path).overwrite(items)
}

// ---------- 变更通知（本地写成功后重读投影） ----------

const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) listener()
}

/** 订阅"色板文件刚被写过"。返回取消函数 */
export function onChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ---------- 刀2：三个文件的语义读写 ----------

/** 最近色上限默认值（原版 `g_ShuLiang = 10`，`sf.js:181`） */
export const DEFAULT_RECENT_LIMIT = 10

/** 合法上限（原版 `sf.js:408` 判 `ls < 0 || ls > 15`；**`0` 合法**，含义是"不保留最近色"） */
export const RECENT_LIMIT_MAX = 15

/** 读自定义色数组（`userColor.ini`） */
export function readCustomItems(): RepoRead<unknown[]> {
  return readSwatchItems(swatchFilePath())
}

/** 读最近色数组（`vecently.ini`） */
export function readRecentItems(): RepoRead<unknown[]> {
  return readSwatchItems(recentFilePath())
}

/**
 * 读最近色保留条数。
 *
 * 原版 `ChuShiHua`（`sf.js:55-61`）：`readFile` 成功才 `parseInt`，且**只认 `0 < n < 16`**，
 * 否则保持默认 10。**这里照抄那个上界判断**，包括它的副作用：
 * 设置里写 `0`（合法、含义是"不保留"）之后重开面板会读回 `10`。这是官方既有行为，
 * 不是我们写错 —— 要改必须先跟用户确认，别当成 bug 静默修掉。
 *
 * 读失败（`EPERM` / `EBUSY`）按默认值处理并落日志：这是**偏好级**数据（丢了只影响
 * "保留几条"），不该让整个面板读不出来。数据文件（色板本身）的读失败仍然抛。
 */
export function readRecentLimit(): RepoRead<number> {
  // 这个文件是 `.txt`（纯文本整数，不是 JSON）⇒ 走纯文本档；数据文件才走 `readRepoFile`
  const read = readOwnFileText(recentLimitPath())
  if (read.status === 'error') {
    return {
      ok: false,
      reason: msg.data.fn.swatchReadFailed(recentLimitPath(), read.reason),
      fallback: DEFAULT_RECENT_LIMIT,
    }
  }
  if (read.status === 'notSeen') return { ok: true, value: DEFAULT_RECENT_LIMIT }

  const value = parseInt(read.text, 10)
  return {
    ok: true,
    value:
      Number.isFinite(value) && value > 0 && value <= RECENT_LIMIT_MAX
        ? value
        : DEFAULT_RECENT_LIMIT,
  }
}

/** 颜色项的 `hex`；不是颜色项返回空串（调用方决定要不要抛） */
function itemHex(item: unknown): string {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ''
  const color = (item as { color?: unknown }).color
  if (!color || typeof color !== 'object' || Array.isArray(color)) return ''
  const hex = (color as { hex?: unknown }).hex
  return typeof hex === 'string' ? hex : ''
}

/**
 * 追加一条自定义色（按钮 1 / 4 的落点）。
 *
 * 原版 `TianJiaDaoWenJian`（`sf.js:341-373`）：命中 `hex` → **不添加**，只把已有色块闪三下。
 * 返回 `{ added }` 让调用方决定提示；去重在**同一条队列槽内**做完，两次连点不会加两条。
 */
export function appendCustomItem(item: unknown): { added: boolean } {
  const hex = itemHex(item)
  // 官方在这里会对 `undefined.color` 直接抛 TypeError；我们抛带原因的错误
  if (!hex) throw new CepError('PARSE', msg.data.text.swatchNotColorItem)

  // 「读 → 判重 → 写」是一个同步段：两次连点不可能插进来加两条
  const path = swatchFilePath()
  const read = readSwatchItems(path)
  // T-112：读不到就不许写回 —— 否则一次追加会把整份读不到的色板抹平
  if (!read.ok) throw new CepError('IO', read.reason)
  const items = read.value
  if (items.some((existing) => itemHex(existing) === hex)) return { added: false }

  items.push(item)
  writeSwatchItems(path, items)
  return { added: true }
}

/**
 * 写最近色保留条数，并按新上限裁剪最近色。
 *
 * 原版 `SheZhi`（`sf.js:398-423`）两步：`writeFile(zuiJinShuLiang.txt, str)` → 超限裁剪 → 写回。
 *
 * **有意偏离**（`docs/页面/11-色板面板.md` §五·二 bug 2）：官方裁剪写的是
 * `arr.splice(arr.length - i, i)` —— 删**末尾**、保最旧，与 `JianTingYanSe:202-204` 的
 * `splice(0, 1)`（删最前、保最新）方向相反。这里统一成**删最前、保最新**：
 * "最近使用"的语义该保新。用户可见差异只在"把数量调小"这一个动作上。
 */
export function setRecentLimit(limit: number): void {
  // 受保护的纯文本写：备份 + 原子写 + 回读校验（TD-09-19 / TD-16-1）。
  // 这句以前是裸 `writeTextFile`：无 tmp、非原子、无备份——面板关在写中途就留下半截数字文件。
  writeProtectedText(recentLimitPath(), String(limit))

  // 「写数量 → 读色板 → 裁剪 → 写回」是一个同步段
  const read = readSwatchItems(recentFilePath())
  if (!read.ok) throw new CepError('IO', read.reason)
  const items = read.value
  if (items.length <= limit) {
    // 数量文件已经变了，投影要跟着变；色板本身没动，不重写
    emitChange()
    return
  }
  // `writeSwatchItems` 内部会 emitChange
  writeSwatchItems(recentFilePath(), items.slice(items.length - limit))
}
