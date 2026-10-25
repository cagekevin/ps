// 是什么：**唯一的写盘入口** —— 备份（`.bak` / `.corrupt-*`）→ CAS 比对 → 原子写 →（可选）回读校验
// 两个门：`writeDisk`（async，绝大多数）/ `writeDiskSync`（sync，给同步调用方）
// 替代了什么：三条并行的写盘路，各自把「备份 + 原子写」写了一遍：
//   ① `Repo.persist`（JSON 值，file-repo.ts）
//   ② `protected-text.writeNow`（纯文本 + 回读校验）
//   ③ 各处裸 `writeTextFileAtomic` / `writeTextFile`（`action-library` 无 `.bak`、`style-library-repo` 手写 `.bak`、
//      `rename`/`system` 导出文件用的还是**非原子**写）
//   合并理由：同一个事实（文件内容）有多条写入口 ⇒ 备份策略/原子性/错误文案各写一遍，改一处漏两处。
// 现状：`writeTextFile` / `writeTextFileAtomic` / `atomicReplace` 都是本文件的**内部函数**（`fs.ts` 已删，
//   原语不再有第二个出口）；本文件之外没有任何地方能直接落字节。
// 禁止：在 `data/` 层再写一份 `if (有原文) .bak` + `writeTextFileAtomic` —— 那是又一条路。

import { hasNode, nodeRequire } from './node'
import { classifyFsError, readTextAsync, readTextSync } from './fs-read'

// ── 写结果：**没有结果类型**（ADR-0014：写不可降级必须抛） ─────────────────────────
//
// 这里曾经有三个结果类型（`WriteOutcome{status}` / `RemoveOutcome{ok}` /
// `'written' | 'conflict'` 裸字符串），同一个"写一次盘"三套语法。
// 最要命的是 `'written' | 'conflict'`：`conflict` = **写根本没发生**，却是一个
// **可以被整个丢弃的返回值** —— 实测 13 个调用点里 12 个不判，写失败静默溜走。
//
// 现在四个写入口全部返回 `void`：成功就正常返回，失败一律 `throw`。
// 没有返回值可判 ⇒ 没有"忘了判"这条路。唯一需要分辨冲突的是 `file-repo.rawUpdate`
// 的重试，它 catch `code === 'CONFLICT'`（判别码，不是字符串比较）。

/** Node 系统错误归一成写失败的 reason（`ENOENT` 在写入语境 = 路径不存在） */
function writeFailureReason(e: unknown): string {
  const classified = classifyFsError(e)
  if (classified.status === 'notSeen') return 'ENOENT（写入时路径不存在）'
  return classified.reason
}

let tmpSeq = 0

/**
 * 本进程专属的临时文件名（D-42）。
 *
 * 带 pid + 进程内序号 + 随机串后两个进程互不覆盖；同一文件系统内 rename 仍是原子的。
 */
function uniqueTmpPath(absPath: string): string {
  const pid = globalThis.process.pid
  tmpSeq += 1
  return `${absPath}.${pid}-${tmpSeq}-${Math.random().toString(36).slice(2, 8)}.tmp`
}

/** 写 tmp 失败时别把垃圾文件留在用户目录里 */
function dropTmp(fs: { unlinkSync: (path: string) => void }, tmp: string): void {
  try {
    fs.unlinkSync(tmp)
  } catch {
    // tmp 可能根本没写出来，删不掉属正常
  }
}
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { isUsableJsonText } from '@/utils/json'
import { log } from '@/utils/logger'

export interface BackupOptions {
  /**
   * 原文自己坏了（半截 JSON / 乱码）时，改存 `<文件>.corrupt-<ts>`，**不让坏内容顶 `.bak`**
   * —— 顶着 `.bak` 会让人以为有退路，其实是坏字节（TD-09-21）。
   */
  quarantineOnCorrupt?: boolean
  /** 日志标签，默认 `repo` */
  tag?: string
}

/**
 * 备份上一版：写 `.bak`，或在 `quarantineOnCorrupt` 且原文不可用时改存 `.corrupt-<ts>`。
 *
 * **唯一一份**：所有落盘路径共用。以后要加"备份策略"就改这里，**不许**在调用方再写一遍。
 */
function backupOrQuarantine(target: string, previous: string, opts: BackupOptions = {}): void {
  if (opts.quarantineOnCorrupt && !isUsableJsonText(previous)) {
    const quarantine = `${target}.corrupt-${Date.now()}`
    writeBackupFile(quarantine, previous)
    log.warn(opts.tag ?? 'repo', `${target} 原文不是可用 JSON，已另存为 ${quarantine}（不写 .bak）`)
    return
  }
  writeBackupFile(`${target}.bak`, previous)
}

/**
 * 备份文件本身也**必须原子**：半截 `.bak` 是假退路（与 TD-09-19 / TD-09-27 同一类）。
 * 写失败即抛 —— 绝不在没有退路的情况下覆盖原件。
 */
function writeBackupFile(path: string, text: string): void {
  try {
    writeTextFileAtomic(path, text)
  } catch (e) {
    // 换一句更具体的话：备份写不进去 = "没有退路"，比通用"写入失败"更该让人停手。
    // **不是吞**：原错误被包进新错误的 message 里，照旧往上抛。
    throw new CepError(
      'IO',
      msg.data.fn.backupFailedAbortWrite(path, e instanceof Error ? e.message : String(e)),
    )
  }
}

/**
 * 落盘前的 CAS 比对（D-26）。返回 `'same' | 'diff' | 'unknown'`。
 *
 * 必须用**同步**读：`readTextAsync` 是 async，即使 Node 读本身是同步的，`await` 也会让出
 * 一个 microtask 边界——另一个实例正好能在这个边界里完成一次完整写入，
 * 于是"比对通过 → rename"之间被插一脚，照样丢更新（`tests/data/repo-cross-process.test.ts`）。
 */
function compareSync(target: string, expected: string | null): 'same' | 'diff' | 'unknown' {
  const read = readTextSync(target)
  // 读不到 ≠ 没人改过（TD-09-24）：旧实现读不到给 null，`expected` 也是 null 时
  // `null === null` 判 'same'，于是权限错时并发守卫恒真、别的面板刚建的文件被覆盖。
  if (read.status === 'error') return 'unknown'
  const actual = read.status === 'ok' ? read.text : null
  return actual === expected ? 'same' : 'diff'
}

export interface DiskWriteOptions extends BackupOptions {
  /**
   * 上一版原文：`undefined` = 由本函数自己读；`null` = 没有原文（不写 `.bak`）。
   * 调用方已经读过原文时传进来，省一次读。
   */
  previous?: string | null
  /**
   * CAS：传了就要比对。磁盘原文已不是它（别人改过）⇒ **抛 `CepError('CONFLICT')` 且不写**。
   * 调用方要重试就 catch 这个码（`file-repo.rawUpdate` 就是这么做的），不许比字符串。
   */
  expected?: string | null
  /** 写完回读比对，证明"确实写对了"（比"尽力写对"强一档） */
  verifyReadBack?: boolean
  /**
   * 读不到上一版原文时**抛**，不许当成"没有原文"继续写（T-112）。
   *
   * 给"整份覆盖"用（`file-repo` 的 `rawOverwrite`）：它会把旧内容整份抹平且没有第二份，
   * 所以必须先证明原文读得到。普通 `update` 不需要 —— 它读失败时本来就拒绝写（D-42）。
   *
   * 有了这个开关，**数据层不必自己读原文** ⇒ `readTextSync` 的消费者只剩本文件一个。
   */
  requireReadable?: boolean
}

/**
 * 落盘核心（同步）：顺序固定 —— 备份 → CAS 比对 → 原子写 →（可选）回读校验。
 *
 * 比对故意放在 `.bak` 之后、原子写之前：中间只剩「写 tmp + rename」，能压多短压多短（D-26）。
 * 写失败一律抛（ADR-14：这里不做任何兜底）。
 */
function writeCore(
  path: string,
  text: string,
  previous: string | null,
  opts: DiskWriteOptions,
): void {
  if (previous !== null) backupOrQuarantine(path, previous, opts)

  if (opts.expected !== undefined) {
    const compared = compareSync(path, opts.expected)
    // 别人改过 → **抛 `CONFLICT`**，不写。返回一个字符串会被调用点丢掉（实测 12/13 丢掉），
    // 而 `rawUpdate` 需要靠这个判别码决定"重读重跑 mutator"，不能靠 reason 字符串比。
    if (compared === 'diff') throw new CepError('CONFLICT', path)
    // 比不了（读不到原文 / 无 Node）→ **不写**：拿不到原文就没有"没被改过"的证据（TD-09-24）
    if (compared === 'unknown') {
      throw new CepError('IO', msg.data.fn.fileCompareReadFailed(path))
    }
  }

  // 原子写失败必须抛：退回普通写等于主动摘掉 rename 保护（TD-09-27）
  writeTextFileAtomic(path, text)

  if (opts.verifyReadBack) {
    const after = readTextSync(path)
    if (after.status !== 'ok' || after.text !== text) {
      log.error(
        'repo',
        `${path} 写入后回读不一致`,
        after.status === 'ok' ? after.text : after.status,
      )
      throw new CepError('IO', msg.data.fn.protectedReadBackMismatch(path))
    }
  }
}

/**
 * **唯一异步落盘入口**（给"读原文本身就得异步"的调用方：用户选的外部路径）。
 *
 * 与 `writeDiskSync` 的差别只有"怎么读原文"。两者都**返回 `void`，失败抛**
 * （ADR-0014 写不可降级）—— 没有返回值可丢，也就没有"忘了判"。
 */
export async function writeDisk(
  path: string,
  text: string,
  opts: DiskWriteOptions = {},
): Promise<void> {
  let previous = opts.previous
  if (previous === undefined) {
    const before = await readTextAsync(path)
    if (before.status === 'error' && opts.requireReadable) {
      throw new CepError('IO', msg.data.fn.fileReadFailedAbortWrite(path, before.reason))
    }
    // 读不到 / 不存在都不写 `.bak`（不拿猜测当备份）
    previous = before.status === 'ok' ? before.text : null
  }
  return writeCore(path, text, previous, opts)
}

/**
 * **唯一同步落盘入口**。给同步函数用（`settings` 偏好、`cloud/ledger` 台账、`log-file` 日志、
 * `system` 快捷键脚本）。
 */
export function writeDiskSync(path: string, text: string, opts: DiskWriteOptions = {}): void {
  let previous = opts.previous
  if (previous === undefined) {
    const before = readTextSync(path)
    if (before.status === 'error' && opts.requireReadable) {
      throw new CepError('IO', msg.data.fn.fileReadFailedAbortWrite(path, before.reason))
    }
    previous = before.status === 'ok' ? before.text : null
  }
  return writeCore(path, text, previous, opts)
}

// ---------- 底层写原语（**全部内部化**：`fs.ts` 不再导出任何写） ----------
//
// 为什么集中在这里：这些是"把字节落到磁盘"的最后一层。散在 `fs.ts` 里导出，
// 谁都能绕过 `writeDisk` 直写 —— 那就没有 `.bak`、没有 CAS、没有 `onChange`。
// 本模块之外**不许**再出现 `writeFileSync` / `renameSync` 落文本或字节。

/** 直写文本（内部）：目录不存在会建 */
function writeTextFile(absPath: string, text: string): void {
  const fs = nodeRequire('fs')
  const path = nodeRequire('path')
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, text, 'utf8')
}

/** 直写字节（内部）：目录不存在会建 */
function writeBytesFile(absPath: string, bytes: string | Uint8Array): void {
  const fs = nodeRequire('fs')
  const path = nodeRequire('path')
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, bytes)
}

/** 写 tmp → rename；失败清理 tmp 并抛（内部，文本版） */
function atomicReplace(absPath: string, text: string): void {
  const fs = nodeRequire('fs')
  const tmp = uniqueTmpPath(absPath)
  try {
    writeTextFile(tmp, text)
    fs.renameSync(tmp, absPath)
  } catch (e) {
    dropTmp(fs, tmp)
    throw e
  }
}

/**
 * 写 tmp → rename（内部，二进制版）。
 *
 * 为什么不能省：`writeFileSync` 直写目标，进程被杀 / 磁盘满就留半截文件 ——
 * 库文件（`sj_ku*` / `sj_dz*`）是用户资产里最贵的，半截 JSON 会让整库回退默认值（TD-09-15）。
 * tmp 名 / 清理 / 错误归一与文本版**共用同一套**，不新建第二套。
 */
function atomicReplaceBytes(absPath: string, bytes: string | Uint8Array): void {
  const fs = nodeRequire('fs')
  const tmp = uniqueTmpPath(absPath)
  try {
    writeBytesFile(tmp, bytes)
    fs.renameSync(tmp, absPath)
  } catch (e) {
    dropTmp(fs, tmp)
    throw e
  }
}

/** 原子写文本（内部）：**失败直接抛**（ADR-0014 写不可降级） */
function writeTextFileAtomic(absPath: string, text: string): void {
  if (!hasNode()) throw new CepError('NO_NODE', 'Node 不可用（--enable-nodejs 未开）')
  try {
    atomicReplace(absPath, text)
  } catch (e) {
    throw new CepError('IO', msg.data.fn.fileWriteFailed(absPath, writeFailureReason(e)))
  }
}

/**
 * 写 base64 到文件（原子）：库文件（`sj_ku*` / `sj_dz*`）走这条路。
 *
 * 写出的字节与直写完全一致（同一个 `buffer.from(base64,'base64')`），
 * 只是落到目标前多一次 rename。
 */
export function writeBase64File(absPath: string, base64: string): void {
  if (!hasNode()) throw new CepError('NO_NODE', 'Node 不可用（--enable-nodejs 未开）')
  try {
    const buffer = nodeRequire('buffer').Buffer
    atomicReplaceBytes(absPath, buffer.from(base64, 'base64'))
  } catch (e) {
    throw new CepError('IO', msg.data.fn.fileWriteFailed(absPath, writeFailureReason(e)))
  }
}

/**
 * 删除文件。
 *
 * `ok: true` 的语义是**"这个路径上现在没有这个文件了"**，不是"我调用成功了"。
 * 但"不在"只能由 `ENOENT` 证明 —— **不许用 `existsSync`**：它对"存在但 stat 不到"（权限）
 * 也返回 `false`，会把 `EPERM` 谎报成删成功，调用方据此以为旧文件已清走（T-109）。
 */
export function removeFile(absPath: string): void {
  if (!hasNode()) throw new CepError('NO_NODE', 'Node 不可用（--enable-nodejs 未开）')
  try {
    nodeRequire('fs').unlinkSync(absPath)
  } catch (e) {
    const classified = classifyFsError(e)
    // `ENOENT` = 这个路径上本来就没有文件 ⇒ 目标已达成，不算失败
    if (classified.status === 'notSeen') return
    throw new CepError('IO', msg.data.fn.fileRemoveFailed(absPath, classified.reason))
  }
}
