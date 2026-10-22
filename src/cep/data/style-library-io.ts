// 是什么：样式库导入导出的落地层 —— `.kux` 容器与四类单库文件的读写、id 重写、备份、替换后的清理
// 唯一入口：库文件/索引的**导入导出写盘**只能经过这里（日常编辑写库仍走 style-library-repo）
// 替代了什么：原版 `N_.export/exportCurrent/import/importAdd/replaceFileName`（契约 §3.4）
//   与四库各自的 `export/importAdd`（契约 §3.3/§3.4）
// 谁在用：`commands/style.ts`
// 禁止：页面不许 import；不弹文件对话框（命令层负责）；不碰 jsx

import { DATA_FILES } from '@/cep/env'
import {
  b64ToUtf8,
  readBase64File,
  readTextSmart,
  removeFile,
  userDir,
  utf8ToB64,
  writeBase64File,
  writeTextFile,
} from '@/cep/fs'
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
  readStyleWarehouseIndex,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex,
} from '@/domain/style-library'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import { kuGuid, readKuFileText, styleIndexRepo } from './style-library-repo'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function indexPath(): string {
  return `${userDir()}/${DATA_FILES.styleLibrary}`
}

function parseOrThrow<T>(read: () => T): T {
  try {
    return read()
  } catch (e) {
    throw new CepError('PARSE', e instanceof Error ? e.message : '导入文件结构不正确')
  }
}

function fileNameOf(warehouse: StyleWarehouse | undefined, kind: KuKind): string {
  const value = warehouse?.[kind]
  return typeof value === 'string' ? value : ''
}

/**
 * 写一个文件到用户数据目录。目标已存在时先把原文备份成 `<文件>.bak`
 * （与 `fileRepo` / `updateKuGroups` 同约定，ADR-12）：导入替换不允许没有退路。
 *
 * 返回「写之前是否已存在」：失败回滚时只删这次新建的文件，不碰被覆盖的原件。
 */
function writeKuFile(relative: string, base64: string): boolean {
  const path = `${userDir()}/${relative}`
  const previous = readBase64File(path)
  if (previous !== null) writeBase64File(`${path}.bak`, previous)
  if (!writeBase64File(path, base64)) throw new CepError('IO', `写入文件失败：${relative}`)
  return previous !== null
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

/** 一个仓库的旁路图清单。库文件读不懂就跳过：只会少带图片，不会导出坏数据 */
async function sidecarNamesOfWarehouse(warehouse: StyleWarehouse): Promise<string[]> {
  const names: string[] = []

  for (const kind of ['style', 'gradient'] as const) {
    const text = await readKuFileText(fileNameOf(warehouse, kind))
    if (!text) continue
    try {
      names.push(...sidecarNamesOf(kind, parseKuGroups(text)))
    } catch (e) {
      log.warn('style', `导出：${fileNameOf(warehouse, kind)} 读不懂，跳过它的旁路图`, e)
    }
  }

  return names
}

/** 导出容器时 `arrFileData` 的条目：库文件 → 该仓库的旁路图（契约 §3.4；样本 A 无旁路图，顺序为推断） */
function assertSafeNames(entries: readonly KuFileEntry[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!isSafeKuEntryName(entry.name)) {
      throw new CepError('PARSE', `导入文件名不合法：${entry.name}`)
    }
    if (seen.has(entry.name)) throw new CepError('PARSE', `导入文件名重复：${entry.name}`)
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
        throw new CepError('PARSE', `索引引用了不存在的文件：${fileName}`)
      }
    }
  }
}

/** 当前索引 + 归一化（越界 `index` 夹回合法范围），读坏了也返回，调用方决定是否中止 */
async function indexState(): Promise<{ value: StyleWarehouseIndex; degraded: string }> {
  const stored = await styleIndexRepo.read()
  const parsed = readStyleWarehouseIndex(stored.value)
  return {
    value: parsed.value,
    degraded: [stored.degraded ?? '', parsed.degraded].filter(Boolean).join('；'),
  }
}

/**
 * 可写前提下的索引：索引读不懂就抛。
 * 覆盖导入例外（它本来就要整份替换，且替换前会留 `.bak`），见 `importKuArchive`。
 */
async function currentIndex(): Promise<StyleWarehouseIndex> {
  const { value, degraded } = await indexState()
  if (degraded) throw new CepError('PARSE', `仓库索引不可用：${degraded}`)
  return value
}

export async function kuArchiveDefaultName(current: boolean): Promise<string> {
  if (!current) return '全部仓库.kux'
  const index = await currentIndex()
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
export async function exportKuArchive(
  current: boolean,
  targetPath: string,
  onProgress?: KuIoProgress,
): Promise<void> {
  const index = await currentIndex()
  const list = current ? [index.list[index.index]].filter(Boolean) : index.list
  if (!list.length) throw new CepError('PARSE', '没有可导出的仓库')

  const store: StyleWarehouseIndex = current
    ? { ...index, index: 0, list: [{ ...list[0] }] }
    : index

  const arrFileData: KuFileEntry[] = []
  let done = 0

  for (const warehouse of list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind)
      if (!fileName) continue
      arrFileData.push({
        name: fileName,
        data: readBase64File(`${userDir()}/${fileName}`) ?? false,
      })
    }

    // UNVERIFIED: 契约 §3.4 只写“4 个库文件 + 旁路图”，实测样本 A 没有旁路图；
    // 这里按「每个仓库先 4 个库文件、再该仓库的旁路图」落，顺序未在真实样本上核对
    for (const name of await sidecarNamesOfWarehouse(warehouse)) {
      arrFileData.push({ name, data: readBase64File(`${userDir()}/${name}`) ?? false })
    }

    done += 1
    onProgress?.(`已读取 ${done}/${list.length} 个仓库`)
  }

  // 一条都读不到就不是"导出了一个空仓库"，而是索引/磁盘不对：宁可失败也不产出空壳文件
  if (!arrFileData.length) throw new CepError('PARSE', '没有可导出的库文件（索引里的文件都读不到）')

  writeTextFile(targetPath, encodeKuContainer({ arrFileData, store }))
}

/** 把替换掉的旧文件移进回收目录（与 `deleteWarehouse` 同一个 `.deleted-<时间戳>` 约定，可整目录拷回） */
function moveToRecycle(names: readonly string[], keep: ReadonlySet<string>, dir: string): string[] {
  const moved: string[] = []
  for (const name of names) {
    if (keep.has(name)) continue
    const base64 = readBase64File(`${userDir()}/${name}`)
    if (base64 === null) continue
    try {
      if (writeBase64File(`${dir}/${name}`, base64) && removeFile(`${userDir()}/${name}`)) {
        moved.push(name)
      }
    } catch (e) {
      log.warn('style', `替换导入：旧文件没能移进回收目录：${name}`, e)
    }
  }
  return moved
}

/** 旧索引引用的全部文件（四个库 + 旁路图），用于替换导入后的清理 */
async function filesOfIndex(index: StyleWarehouseIndex): Promise<string[]> {
  const names: string[] = []
  for (const warehouse of index.list) {
    for (const kind of KU_CONTAINER_ORDER) {
      const fileName = fileNameOf(warehouse, kind)
      if (fileName) names.push(fileName)
    }
    names.push(...(await sidecarNamesOfWarehouse(warehouse)))
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
export async function importKuArchive(
  append: boolean,
  sourcePath: string,
  onProgress?: KuIoProgress,
): Promise<KuImportResult> {
  const text = await readTextSmart(sourcePath)
  if (text === null) throw new CepError('IO', '读取导入文件失败')

  onProgress?.('解析导入文件')
  const imported = parseOrThrow(() => parseKuContainer(text))
  validateContainer(imported)

  const remapped = parseOrThrow(() => remapKuContainer(imported, kuGuid, CODEC))
  validateContainer(remapped)

  // 覆盖导入允许索引已损坏：它本来就要整份替换，且替换前会留 `.bak`；追加导入必须能读懂原索引
  const before = append ? await currentIndex() : (await indexState()).value
  const oldFiles = append ? [] : await filesOfIndex(before)
  const nextIndex = readStyleWarehouseIndex(remapped.store).value

  const written: string[] = []
  const created: string[] = []
  try {
    for (const entry of remapped.arrFileData) {
      if (typeof entry.data !== 'string') continue
      if (!writeKuFile(entry.name, entry.data)) created.push(entry.name)
      written.push(entry.name)
      onProgress?.(`已写入 ${written.length}/${remapped.arrFileData.length} 个文件`)
    }

    if (append) {
      await styleIndexRepo.update((value) => {
        const current = readStyleWarehouseIndex(value).value
        const list = [...current.list, ...nextIndex.list]
        // 与 action-archive 同口径：追加后选中最后一个新仓库。
        // UNVERIFIED: 原版样式页 importAdd 是否也这样切，未实测（契约 §3.4 只写了写盘顺序）
        return { ...value, index: list.length - 1, list }
      })
    } else {
      // `fileRepo.write` 不备份，替换索引前自己留一份原文
      const previous = await readTextSmart(indexPath())
      if (previous) writeTextFile(`${indexPath()}.bak`, previous)
      await styleIndexRepo.write(nextIndex)
    }
  } catch (e) {
    // 只回滚这次新建的文件：被覆盖的原件还在原位（`.bak` 是它的上一版）
    for (const name of created) removeFile(`${userDir()}/${name}`)
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
