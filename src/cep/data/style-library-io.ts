// 是什么：样式库导入导出的落地层 —— `.kux` 容器与四类单库文件的读写、id 重写、备份、替换后的清理
// 唯一入口：库文件/索引的**导入导出写盘**只能经过这里（日常编辑写库仍走 style-library-repo）
// 替代了什么：原版 `N_.export/exportCurrent/import/importAdd/replaceFileName`（契约 §3.4）
//   与四库各自的 `export/importAdd`（契约 §3.3/§3.4）
// 谁在用：`commands/style.ts`
// 禁止：页面不许 import；不弹文件对话框（命令层负责）；不碰 jsx

import { b64ToUtf8, utf8ToB64 } from '@/cep/codec'
import { readBase64File, readExternalText } from '@/cep/fs-read'
import { userDir } from '@/cep/paths'
import { readBefore, removeFile, writeBase64File, writeDiskSync } from '@/cep/disk-write'
import { isKuLibraryFileName } from '@/domain/ku-format'
import { isUsableJsonText } from '@/utils/json'
import { isDecodeFail } from '@/utils/decode'
import { describeDecodeFail } from './repo-read'
import {
  encodeKuContainer,
  isSafeKuEntryName,
  KU_CONTAINER_ORDER,
  parseKuContainer,
  parseKuGroups,
  remapKuContainer,
  type KuContainerFile,
  type KuFileEntry,
  type KuRawGroup,
} from '@/domain/ku-io'
import {
  fileNameOf,
  normalizeStyleIndex,
  type StyleWarehouse,
  type StyleWarehouseIndex,
} from '@/domain/style-library'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { log } from '@/utils/logger'
import { kuGuid, readIndexState, readKuFileText, styleIndexWriter } from './style-library-repo'
import { REPLACE_WITHOUT_BASELINE } from './types'
// 与日常编辑共用同一批 sj_ku* 文件；没有队列了 —— 读改写是同步段，不可能交错
import { isRecord } from '@/utils/guards'
import { runExclusiveAsync } from './exclusive'

/** 进度回调：只报"正在做什么"，不猜百分比（仓库数量差异太大） */
export type KuIoProgress = (detail: string) => void

const CODEC = { encode: utf8ToB64, decode: b64ToUtf8 }

export interface KuImportResult {
  /** 导入后索引里的仓库数（替换 = 文件里的数量；追加 = 原有 + 新增） */
  warehouses: number
  /** 实际写盘的文件数（`data: false` 的条目跳过） */
  files: number
  /** 替换导入时旧文件被移到哪里；追加导入为空串 */
  recycleDir: string
}

// `indexPath()` 已不需要：索引的读/备份/写全在 `styleIndexWriter.overwrite` 里。

/**
 * 把被覆盖的原文件**存成可用的 `.bak`**；原文已经不可用时另存为 `.corrupt-<时间戳>`。
 *
 * 契约：**`.bak` = 可读的上一版** ——
 * 原文自己坏了时 `.bak` 存的就是坏的，回滚看着成功、打开还是坏，等于没有退路。
 * 所以这里的判据不是"备份写成功"，而是"这份内容配叫备份"：
 * - 库文件（`sj_ku*`）先过 `isUsableJsonText`（`utils/json.ts`，全仓唯一一份判据）；
 * - 判"不可用"时**不写 `.bak`**，改成 `<文件>.corrupt-<ts>` 原字节留存 ——
 *   既满足"`.bak` 一定是好的"，又不丢掉任何字节（坏文件也得能拿去查原因）。
 *
 * 为什么放这一层（ADR-0026 ②）：`fs.ts` 只报"写进去没有"，它不知道 `.kux` 长什么样；
 * "这份原文还算不算库文件"是领域知识，只有数据层有解析器。
 * 旁路图（`kuStyle/*.png` 等）不是库文件，不适用本判据，照旧写 `.bak`。
 */
function classifyOriginal(relative: string, path: string, base64: string): 'keep' | 'quarantined' {
  if (isKuLibraryFileName(relative)) {
    // 解不出来（二进制乱码）就是"不可用"，与解析失败同一条判据
    let text: string
    try {
      text = b64ToUtf8(base64)
    } catch {
      text = ''
    }
    if (!isUsableJsonText(text)) {
      const quarantine = `${path}.corrupt-${Date.now()}`
      // 写不进去就抛（底层文案已含 `<path>.corrupt-*` 与原因）。
      // **不在这里再包一层** —— 包了就是"备份失败：x.corrupt（写入失败：x.corrupt（EACCES））"。
      // `.corrupt-<ts>` 是新文件：它还在就说明同一毫秒内撞了，停下比覆盖安全
      writeBase64File(quarantine, base64, {
        cas: { mode: 'compare', expected: { status: 'absent' } },
        backup: { mode: 'none', why: '坏原文的隔离副本就是退路，不再为它留退路' },
      })
      log.warn(
        'style',
        `原文不是可用的库文件，已另存为 ${relative}.corrupt-*（不写 .bak，免得把坏内容当备份）`,
      )
      return 'quarantined'
    }
  }
  return 'keep'
}

/**
 * 写一个文件到用户数据目录。目标已存在时先把原文备份成 `<文件>.bak`
 * （与 `fileRepo` / `updateKuGroups` 同约定，ADR-12）：导入替换不允许没有退路。
 *
 * 返回「写之前是否已存在」：失败回滚时只删这次新建的文件，不碰被覆盖的原件。
 */
function writeKuFile(relative: string, base64: string): boolean {
  const path = `${userDir()}/${relative}`
  // T-109：**读不到 ≠ 没有**。读不到时若当成"本次新建"，回滚会删掉一个本来就存在的文件；
  // 若照旧覆盖，原文没进 `.bak` 就再也回不去。所以「读不到 ⇒ 中止这次导入」——但这条判据
  // 不在本文件：`readBefore` 是全仓唯一构造点，读不到它直接抛（文案含路径与原因）。
  const before = readBefore(path, 'bytes')
  // **只有判据留在这里**（"这份原文算不算可用库文件"是领域知识）；
  // 写 `.bak` 的机制归落盘入口（`backup: 'keep'`），本文件不再自己写一份。
  const classified =
    before.status === 'absent' ? 'none' : classifyOriginal(relative, path, before.text)
  // 写不进去就抛（底层文案已含完整路径与原因）。不二次包装。
  // CAS 比的是**本次读到的原文**：读与写之间别的面板可能已经改过这一份库文件。
  writeBase64File(path, base64, {
    cas: { mode: 'compare', expected: before },
    backup:
      classified === 'keep'
        ? // 原文已读到，直接交给落盘入口写 `.bak`，省一次重读
          { mode: 'keep', before }
        : {
            mode: 'none',
            why: classified === 'quarantined' ? '坏原文已另存 .corrupt-*' : '没有原文可备',
          },
  })
  return before.status === 'ok'
}

/**
 * 库数据里引用的旁路图（样式组 `.psd` / 样式项 `.png` / 渐变预览图），顺序即落盘顺序。
 *
 * 只读契约已定的三个键（`group.id` / `item.id` / `gradient.fileName`）：
 * `gradient{}` 内部与样式项效果字段未定案（契约 §6.1 #1a），这里不读、不改。
 */
function sidecarNamesOf(kind: 'style' | 'gradient', groups: readonly KuRawGroup[]): string[] {
  const names = new Set<string>()

  for (const group of groups) {
    const list = Array.isArray(group.list) ? group.list : []

    if (kind === 'style') {
      if (typeof group.id === 'string' && group.id) names.add(`kuStyle/${group.id}.psd`)
      for (const item of list) {
        if (isRecord(item) && typeof item.id === 'string' && item.id) {
          names.add(`kuStyle/${item.id}.png`)
        }
      }
      continue
    }

    for (const item of list) {
      if (!isRecord(item)) continue
      const gradient = item.gradient
      if (isRecord(gradient) && typeof gradient.fileName === 'string' && gradient.fileName) {
        names.add(`Gradient/${gradient.fileName}`)
      }
    }
  }

  return [...names]
}

/**
 * 一个仓库的旁路图清单。
 *
 * 库文件**不存在**就跳过（这个库没导出过）；**读不懂就抛** —— 跳过会让导出的包少几张图，
 * 而用户以为导全了（同一个导出流程里，「读不到」已经抛了，两种失败不该两种待遇）。
 */
function sidecarNamesOfWarehouse(warehouse: StyleWarehouse): string[] {
  const names: string[] = []

  for (const kind of ['style', 'gradient'] as const) {
    const fileName = fileNameOf(warehouse, kind)
    const text = readKuFileText(fileName)
    if (!text) continue
    const groups = parseKuGroups(text)
    if (isDecodeFail(groups)) {
      throw new CepError('PARSE', msg.data.fn.libFileBadShape(fileName, describeDecodeFail(groups)))
    }
    names.push(...sidecarNamesOf(kind, groups.value))
  }

  return names
}

/** 导出容器时 `arrFileData` 的条目：库文件 → 该仓库的旁路图（契约 §3.4；样本 A 无旁路图，顺序为推断） */
function assertSafeNames(entries: readonly KuFileEntry[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!isSafeKuEntryName(entry.name)) {
      throw new CepError('PARSE', msg.data.fn.importFileNameInvalid(entry.name))
    }
    if (seen.has(entry.name)) throw new CepError('PARSE', msg.data.fn.importFileNameDup(entry.name))
    seen.add(entry.name)
  }
}

/**
 * 校验容器：`store.list` 引用的库文件必须在 `arrFileData` 里，
 * 否则写完索引就指向一个不存在的文件（action-archive 的 `validateImported` 同口径）。
 */
function validateContainer(file: KuContainerFile): void {
  assertSafeNames(file.arrFileData)

  const names = new Set(file.arrFileData.map((entry) => entry.name))
  for (const warehouse of file.store.list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind)
      if (fileName && !names.has(fileName)) {
        throw new CepError('PARSE', msg.data.fn.indexRefMissingFile(fileName))
      }
    }
  }
}

/**
 * 可写前提下的索引：索引读不懂就抛。
 * 覆盖导入例外（它本来就要整份替换，且替换前会留 `.bak`），见 `importKuArchive`。
 */
function currentIndex(): StyleWarehouseIndex {
  // `readIndexState()` 读不懂就抛
  return readIndexState()
}

export function kuArchiveDefaultName(current: boolean): string {
  if (!current) return '全部仓库.kux'
  const index = currentIndex()
  const name = index.list[index.index]?.name
  // UNVERIFIED: 契约 §3.5 只给了单库默认名（`<仓库名>-<库名>预设.<ext>`），没有 `.kux` 当前仓库的默认名；
  // 这里沿用动作页的 `<仓库名>.kux` 口径（依赖契约 §3.5 的命名规则 + 动作页现有实现）
  return name ? `${name}.kux` : '全部仓库.kux'
}

/**
 * 导出 `.kux`。
 *
 * `current` = 只导出当前仓库（`store.index = 0`，`list` 只留当前项，契约 §3.4 `exportCurrent`）。
 * 库载荷直接取磁盘文件字节的 base64（契约 §2.5 第 2 点：容器层不做内容变换）；
 * 读不到的文件写布尔 `false`，不省略（§2.5 第 3 点）。
 */
export function exportKuArchive(
  current: boolean,
  targetPath: string,
  onProgress?: KuIoProgress,
): void {
  // 整段是一个同步段：读索引 + 读库文件 + 原子写导出包，中间不可能被导入/编辑插进来
  const index = currentIndex()
  const list = current ? [index.list[index.index]].filter(Boolean) : index.list
  if (!list.length) throw new CepError('PARSE', msg.data.text.noExportableWarehouse)

  const store: StyleWarehouseIndex = current
    ? { ...index, index: 0, list: [{ ...list[0] }] }
    : index

  const arrFileData: KuFileEntry[] = []
  let done = 0

  for (const warehouse of list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind)
      if (!fileName) continue
      // 契约 §2.5：`data` 不是字符串时就是布尔 `false`，语义是"这个文件当时读不到"。
      // 所以这里**有意**把 `notSeen` 与 `error` 合成都写成 `false`（导出格式要求的形状）
      const read = readBase64File(`${userDir()}/${fileName}`)
      if (read.status === 'error') log.warn('style', `导出：${fileName} 读不到`, read.failure)
      arrFileData.push({ name: fileName, data: read.status === 'ok' ? read.base64 : false })
    }

    // UNVERIFIED: 契约 §3.4 只写“4 个库文件 + 旁路图”，实测样本 A 没有旁路图；
    // 这里按「每个仓库先 4 个库文件、再该仓库的旁路图」落，顺序未在真实样本上核对
    for (const name of sidecarNamesOfWarehouse(warehouse)) {
      // 同上：契约 §2.5 要求 `false` 表示"读不到"，这里有意把两态合成 `false`
      const sidecar = readBase64File(`${userDir()}/${name}`)
      if (sidecar.status === 'error') log.warn('style', `导出：${name} 读不到`, sidecar.failure)
      arrFileData.push({ name, data: sidecar.status === 'ok' ? sidecar.base64 : false })
    }

    done += 1
    onProgress?.(msg.data.fn.warehousesReadProgress(String(done), String(list.length)))
  }

  // 一条都读不到就不是"导出了一个空仓库"，而是索引/磁盘不对：宁可失败也不产出空壳文件
  if (!arrFileData.length) throw new CepError('PARSE', msg.data.text.noExportableLibFile)

  // 导出包是**新文件**，无 `.bak` 概念（`previous: null`）；走唯一落盘入口（原子写）
  writeDiskSync(targetPath, encodeKuContainer({ arrFileData, store }), {
    backup: { mode: 'none', why: '导出包是新文件，无原文可备' },
    cas: { mode: 'skip', why: '用户经系统对话框选定导出路径，覆盖意图已确认' },
  })
}

/** 把替换掉的旧文件移进回收目录（与 `deleteWarehouse` 同一个 `.deleted-<时间戳>` 约定，可整目录拷回） */
function moveToRecycle(names: readonly string[], keep: ReadonlySet<string>, dir: string): string[] {
  const moved: string[] = []
  for (const name of names) {
    if (keep.has(name)) continue
    const read = readBase64File(`${userDir()}/${name}`)
    // 读不到就跳过：旧文件留在原位，不会丢；只是没进回收目录（宁留孤儿，不丢原件）
    if (read.status === 'error') {
      log.warn('style', `替换导入：旧文件读不到，跳过回收：${name}`, read.failure)
      continue
    }
    if (read.status === 'notSeen') continue
    // 两段各自窄 catch，各说各的话 —— 合并成一个大 catch 会把"复制失败"和"删不掉"说成同一句
    try {
      // 回收目录名带时间戳，副本必定是新文件
      writeBase64File(`${dir}/${name}`, read.base64, {
        cas: { mode: 'compare', expected: { status: 'absent' } },
        backup: { mode: 'none', why: '回收副本是新文件，无原文可备' },
      })
    } catch (e) {
      // 复制失败就**不能删原件**：删了就等于原件没了、回收目录里也没有
      log.warn('style', `替换导入：旧文件没复制进回收目录（原件保留原位）：${name}`, e)
      continue
    }
    try {
      removeFile(`${userDir()}/${name}`)
    } catch (e) {
      log.warn('style', `替换导入：旧文件已复制但删不掉（留下孤儿）：${name}`, e)
      continue
    }
    moved.push(name)
  }
  return moved
}

/** 旧索引引用的全部文件（四个库 + 旁路图），用于替换导入后的清理 */
function filesOfIndex(index: StyleWarehouseIndex): string[] {
  const names: string[] = []
  for (const warehouse of index.list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind)
      if (fileName) names.push(fileName)
    }
    names.push(...sidecarNamesOfWarehouse(warehouse))
  }
  return [...new Set(names)]
}

/**
 * 导入 `.kux`。
 *
 * `append = false` 是**覆盖**：导入前把旧索引原文写成 `sj_kuStoreInfo.ini.bak`，
 * 旧库文件在索引写成功后才移进 `.deleted-<时间戳>/`（顺序照 `deleteWarehouse`：先复制 → 再写索引 → 最后删原件）。
 * `append = true` 是**追加**：只 push 仓库，本地已有文件不动。
 *
 * 两条路径都先给内层文件发新 id（`replaceFileName`，契约 §5.2 第 3 点），否则会覆盖本地同名文件。
 */
export function importKuArchive(
  append: boolean,
  sourcePath: string,
  onProgress?: KuIoProgress,
): Promise<KuImportResult> {
  // 长事务互斥（`ku-files` 域）：读用户文件是真 await，中间能让出 macrotask，
  // 第二次触发会插进来写同一批 `sj_ku*` ⇒ 索引与实际文件对不上。
  return runExclusiveAsync('ku-files', '样式库导入', async () => {
    // **唯一需要 async 的地方**：读用户对话框选的文件（无 Node 时走 jsx 回退，物理上不可能同步）。
    // 拿到文本立刻转交同步写段 —— 写段里写 `await` 是语法错误，所以「读 → 改 → 写」不可能被打断。
    const read = await readExternalText(sourcePath)
    // T-107：导入前读不到就不许继续。两种不 ok 这里同果（都抛同一句），文案不变
    if (read.status !== 'ok') throw new CepError('IO', msg.data.text.readImportFileFailed)
    return importKuFromText(append, read.text, onProgress)
  })
}

/** 同步写段：解析 → 写库文件 → 写索引 → 回收旧文件。整段不可打断。 */
function importKuFromText(
  append: boolean,
  text: string,
  onProgress?: KuIoProgress,
): KuImportResult {
  onProgress?.('解析导入文件')
  const decoded = parseKuContainer(text)
  if (isDecodeFail(decoded)) throw new CepError('PARSE', describeDecodeFail(decoded))
  const imported = decoded.value
  validateContainer(imported)

  const remappedRead = remapKuContainer(imported, kuGuid, CODEC)
  if (isDecodeFail(remappedRead)) throw new CepError('PARSE', describeDecodeFail(remappedRead))
  const remapped = remappedRead.value
  validateContainer(remapped)

  // 覆盖导入允许索引已损坏：它本来就要整份替换，且替换前会留 `.bak`；追加导入必须能读懂原索引
  const before = append ? currentIndex() : readIndexState()
  const oldFiles = append ? [] : filesOfIndex(before)
  const nextIndex = normalizeStyleIndex(remapped.store)

  const written: string[] = []
  const created: string[] = []
  try {
    for (const entry of remapped.arrFileData) {
      if (typeof entry.data !== 'string') continue
      if (!writeKuFile(entry.name, entry.data)) created.push(entry.name)
      written.push(entry.name)
      onProgress?.(
        msg.data.fn.filesWrittenProgress(
          String(written.length),
          String(remapped.arrFileData.length),
        ),
      )
    }

    if (append) {
      styleIndexWriter.update((value) => {
        const current = value
        const list = [...current.list, ...nextIndex.list]
        // 与 action-archive 同口径：追加后选中最后一个新仓库。
        // UNVERIFIED: 原版样式页 importAdd 是否也这样切，未实测（契约 §3.4 只写了写盘顺序）
        return { ...value, index: list.length - 1, list }
      })
    } else {
      // 整份替换索引：`overwrite` = 读原文 → `.bak` → 原子写 → emit。
      // 以前这里自己 `readExternalText` + `backupOrQuarantine` + 裸写三步 ——
      // 那是上层在做底层的事（T-112 的"读不到就中止"由 `overwrite` 的 D-42 拒绝覆盖保证）。
      styleIndexWriter.replace(nextIndex, REPLACE_WITHOUT_BASELINE)
    }
  } catch (e) {
    // 只回滚这次新建的文件：被覆盖的原件还在原位（`.bak` 是它的上一版）
    for (const name of created) {
      try {
        removeFile(`${userDir()}/${name}`)
      } catch (err) {
        // 回滚删不掉只留下孤儿，但必须留下来历（删没删掉得让调用方知道）
        log.warn('style', `回滚：删新建文件失败（留下孤儿）：${name}`, err)
      }
    }
    // 原始失败照旧往上抛：回滚是清理，不是"把失败变成成功"
    throw e
  }

  const recycleDir = append ? '' : `${userDir()}/.deleted-${Date.now()}`
  if (recycleDir) {
    const keep = new Set(remapped.arrFileData.map((entry) => entry.name))
    const moved = moveToRecycle(oldFiles, keep, recycleDir)
    log.info('style', '覆盖导入完成', { recycleDir, moved })
  }

  return {
    warehouses: append ? before.list.length + nextIndex.list.length : nextIndex.list.length,
    files: written.length,
    recycleDir,
  }
}
