// 是什么：**所有落盘的唯一出口** —— 备份（`.bak` / `.corrupt-*`）→ CAS 比对 → 原子写 →（可选）回读校验
// 唯一入口：**四个门**（不是"一个函数"，是四种动作，各有不可替代的理由）：
//   `writeDisk`（async 文本）· `writeDiskSync`（sync 文本）· `writeBase64File`（字节：库文件）· `removeFile`（删除）
//   本模块之外**不许**出现 `writeFileSync` / `renameSync` / `unlinkSync` 落用户数据
// 替代了什么：三条并行的写盘路（`Repo.persist` / `protected-text.writeNow` / 各处裸 `writeTextFileAtomic`）
// 谁在用：`data/`（Repo、settings、style-library-io、action-archive）· `cloud/` · `commands/` · `log-file`
// 禁止：在 `data/` 层再写一份 `if (有原文) .bak` + `writeTextFileAtomic`；给 `cas` / `backup` 加默认值
//   （「忘了表态」与「决定不比」必须在编译期分开 —— 这是本文件唯一的结构保证）
// 缺口（登记于 `18-横切-写落盘-收口-2026-10-26.md` §6）：入口数 6 ≠ 层数 4；「不许自写 .bak」只能靠这句声明

import { hasNode, nodeRequire } from './node'
import { classifyFsError, readBase64File, readTextAsync, readTextSync } from './fs-read'

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

/**
 * Node 系统错误归一成写失败的 reason。**只报观测层给的原因，不在这里拼中文**。
 *
 * 文案由 `msg.data.fn.fileWriteFailed` 统一渲染（刀 3：生产者不写用户话）。
 * `notSeen` 在这条通道上没有 `reason`（它本义是"读的时候不存在"）—— 写到一半 `ENOENT`
 * 说明目录没了，报错误码本身即可。
 */
function writeFailureReason(e: unknown): string {
  const classified = classifyFsError(e)
  return classified.status === 'notSeen' ? 'ENOENT' : classified.reason
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
   * —— 顶着 `.bak` 会让人以为有退路，其实是坏字节。
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
 * 备份文件本身也**必须原子**：半截 `.bak` 是假退路（与同一类）。
 * 写失败即抛 —— 绝不在没有退路的情况下覆盖原件。
 */
function writeBackupFile(path: string, text: string): void {
  // **不包**：`writeTextFileAtomic` 抛的已经是完整一句「写入失败：<path>（原因）」，
  // 路径里就写着 `.bak`。再包一层会把同一句话套两遍（"备份失败：x.bak（写入失败：x.bak（EACCES））"）。
  // 文案只在一处产生 —— 上层要看"是哪一步"，看调用栈/日志，不靠把句子套起来。
  writeTextFileAtomic(path, text)
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
  // 读不到 ≠ 没人改过：旧实现读不到给 null，`expected` 也是 null 时
  // `null === null` 判 'same'，于是权限错时并发守卫恒真、别的面板刚建的文件被覆盖。
  if (read.status === 'error') return 'unknown'
  const actual = read.status === 'ok' ? read.text : null
  return actual === expected ? 'same' : 'diff'
}

/**
 * 字节版的 CAS 比对：比的是 base64 串。
 *
 * 为什么不复用 `compareSync`：它用 `readTextSync` 把文件读成**字符串**，库文件（`.kus/.kug/.kux`）
 * 是二进制，读成文本会得到乱码或解码失败 —— 那样「比不了」会被误判成「没被改过」。
 * 同一份字节的 base64 编码确定（无换行），所以可以直接 `===`。
 */
function compareBase64Sync(target: string, expected: string | null): 'same' | 'diff' | 'unknown' {
  const read = readBase64File(target)
  if (read.status === 'error') return 'unknown'
  const actual = read.status === 'ok' ? read.base64 : null
  return actual === expected ? 'same' : 'diff'
}

/**
 * 并发策略（**必填**）：比，还是不比。不比必须给理由。
 *
 * 为什么必填：旧版 `expected?: string | null` 是可选参数 —— 「忘了传」与「决定不比」
 * 在类型上同形，实测 13 个调用点**全部**落在「没传」这一支，CAS 只被 `Repo.update` 一条路用到。
 * 现在不比要显式写 `{ cas: 'skip', why }`，漏表态编译不过。
 *
 * `expected: null` = 「这个路径上应当没有文件」（新文件）；`expected: '<原文>'` = 「磁盘上应当还是这份」。
 * 不一致 ⇒ **抛 `CepError('CONFLICT')` 且不写**。
 */
export type CasMode = { mode: 'compare'; expected: string | null } | { mode: 'skip'; why: string }

/**
 * 备份策略（**必填**）：留退路，还是不留。不留必须给理由。
 *
 * `previous`：`undefined` = 由本函数自己读；`null` = 没有原文（不写 `.bak`）。
 * 调用方已经读过原文时传进来，省一次读。
 */
export type BackupMode = { mode: 'keep'; previous?: string | null } | { mode: 'none'; why: string }

export interface DiskWriteOptions extends BackupOptions {
  /** 并发策略：必须表态（见 `CasMode`） */
  cas: CasMode
  /** 备份策略：必须表态（见 `BackupMode`） */
  backup: BackupMode
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
 * 步骤 ①：备份上一版。**只备份**，不判断好坏、不决定写不写。
 *
 * `backup: 'none'` = 调用方表态不留退路（要写理由）；`previous === null` = 没有原文可备。
 */
function backupStep(path: string, previous: string | null, opts: DiskWriteOptions): void {
  if (opts.backup.mode === 'none') return
  if (previous === null) return
  backupOrQuarantine(path, previous, opts)
}

/**
 * 步骤 ①（字节版）：把上一版库文件写到 `<path>.bak`。
 *
 * **不做 quarantine 判定**：「这份原文还算不算可用库文件」是领域知识
 * （`b64ToUtf8` 解不解得开 + 文件名前缀），归 `style-library-io`（收口 plan T1 方案 A）。
 * 本函数只负责"把旧字节挪到 `.bak`"，不知道 `.kux` 长什么样。
 */
function backupBytesStep(path: string, previous: string | null, opts: DiskWriteOptions): void {
  if (opts.backup.mode === 'none') return
  if (previous === null) return
  const buffer = nodeRequire('buffer').Buffer
  atomicReplaceBytes(`${path}.bak`, buffer.from(previous, 'base64'))
}

/** CAS 的两种口径：文本比字符串，字节比 base64（同一份字节的 base64 编码是确定的） */
type Comparator = (target: string, expected: string | null) => 'same' | 'diff' | 'unknown'

/**
 * 步骤 ②：CAS 比对。**只比对**，不比就返回，比不过就抛。
 *
 * 比对故意放在 `.bak` 之后、原子写之前：中间只剩「写 tmp + rename」，能压多短压多短（D-26）。
 * 比较口径由调用方给（`compareSync` / `compareBase64Sync`）—— 本函数不知道是文本还是字节。
 */
function casStep(path: string, opts: DiskWriteOptions, compare: Comparator): void {
  if (opts.cas.mode === 'skip') return
  const compared = compare(path, opts.cas.expected)
  // 别人改过 → **抛 `CONFLICT`**，不写。返回一个字符串会被调用点丢掉（实测 12/13 丢掉），
  // 而 `rawUpdate` 需要靠这个判别码决定"重读重跑 mutator"，不能靠 reason 字符串比。
  if (compared === 'diff') throw new CepError('CONFLICT', path)
  // 比不了（读不到原文 / 无 Node）→ **不写**：拿不到原文就没有"没被改过"的证据
  if (compared === 'unknown') {
    throw new CepError('IO', msg.data.fn.fileCompareReadFailed(path))
  }
}

/** 步骤 ③：原子写。**只写**；失败直接抛（退回普通写等于主动摘掉 rename 保护） */
function atomicStep(path: string, text: string): void {
  writeTextFileAtomic(path, text)
}

/** 步骤 ③（字节版）：原子写字节。**只写**；失败直接抛 */
function atomicBytesStep(path: string, base64: string): void {
  if (!hasNode()) throw new CepError('NO_NODE', 'Node 不可用（--enable-nodejs 未开）')
  try {
    const buffer = nodeRequire('buffer').Buffer
    atomicReplaceBytes(path, buffer.from(base64, 'base64'))
  } catch (e) {
    throw new CepError('IO', msg.data.fn.fileWriteFailed(path, writeFailureReason(e)))
  }
}

/** 步骤 ④：回读校验。**只校验**；`on` 为假时不做任何事 */
function verifyStep(path: string, text: string, on: boolean | undefined): void {
  if (!on) return
  const after = readTextSync(path)
  if (after.status !== 'ok' || after.text !== text) {
    log.error('repo', `${path} 写入后回读不一致`, after.status === 'ok' ? after.text : after.status)
    throw new CepError('IO', msg.data.fn.protectedReadBackMismatch(path))
  }
}

/**
 * 落盘核心（同步）：**只编排**四步 —— 备份 → CAS 比对 → 原子写 →（可选）回读校验。
 *
 * 四步各自是独立函数（`backupStep` / `casStep` / `atomicStep` / `verifyStep`），
 * 本函数里不再出现任何 `if (opts.xxx)` 判定：判定归各步，编排归这里。
 * 写失败一律抛（ADR-14：这里不做任何兜底）。
 */
function writeCore(
  path: string,
  text: string,
  previous: string | null,
  opts: DiskWriteOptions,
): void {
  backupStep(path, previous, opts)
  casStep(path, opts, compareSync)
  atomicStep(path, text)
  verifyStep(path, text, opts.verifyReadBack)
}

/** 步骤 ④（字节版）：回读校验。`on` 为假时不做任何事 */
function verifyBytesStep(path: string, base64: string, on: boolean | undefined): void {
  if (!on) return
  const after = readBase64File(path)
  if (after.status !== 'ok' || after.base64 !== base64) {
    log.error(
      'repo',
      `${path} 写入后回读不一致`,
      after.status === 'ok' ? after.base64 : after.status,
    )
    throw new CepError('IO', msg.data.fn.protectedReadBackMismatch(path))
  }
}

/** 字节版落盘核心：备份 → CAS → 原子写 →（可选）回读校验。四步与文本版对称 */
function writeBytesCore(
  path: string,
  base64: string,
  previous: string | null,
  opts: DiskWriteOptions,
): void {
  backupBytesStep(path, previous, opts)
  casStep(path, opts, compareBase64Sync)
  atomicBytesStep(path, base64)
  verifyBytesStep(path, base64, opts.verifyReadBack)
}

/**
 * **唯一异步落盘入口**（给"读原文本身就得异步"的调用方：用户选的外部路径）。
 *
 * 与 `writeDiskSync` 的差别只有"怎么读原文"。两者都**返回 `void`，失败抛**
 * （ADR-0014 写不可降级）—— 没有返回值可丢，也就没有"忘了判"。
 */
/** 备份要用的「上一版」：`undefined` = 本函数自己读；`null` = 调用方声明没有原文 */
function previousInput(opts: DiskWriteOptions): string | null | undefined {
  return opts.backup.mode === 'none' ? null : opts.backup.previous
}

export async function writeDisk(path: string, text: string, opts: DiskWriteOptions): Promise<void> {
  let previous = previousInput(opts)
  // `requireReadable` **独立于备份**：不写 `.bak` 也必须能要求"原文读得到" ——
  // 偏好文件就是这样（它不备份，但读不到就绝不把默认值写回去覆盖用户设置）。
  if (previous === undefined || (previous === null && opts.requireReadable)) {
    const before = await readTextAsync(path)
    if (before.status === 'error' && opts.requireReadable) {
      throw new CepError('IO', msg.data.fn.fileReadFailedAbortWrite(path, before.reason))
    }
    // 读不到 / 不存在都不写 `.bak`（不拿猜测当备份）
    if (previous === undefined) previous = before.status === 'ok' ? before.text : null
  }
  return writeCore(path, text, previous, opts)
}

/**
 * **唯一同步落盘入口**。给同步函数用（`settings` 偏好、`cloud/ledger` 台账、`log-file` 日志、
 * `system` 快捷键脚本）。
 */
export function writeDiskSync(path: string, text: string, opts: DiskWriteOptions): void {
  let previous = previousInput(opts)
  if (previous === undefined || (previous === null && opts.requireReadable)) {
    const before = readTextSync(path)
    if (before.status === 'error' && opts.requireReadable) {
      throw new CepError('IO', msg.data.fn.fileReadFailedAbortWrite(path, before.reason))
    }
    if (previous === undefined) previous = before.status === 'ok' ? before.text : null
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
 * 库文件（`sj_ku*` / `sj_dz*`）是用户资产里最贵的，半截 JSON 会让整库回退默认值。
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
 * **字节落盘入口**：库文件（`sj_ku*` / `sj_dz*`）走这条路。
 *
 * 与 `writeDiskSync` 同一个 `DiskWriteOptions`：`cas` / `backup` 都必填，
 * 不像旧版那样"连选项都不收"（6 处库文件写因此长期零保护）。
 *
 * `cas.expected` 比的是 **base64 串**（`compareBase64Sync`），不是文本。
 */
export function writeBase64File(absPath: string, base64: string, opts: DiskWriteOptions): void {
  let previous = previousInput(opts)
  if (previous === undefined) {
    const before = readBase64File(absPath)
    if (before.status === 'error' && opts.requireReadable) {
      throw new CepError('IO', msg.data.fn.fileReadFailedAbortWrite(absPath, before.reason))
    }
    previous = before.status === 'ok' ? before.base64 : null
  }
  writeBytesCore(absPath, base64, previous, opts)
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
