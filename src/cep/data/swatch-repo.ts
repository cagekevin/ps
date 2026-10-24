// 是什么：色板三个数据文件（自定义色 / 最近色 / 最近数量）的磁盘读写 + **全数据层唯一的写队列**
// 唯一入口：`%APPDATA%/FengZiSeBan/` 下三个文件的读写只能经过这里
// 替代了什么：原版 `sf.js` 的 `sf_DuQu` / `sf_XieRu`（`:486-528`）与 `g_FN`（`:10-14`）；
//   本仓 `style-library-repo.ts` 里的私有实现（`:206-213` / `:836-883`）
// 谁在用：`commands/swatch.ts`、`commands/style.ts`（四条色板命令）、`stores/swatch.ts`、
//   `cep/data/style-library-repo.ts`（只 import 队列）
// 禁止：页面/组件不许 import；读不到不许当"没有"；不许新增同步读（ADR-26 ④）

import { USER_DIR } from '@/cep/env'
import { readTextOutcome, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { isUsableJsonText } from '@/utils/json'
import { log } from '@/utils/logger'
import { writeProtectedTextNow } from './protected-text'
import { runQueued } from './write-queue'

/** 写队列搬到了 `data/write-queue.ts`（TD-09-18：数据层只留一条链） */
export { runQueued } from './write-queue'
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
    throw new CepError('IO', `用户数据目录不以 ${USER_DIR} 结尾，色板路径算不出来：${dir}`)
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
export async function readSwatchItems(path: string): Promise<unknown[]> {
  const read = await readTextOutcome(path)
  // T-112：读不到时**不许**返回 `[]`——调用方会把追加后的内容整份写回，等于把一份读不到的
  // 色板抹平。`notSeen`（还没有色板文件）才是"空数组"。
  if (read.status === 'error') {
    throw new CepError('IO', `色板文件读不到：${path}（${read.reason}）`)
  }
  if (read.status === 'notSeen' || read.text === '') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(read.text)
  } catch (e) {
    log.error('swatch', '色板文件不是合法 JSON', e)
    throw new CepError('PARSE', `色板文件不是合法 JSON：${path}`)
  }
  if (!Array.isArray(parsed)) throw new CepError('PARSE', `色板文件顶层不是数组：${path}`)
  return parsed
}

/**
 * 写色板全文：旧内容先进 `.bak`，再原子写；写不进去抛（不让用户以为发送成功）。
 * 落盘成功后通知订阅者（`stores/swatch.ts` 靠它刷新投影）。
 */
export async function writeSwatchItems(path: string, items: unknown[]): Promise<void> {
  const read = await readTextOutcome(path)
  // T-112：读不到时**不许写**——`.bak` 写不出来（没有旧原文），整份覆盖就等于旧色板没有第二份。
  // `notSeen`（还没有色板文件）照旧：没有旧内容，不需要 `.bak`。
  if (read.status === 'error') {
    throw new CepError('IO', `色板文件读不到，已中止写入：${path}（${read.reason}）`)
  }
  if (read.status === 'ok' && read.text) {
    // TD-09-21：`.bak` 必须是**可读的上一版**。原文自己坏了（半截 JSON / 乱码）时，
    // 把坏内容存成 `.bak` 只会让人以为有退路 —— 改存 `.corrupt-*`，坏字节一个不丢，
    // 但绝不让"坏内容"顶着 `.bak` 这个名字。
    if (isUsableJsonText(read.text)) {
      writeTextFile(`${path}.bak`, read.text)
    } else {
      const quarantine = `${path}.corrupt-${Date.now()}`
      writeTextFile(quarantine, read.text)
      log.warn('swatch', `色板原文不是可用的 JSON，已另存为 ${quarantine}（不写 .bak）`)
    }
  }
  const written = writeTextFileAtomic(path, JSON.stringify(items))
  if (written.status === 'error') {
    throw new CepError('IO', `色板文件写入失败：${path}（${written.reason}）`)
  }
  emitChange()
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
export function readCustomItems(): Promise<unknown[]> {
  return readSwatchItems(swatchFilePath())
}

/** 读最近色数组（`vecently.ini`） */
export function readRecentItems(): Promise<unknown[]> {
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
export async function readRecentLimit(): Promise<number> {
  const read = await readTextOutcome(recentLimitPath())
  if (read.status === 'error') {
    log.warn('swatch', '最近色数量读不到，按默认值处理', read.reason)
    return DEFAULT_RECENT_LIMIT
  }
  if (read.status === 'notSeen') return DEFAULT_RECENT_LIMIT

  const value = parseInt(read.text, 10)
  return Number.isFinite(value) && value > 0 && value <= RECENT_LIMIT_MAX
    ? value
    : DEFAULT_RECENT_LIMIT
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
export function appendCustomItem(item: unknown): Promise<{ added: boolean }> {
  return runQueued(async () => {
    const hex = itemHex(item)
    // 官方在这里会对 `undefined.color` 直接抛 TypeError；我们抛带原因的错误
    if (!hex) throw new CepError('PARSE', '不是颜色项（缺少 color.hex），未添加')

    const path = swatchFilePath()
    const items = await readSwatchItems(path)
    if (items.some((existing) => itemHex(existing) === hex)) return { added: false }

    items.push(item)
    await writeSwatchItems(path, items)
    return { added: true }
  })
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
export function setRecentLimit(limit: number): Promise<void> {
  return runQueued(async () => {
    // 受保护的纯文本写：备份 + 原子写 + 回读校验（TD-09-19 / TD-16-1）。
    // 这句以前是裸 `writeTextFile`：无 tmp、非原子、无备份——面板关在写中途就留下半截数字文件。
    await writeProtectedTextNow(recentLimitPath(), String(limit))

    const items = await readSwatchItems(recentFilePath())
    if (items.length <= limit) {
      // 数量文件已经变了，投影要跟着变；色板本身没动，不重写
      emitChange()
      return
    }
    // `writeSwatchItems` 内部会 emitChange
    await writeSwatchItems(recentFilePath(), items.slice(items.length - limit))
  })
}
