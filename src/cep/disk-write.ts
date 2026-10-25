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

/**
 * 写结果（**观测**，与 `TextRead` 同形）：`ok` = 内容已落盘；`error` + `reason` = 没写进去。
 *
 * 为什么不再是 `boolean`：`false` 说不出"为什么"，于是调用点只能二选一 ——
 * 要么当成功继续（导入报成功、原件已覆盖），要么退回普通写把原子保证摘掉（TD-09-27）。
 * 有 `reason` 才能"失败就抛"，把原因一路带到用户面前。
 */
export type WriteOutcome = { status: 'ok' } | { status: 'error'; reason: string }

/** 删除结果：成功（删掉了，或本来就不在） / 失败 + 原因 */
export type RemoveOutcome = { ok: true } | { ok: false; reason: string }

/** Node 系统错误归一成写失败的 reason（`ENOENT` 在写入语境 = 路径不存在） */
function classifyWriteError(e: unknown): { status: 'error'; reason: string } {
  const classified = classifyFsError(e)
  if (classified.status === 'notSeen') {
    return { status: 'error', reason: 'ENOENT（写入时路径不存在）' }
  }
  return classified
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
  const written = writeTextFileAtomic(path, text)
  if (written.status === 'error') {
    throw new CepError('IO', msg.data.fn.backupFailedAbortWrite(path, written.reason))
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
  /** CAS：传了就要比对，`'conflict'` 表示磁盘原文已不是它（别人改过），本次不写 */
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
): 'written' | 'conflict' {
  if (previous !== null) backupOrQuarantine(path, previous, opts)

  if (opts.expected !== undefined) {
    const compared = compareSync(path, opts.expected)
    // 别人改过 → 放弃这次写（原语义：让上层丢更新而不是覆盖）
    if (compared === 'diff') return 'conflict'
    // 比不了（读不到原文 / 无 Node）→ **不写**：拿不到原文就没有"没被改过"的证据（TD-09-24）
    if (compared === 'unknown') {
      throw new CepError('IO', msg.data.fn.fileCompareReadFailed(path))
    }
  }

  // 原子写失败必须抛：退回普通写等于主动摘掉 rename 保护（TD-09-27）
  const written = writeTextFileAtomic(path, text)
  if (written.status === 'error') {
    throw new CepError('IO', msg.data.fn.fileWriteFailed(path, written.reason))
  }

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

  return 'written'
}

/**
 * **唯一异步落盘入口**。绝大多数调用方用这个。
 * 与 `writeDiskSync` 的差别只有"怎么读原文"：这里用 async 读，那里用同步读。
 */
export async function writeDisk(
  path: string,
  text: string,
  opts: DiskWriteOptions = {},
): Promise<'written' | 'conflict'> {
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
export function writeDiskSync(
  path: string,
  text: string,
  opts: DiskWriteOptions = {},
): 'written' | 'conflict' {
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

/** 原子写文本（内部）：失败返回 `{status:'error'}`，调用方必须抛/中止（TD-09-27） */
function writeTextFileAtomic(absPath: string, text: string): WriteOutcome {
  if (!hasNode()) return { status: 'error', reason: 'Node 不可用（--enable-nodejs 未开）' }
  try {
    atomicReplace(absPath, text)
    return { status: 'ok' }
  } catch (e) {
    return classifyWriteError(e)
  }
}

/**
 * 写 base64 到文件（原子）：库文件（`sj_ku*` / `sj_dz*`）走这条路。
 *
 * 写出的字节与直写完全一致（同一个 `buffer.from(base64,'base64')`），
 * 只是落到目标前多一次 rename。
 */
export function writeBase64File(absPath: string, base64: string): WriteOutcome {
  if (!hasNode()) return { status: 'error', reason: 'Node 不可用（--enable-nodejs 未开）' }
  try {
    const buffer = nodeRequire('buffer').Buffer
    atomicReplaceBytes(absPath, buffer.from(base64, 'base64'))
    return { status: 'ok' }
  } catch (e) {
    return classifyWriteError(e)
  }
}

/**
 * 删除文件。
 *
 * `ok: true` 的语义是**"这个路径上现在没有这个文件了"**，不是"我调用成功了"。
 * 但"不在"只能由 `ENOENT` 证明 —— **不许用 `existsSync`**：它对"存在但 stat 不到"（权限）
 * 也返回 `false`，会把 `EPERM` 谎报成删成功，调用方据此以为旧文件已清走（T-109）。
 */
export function removeFile(absPath: string): RemoveOutcome {
  if (!hasNode()) return { ok: false, reason: 'Node 不可用（--enable-nodejs 未开）' }
  try {
    nodeRequire('fs').unlinkSync(absPath)
    return { ok: true }
  } catch (e) {
    const classified = classifyFsError(e)
    return classified.status === 'notSeen' ? { ok: true } : { ok: false, reason: classified.reason }
  }
}
