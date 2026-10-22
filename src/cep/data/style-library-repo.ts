// 是什么：样式库的磁盘读写 —— 仓库索引 `sj_kuStoreInfo.ini` + 当前仓库的四个库文件（读 + 写）
// 唯一入口：仓库索引 `sj_kuStoreInfo.ini` 与四类库文件的读和写只能经过这里；每次写都带 `<文件>.bak` 备份 + 单队列串行
// 替代了什么：原版 `N_`（索引，`app.v4.js:53303-53740`）+ `X_/I_/K_/E_`（四库）的 `readToArray` / `updata`
// 谁在用：`stores/style-library.ts`（读投影）、`commands/style.ts`（写）
// 禁止：页面/组件不许 import 这里（走 store / 命令）

import { DATA_FILES, USER_DIR } from '@/cep/env'
import {
  b64ToUtf8,
  hasNode,
  readBase64File,
  readTextSmart,
  removeFile,
  userDir,
  writeBase64File,
  writeTextFile,
  writeTextFileAtomic,
} from '@/cep/fs'
import {
  defaultStyleIndex,
  readKuGroups,
  readStyleWarehouseIndex,
  KU_KINDS,
  KU_TAB_LABELS,
  type KuGroup,
  type KuKind,
  type StyleWarehouse,
  type StyleWarehouseIndex,
} from '@/domain/style-library'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import { pick } from './pick'
import type { Repo } from './types'

/**
 * 索引仓库。读走 `fileRepo`（失败带 `degraded`，不抛）。
 * 写只有一个触发点：当前仓库缺某个库文件名时，由 `updateKuGroups` 在库文件**写成功之后**补登记。
 */
export const styleIndexRepo: Repo<StyleWarehouseIndex> = pick(
  () => `${userDir()}/${DATA_FILES.styleLibrary}`,
  () => defaultStyleIndex(),
)

export interface KuLibraryRead {
  groups: KuGroup[]
  /** 非空 = 这个库读不到（文件缺 / 结构不认识 / 载荷被跳过），页面必须提示 */
  note: string
}

/**
 * 读一个库文件。
 *
 * 磁盘上的库文件是「裸组数组」（契约 §2.3），但用户可能把 `.kus` 之类整份拷进这个位置，
 * 所以仍走 `domain/ku-format.ts` 的三形态分派；`data` 是布尔 `false` 的条目在那里被跳过。
 * 文件名来自索引（可能是 `.ini` 也可能是 `.json`，**扩展名不代表格式**，契约 §2.2）。
 */
export async function readKuLibrary(kind: KuKind, fileName: string): Promise<KuLibraryRead> {
  if (!fileName) return { groups: [], note: '' }

  const text = await readTextSmart(`${userDir()}/${fileName}`)
  // 文件不存在是首次使用的正常状态（索引里还没写文件名时同理），不算读失败
  if (text === null || text === '') return { groups: [], note: '' }

  return readKuGroups(kind, text, b64ToUtf8)
}

export interface StyleLibrarySnapshot {
  index: StyleWarehouseIndex
  libraries: Record<KuKind, KuGroup[]>
  /** 非空 = 读到的不是真数据（索引损坏 / 某个库文件读不到） */
  degraded: string
}

function fileNameOf(warehouse: StyleWarehouse | undefined, kind: KuKind): string {
  const value = warehouse?.[kind]
  return typeof value === 'string' ? value : ''
}

/**
 * 一次读出「索引 + 当前仓库的四个库」。
 *
 * 只读当前仓库：原版 `initData` 也是 `getCurrentColorPath()` 那四个（`app.v4.js:53392-53407`），
 * 切仓库要写索引，属于第 2 段。
 */
export async function readStyleLibrary(): Promise<StyleLibrarySnapshot> {
  const stored = await styleIndexRepo.read()
  const parsed = readStyleWarehouseIndex(stored.value)
  const current = parsed.value.list[parsed.value.index]

  const libraries = {} as Record<KuKind, KuGroup[]>
  const notes: string[] = []

  for (const kind of KU_KINDS) {
    const read = await readKuLibrary(kind, fileNameOf(current, kind))
    libraries[kind] = read.groups
    if (read.note) notes.push(read.note)
  }

  return {
    index: parsed.value,
    libraries,
    degraded: [stored.degraded ?? '', parsed.degraded, ...notes].filter(Boolean).join('；'),
  }
}

/** 当前仓库某个库的绝对路径；**读**用它（索引里没登记文件名就等于没这个库，不许猜路径） */
async function currentLibPath(kind: KuKind): Promise<string> {
  const stored = await styleIndexRepo.read()
  const index = readStyleWarehouseIndex(stored.value).value
  const warehouse = index.list[index.index]
  const fileName = fileNameOf(warehouse, kind)
  if (!fileName) {
    throw new CepError('IO', `索引里没有当前仓库的${kind}库文件名`)
  }
  return `${userDir()}/${fileName}`
}

/** 读库文件里的原始组数组；读不到一律抛（不猜、不补默认） */
async function readRawGroups(kind: KuKind): Promise<{ path: string; groups: KuRawGroup[] }> {
  const path = await currentLibPath(kind)
  const text = await readTextSmart(path)
  if (text === null) throw new CepError('IO', `${kind} 库文件读不到：${path}`)

  let groups: unknown
  try {
    groups = JSON.parse(text)
  } catch (e) {
    log.error('style', `${kind} 库文件不是合法 JSON`, e)
    throw new CepError('PARSE', `${kind} 库文件不是合法 JSON`)
  }
  if (!Array.isArray(groups)) throw new CepError('PARSE', `${kind} 库文件顶层不是数组`)
  return { path, groups: groups as KuRawGroup[] }
}

/**
 * 读一个**原始项**（不过归一化）。
 *
 * `ps_ysBtnUseStyle` 发的是整个项 + `groupId`（`app.v4.js:51509-51511`），
 * 视图模型 `KuItem` 只留了展示用的字段，会把样式项的 PS 效果载荷丢掉（契约 §6.1 #1a）。
 * 所以这里从磁盘取原件，深拷贝后再交给调用方。
 */
export async function readKuItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const { groups } = await readRawGroups(kind)
  return structuredClone(itemAt(groups, groupIndex, itemIndex))
}

/**
 * 取组的 `id`（样式库的组才有：`{name,show,id,list}`，契约 §2.3）。
 *
 * 原版 `getGroupId(groupIndex)`（`app.v4.js:53013-53016`）就是 `this.info[t].id`；
 * `ps_ysBtnUseStyle` 与 `ys_AddStyle` 的 `groupId` 都来自它（`:51510` / `:51531`）。
 * 拿不到就抛：组 id 缺失时把空串发给 jsxbin，等于让 PS 去猜，不许。
 */
export async function readKuGroupId(kind: KuKind, groupIndex: number): Promise<string> {
  const { groups } = await readRawGroups(kind)
  const id = groupAt(groups, groupIndex).id
  if (typeof id !== 'string' || !id) throw new CepError('PARSE', `分组 ${groupIndex} 没有 id`)
  return id
}

// ---------- 写 ----------

/** 库文件里的组，保留全部未知键（样式项的 PS 效果载荷等，契约 §6.1 #1a） */
type KuRawGroup = Record<string, unknown>

/**
 * 所有库文件写入串行（与 `fileRepo` 每条队列同语义，D-12）：
 * 两次编辑若各自「读 → 改 → 写」并发跑，后写的会把先写的覆盖掉。
 */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task)
  queue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

/** 库文件名前缀，照抄原版 `P_()`（`app.v4.js:53284-53293`） */
const KU_FILE_PREFIX: Record<KuKind, string> = {
  color: 'Col',
  gradient: 'Gra',
  font: 'Fon',
  style: 'Sty',
}

/**
 * 16 位大写 hex。原版 `D_()` / `M_()`（`app.v4.js:53294-53302` / `:52960-53268`）：
 * 模板 `"xxxx4xxxyxxxxxxx"` 逐字符替换，`x` 取随机 hex、`y` 取 `n & 3 | 8`，最后 `toUpperCase`。
 * 模板里的字面量 `4` 原样留下（实测样本 `CB2946E8A25798FE` 第 5 位正是 `4`）。
 */
function kuGuid(): string {
  let stamp = Date.now()
  return 'xxxx4xxxyxxxxxxx'
    .replace(/[xy]/g, (ch) => {
      const n = ((stamp + Math.random() * 16) % 16) | 0
      stamp = Math.floor(stamp / 16)
      return (ch === 'x' ? n : (n & 3) | 8).toString(16)
    })
    .toUpperCase()
}

/** 各库的中文标签（原版构造函数的 `text`）；tab 文案是同一份，别在这里再抄一遍 */
function kindLabel(kind: KuKind): string {
  return KU_TAB_LABELS[KU_KINDS.indexOf(kind)]
}

/**
 * 新建组的对象。原版 `createGroupObject`：基类 `{name, show, list}`（`app.v4.js:52513-52521`），
 * 样式库覆写并加 `id: "YS" + GUID`（`:53270-53278`）——`ps_ysBtnUseStyle` / `ys_AddStyle` 要 groupId
 * （`:51510` / `:51531`），缺了它样式应用直接失败。
 */
function createKuGroup(kind: KuKind, name: string): KuRawGroup {
  const group: KuRawGroup = { name, show: true, list: [] }
  if (kind === 'style') group.id = `YS${kuGuid()}`
  return group
}

/** 删空后补的组名：原版 `deleteGroup` 里 `addGroup(this.text + "默认分组")`（`app.v4.js:52453`） */
function defaultKuGroupName(kind: KuKind): string {
  return `${kindLabel(kind)}默认分组`
}

function groupAt(groups: KuRawGroup[], groupIndex: number): KuRawGroup {
  const group = groups[groupIndex]
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    throw new CepError('PARSE', `分组 ${groupIndex} 不存在`)
  }
  return group
}

function itemList(group: KuRawGroup, groupIndex: number): unknown[] {
  const list = group.list
  if (!Array.isArray(list)) throw new CepError('PARSE', `分组 ${groupIndex} 没有 list`)
  return list
}

function itemAt(groups: KuRawGroup[], groupIndex: number, itemIndex: number): KuRawGroup {
  const item = itemList(groupAt(groups, groupIndex), groupIndex)[itemIndex]
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CepError('PARSE', `第 ${itemIndex} 项不存在`)
  }
  return item as KuRawGroup
}

/**
 * 写索引前的可用性检查（所有索引写操作的唯一入口）。
 *
 * 索引**不存在**是首次使用（正常，`read` 给默认值）；索引**存在但读不懂**是损坏 ——
 * 这时 `fileRepo.update` 会把默认值写回去，用户的仓库列表就被默认值顶掉了
 * （原件虽在 `.bak`，但用户不该承担这个）。所以这类一律抛。
 */
async function usableIndex(): Promise<StyleWarehouseIndex> {
  const stored = await styleIndexRepo.read()
  const parsed = readStyleWarehouseIndex(stored.value)
  const broken = [stored.degraded ?? '', parsed.degraded].filter(Boolean).join('；')
  if (broken) throw new CepError('PARSE', `仓库索引不可用，已中止写入：${broken}`)
  return parsed.value
}

interface KuFileTarget {
  fileName: string
  path: string
  /** 索引里还没有这个库的文件名 → 写成功后要补登记 */
  isNew: boolean
}

/**
 * 当前仓库某库的落盘目标。索引里没有文件名时按原版 `P_()` 生成一个（`app.v4.js:53284-53293`），
 * 但**先不写索引**——顺序见 `updateKuGroups`。
 *
 * 索引读坏了就抛：索引不存在是首次使用（正常，会补登记），索引**存在但读不懂**则是损坏，
 * 这时写下去会把用户的仓库列表换成默认值（原件虽留在 `.bak`，但用户不该承担这个）。
 */
async function resolveKuFile(kind: KuKind): Promise<KuFileTarget> {
  const index = await usableIndex()

  const warehouse = index.list[index.index]
  if (!warehouse) throw new CepError('PARSE', '仓库索引里没有当前仓库')

  const existing = fileNameOf(warehouse, kind)
  if (existing) return { fileName: existing, path: `${userDir()}/${existing}`, isNew: false }

  const fileName = `sj_ku${KU_FILE_PREFIX[kind]}${kuGuid()}.json`
  return { fileName, path: `${userDir()}/${fileName}`, isNew: true }
}

/**
 * 读-改-写一个库文件（所有写操作的唯一落地点）。
 *
 * 顺序照 `data/action-archive.ts`：**先写库文件 → 再写索引 → 最后清旧**。
 * 这里没有"清旧"：原版 `updata()` 只重写库文件本身（`:9127-9130`），
 * 索引文件名只在新建仓库时由 `P_()` 写死（`:53284-53293`），编辑分组/项不动它。
 *
 * 备份：写之前把原文件原文复制成 `<库文件>.bak`（与 `fileRepo` 同约定，ADR-12）。
 * **回滚方式**：把 `<库文件>.bak` 复制回 `<库文件>` 即可；索引也补写过时，
 * `sj_kuStoreInfo.ini.bak` 是它上一版（由 `fileRepo` 写），两个一起还原就回到改动前。
 *
 * 读不到文件 = 首次使用，按空数组处理（原版 `readToArray` 同语义，`:72714-72742`）；
 * 读到但不是 JSON 数组 = 损坏，抛错而不是覆盖（覆盖会丢用户数据）。
 */
async function updateKuGroups(kind: KuKind, mutate: (groups: KuRawGroup[]) => void): Promise<void> {
  const target = await resolveKuFile(kind)
  const previous = await readTextSmart(target.path)

  let groups: KuRawGroup[] = []
  if (previous !== null && previous !== '') {
    let parsed: unknown
    try {
      parsed = JSON.parse(previous)
    } catch (e) {
      log.error('style', `${kind} 库文件不是合法 JSON`, e)
      throw new CepError('PARSE', `${kind} 库文件不是合法 JSON，已中止写入：${target.fileName}`)
    }
    if (!Array.isArray(parsed)) {
      throw new CepError('PARSE', `${kind} 库文件顶层不是数组，已中止写入：${target.fileName}`)
    }
    groups = parsed as KuRawGroup[]
  }

  mutate(groups)
  const text = JSON.stringify(groups)

  // 备份先落盘：备份失败就抛（写文件会抛 NO_NODE），绝不在没有退路的情况下覆盖原件
  if (previous) writeTextFile(`${target.path}.bak`, previous)
  if (!writeTextFileAtomic(target.path, text)) {
    throw new CepError('IO', `${kind} 库文件写入失败：${target.fileName}`)
  }

  if (target.isNew) {
    // 库文件已经落盘才登记索引：反过来会让索引指向一个不存在的文件
    await styleIndexRepo.update((value) => {
      const current = readStyleWarehouseIndex(value).value
      const warehouse = current.list[current.index]
      if (!warehouse) throw new CepError('PARSE', '仓库索引里没有当前仓库')
      warehouse[kind] = target.fileName
      return { index: current.index, list: current.list }
    })
  }
}

// ---------- 仓库索引：切换 / 新建 / 改名 / 删除 ----------
//
// 原版是 `N_` 这个类上的四个方法（`app.v4.js:53323-53372`）：`rename` `:53324-53327`、
// `delete` `:53329-53356`、`add` `:53357-53363`、`select` `:53365-53372`，每个都以 `updata()` 落盘；
// 页面处理器在 `:54987-55011`。写索引一律走 `styleIndexRepo`（`fileRepo`：串行队列 + `.bak`）。

/**
 * 新建仓库条目。原版 `P_(t)`（`app.v4.js:53284-53293`）：
 * ```js
 * { name: t, color: "sj_kuCol" + D_() + ".json", gradient: "sj_kuGra" + D_() + ".json",
 *   font: "sj_kuFon" + D_() + ".json", style: "sj_kuSty" + D_() + ".json" }
 * ```
 * 四次 `D_()` 是四个**互不相同**的 16 位大写 hex —— 照抄，不是同一个 guid 拼四种前缀。
 * 只写索引不建文件：原版也不建，四个库文件在第一次写库时才落盘（`updateKuGroups`）。
 */
function createWarehouse(name: string): StyleWarehouse {
  const warehouse: StyleWarehouse = { name }
  for (const kind of KU_KINDS) warehouse[kind] = `sj_ku${KU_FILE_PREFIX[kind]}${kuGuid()}.json`
  return warehouse
}

/**
 * 切换当前仓库。原版 `select(t)`（`app.v4.js:53365-53372`）：越界归 0，然后写索引。
 *
 * 原版判的是 `t < 0 || t > list.length`，`t == list.length` 会漏过去、指向一个不存在的仓库；
 * 这里按 `[0, list.length - 1]` 判（**有意偏离**，只是把那个漏判补上）。
 */
export async function selectWarehouse(index: number): Promise<void> {
  await usableIndex()
  await enqueue(() =>
    styleIndexRepo.update((value) => {
      const current = readStyleWarehouseIndex(value).value
      const valid = Number.isInteger(index) && index >= 0 && index < current.list.length
      return { ...value, index: valid ? index : 0, list: current.list }
    }),
  )
}

/** 新建仓库。原版 `add()`（`:53357-53363`）：`list.push(P_("未命名分组"))`，名字就是「未命名分组」 */
export async function addWarehouse(): Promise<void> {
  await usableIndex()
  await enqueue(() =>
    styleIndexRepo.update((value) => {
      const current = readStyleWarehouseIndex(value).value
      const list = [...current.list, createWarehouse('未命名分组')]
      return { ...value, index: current.index, list }
    }),
  )
}

/**
 * 重命名仓库。原版 `rename(t, e)`（`:53324-53327`）：只改 `name`。
 *
 * **有意偏离**：原版不校验空名，空名会让仓库条整行变成空白（名字没了、下拉里也认不出是哪条），
 * 所以空名直接抛，不写入。
 */
export async function renameWarehouse(index: number, name: string): Promise<void> {
  const warehouseName = name.trim()
  if (!warehouseName) throw new CepError('PARSE', '仓库名不能为空')

  await usableIndex()
  await enqueue(() =>
    styleIndexRepo.update((value) => {
      const current = readStyleWarehouseIndex(value).value
      const warehouse = current.list[index]
      if (!warehouse) throw new CepError('PARSE', `仓库 ${index} 不存在`)
      warehouse.name = warehouseName
      return { ...value, index: current.index, list: current.list }
    }),
  )
}

export interface WarehouseDeleteResult {
  /** 回收目录绝对路径：库文件与组图片按原相对路径放在这里，整个目录拷回用户目录即可恢复 */
  recycleDir: string
  /** 已移走的文件（相对用户目录） */
  moved: string[]
  /** 没能删掉原件的（副本已在回收目录，原件仍在原位，需人工处理） */
  failed: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 读某个库文件里的原始组数组。
 * 读不到 / 不是数组 = 这个库没有可枚举的图片，**不抛**：枚举失败只会留下孤儿文件，不会丢数据，
 * 而删仓库这件事本身不该被一个读不动的库文件卡住。
 */
async function groupsOfFile(fileName: string | undefined): Promise<Record<string, unknown>[]> {
  if (!fileName) return []
  const text = await readTextSmart(`${userDir()}/${fileName}`)
  if (!text) return []

  try {
    const parsed: unknown = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch (e) {
    log.warn('style', `删除仓库：${fileName} 不是合法 JSON，跳过它的图片文件`, e)
    return []
  }
}

/**
 * 一个仓库在磁盘上占用的文件（相对用户目录）。清单照原版 `delete`（`:53329-53356`）：
 * 1. 四个库文件本身 —— `getIndexFullPath(t, kind)`；
 * 2. 样式库：每组 `<kuStyle>/<组 id>.psd` + 每项 `<kuStyle>/<项 id>.png`
 *    （`deleteAllGroupFile` → `deleteItemFile`，`:53030-53047` / `:53131-53148`）；
 * 3. 渐变库：每项的 `<Gradient>/<gradient.fileName>`（`deleteGroupFile`，`:52634-52661`）。
 *
 * 原版还会清 `kuStyleTempInfo` 里该组的待删样式清单（`clearDeleteStyleId`，`:53061-53069`）；
 * 那个临时文件本项目不写（库文件格式契约 §4.4），所以这里没有这一步。
 */
async function warehouseFiles(warehouse: StyleWarehouse): Promise<string[]> {
  const files: string[] = []

  for (const kind of KU_KINDS) {
    const fileName = fileNameOf(warehouse, kind)
    if (fileName) files.push(fileName)
  }

  for (const group of await groupsOfFile(fileNameOf(warehouse, 'style'))) {
    // 组的 `.psd` 与项的 `.png` 是两条独立清单（原版先 `deleteItemFile(list)` 再删组的 psd），
    // 组没有 id 时项的缩略图照样要算进来
    if (typeof group.id === 'string' && group.id) files.push(`kuStyle/${group.id}.psd`)

    const list = Array.isArray(group.list) ? group.list : []
    for (const item of list) {
      if (!isRecord(item)) continue
      if (typeof item.id === 'string' && item.id) files.push(`kuStyle/${item.id}.png`)
    }
  }

  for (const group of await groupsOfFile(fileNameOf(warehouse, 'gradient'))) {
    const list = Array.isArray(group.list) ? group.list : []
    for (const item of list) {
      if (!isRecord(item)) continue
      const gradient = item.gradient
      if (isRecord(gradient) && typeof gradient.fileName === 'string' && gradient.fileName) {
        files.push(`Gradient/${gradient.fileName}`)
      }
    }
  }

  return files
}

/**
 * 把一个文件**复制**进回收目录。不存在 = 没东西可移（原版 `delete` 对不存在的路径也是静默返回）。
 * 复制失败抛：这一步在写索引之前，抛出去时索引与原件都还没动。
 */
async function copyToRecycle(relative: string, recycleDir: string): Promise<boolean> {
  const base64 = readBase64File(`${userDir()}/${relative}`)
  if (base64 === null) return false
  if (!writeBase64File(`${recycleDir}/${relative}`, base64)) {
    throw new CepError('IO', `复制到回收目录失败：${recycleDir}/${relative}`)
  }
  return true
}

/**
 * 删除仓库。原版 `delete(t)`（`:53329-53356`）删索引项 + 修 `index` + **直接删磁盘文件**。
 *
 * **有意偏离（安全）**：原版把四个库文件和该仓库下所有组的图片直接 `delete` 掉，误删不可恢复；
 * 这里改成**移进 `<用户目录>/.deleted-<时间戳>/`**（保留原相对路径），整个目录拷回用户目录即可恢复。
 * 顺序也是刻意安排的：先复制 → 再写索引 → 最后删原件，任何一步失败都不会两头落空。
 *
 * `index` 修正照抄 `:53348-53353`：被删项在当前项之前则 `-1`，等于当前项则归 `0`。
 */
export async function deleteWarehouse(index: number): Promise<WarehouseDeleteResult> {
  // 没有 Node 就移不了文件（索引写本身也会抛 NO_NODE），先拦在门口，别只删索引不搬文件
  if (!hasNode()) throw new CepError('NO_NODE', 'Node 不可用，无法把仓库文件移到回收目录')

  const current = await usableIndex()
  const warehouse = current.list[index]
  if (!warehouse) throw new CepError('PARSE', `仓库 ${index} 不存在`)
  // 原版只在页面层拦「最少保留一个分组哦」（`f_delete`，`:53978-53987`），这里再拦一道：
  // 索引里一个仓库都不剩，整个页面读到的就是空列表
  if (current.list.length === 1) throw new CepError('PARSE', '最少保留一个分组哦')

  const recycleDir = `${userDir()}/.deleted-${Date.now()}`
  const moved: string[] = []
  for (const relative of await warehouseFiles(warehouse)) {
    if (await copyToRecycle(relative, recycleDir)) moved.push(relative)
  }

  await enqueue(() =>
    styleIndexRepo.update((value) => {
      const next = readStyleWarehouseIndex(value).value
      next.list.splice(index, 1)
      if (index < next.index) next.index -= 1
      else if (index === next.index) next.index = 0
      return { ...value, index: next.index, list: next.list }
    }),
  )

  // 索引已经不再引用这些文件，删不掉只会留下孤儿文件 —— 记下来报给调用方，不抛
  const failed: string[] = []
  for (const relative of moved) {
    if (!removeFile(`${userDir()}/${relative}`)) failed.push(relative)
  }
  log.info('style', `仓库 ${warehouse.name} 已移入回收目录`, { recycleDir, moved, failed })

  return { recycleDir, moved, failed }
}

/**
 * 新建分组。原版 `addGroup(name, afterIndex)`（`app.v4.js:52437-52449`）：
 * `afterIndex` 有效（`afterIndex + 1 < 组数`）时插到它后面，否则追加。
 *
 * 与 `action.addGroup` 同一口径：空名抛错，不替调用方编默认名
 * （原版只在 `name === undefined` 时补「未命名分组」，`:52439-52441`）。
 */
export async function addKuGroup(kind: KuKind, name: string, afterIndex?: number): Promise<void> {
  const groupName = name.trim()
  if (!groupName) throw new CepError('PARSE', '分组名不能为空')

  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      const next = createKuGroup(kind, groupName)
      if (typeof afterIndex === 'number' && afterIndex >= 0 && afterIndex + 1 < groups.length) {
        groups.splice(afterIndex + 1, 0, next)
      } else {
        groups.push(next)
      }
    }),
  )
}

/** 重命名分组。原版 `renameGroup(name, index)`（`:52456-52459`）：不查重，直接改名 */
export async function renameKuGroup(kind: KuKind, groupIndex: number, name: string): Promise<void> {
  const groupName = name.trim()
  if (!groupName) throw new CepError('PARSE', '分组名不能为空')

  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      groupAt(groups, groupIndex).name = groupName
    }),
  )
}

/**
 * 删除分组。原版 `deleteGroup(index)`（`:52451-52454`）：删完为空就补一个「<库名>默认分组」，
 * 所以库永远至少有一个组（样式库的组还带新生成的 `id`）。
 */
export function deleteKuGroup(kind: KuKind, groupIndex: number): Promise<void> {
  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      groupAt(groups, groupIndex)
      groups.splice(groupIndex, 1)
      if (groups.length === 0) groups.push(createKuGroup(kind, defaultKuGroupName(kind)))
    }),
  )
}

/**
 * 分组显隐。原版 `changeGroupShowStatus(index, showOnly)`（`:52415-52418`）：
 * `showOnly === true` → 只显示这一组（`showOnlyGroup` `:52420-52435`），否则取反。
 * `showOnlyGroup` 的边界照抄：本来只显示这一组时，再点一次是把它关掉（不是保持）。
 */
export function setKuGroupShow(kind: KuKind, groupIndex: number, showOnly: boolean): Promise<void> {
  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      groupAt(groups, groupIndex)
      if (!showOnly) {
        const group = groups[groupIndex]
        group.show = group.show !== true
        return
      }

      let shownIndex = -1
      let shownCount = 0
      for (let i = 0; i < groups.length; i++) {
        if (groups[i]?.show === true) {
          shownIndex = i
          shownCount++
        }
      }
      for (let i = 0; i < groups.length; i++) {
        groups[i].show = i === groupIndex && (shownIndex !== i || shownCount !== 1)
      }
    }),
  )
}

/**
 * 追加一项。原版 `addItem(groupIndex, item)`（`:52482-52489`）：项必须是对象，否则不写。
 * 项本身按开放结构处理（契约 §7 第 8 条）：不认字段、不补键，原样写进 `list`。
 */
export async function addKuItem(kind: KuKind, groupIndex: number, item: unknown): Promise<void> {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CepError('PARSE', '项必须是非空对象')
  }

  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      itemList(groupAt(groups, groupIndex), groupIndex).push(item)
    }),
  )
}

/** 重命名项。原版 `renameItem(name, groupIndex, itemIndex)`（`:52496-52499`）：只改 `name` */
export async function renameKuItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  name: string,
): Promise<void> {
  const itemName = name.trim()
  if (!itemName) throw new CepError('PARSE', '名称不能为空')

  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      itemAt(groups, groupIndex, itemIndex).name = itemName
    }),
  )
}

/** 删除一项。原版 `deleteItem(groupIndex, itemIndex)`（`:52477-52480`） */
export function deleteKuItem(kind: KuKind, groupIndex: number, itemIndex: number): Promise<void> {
  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      const list = itemList(groupAt(groups, groupIndex), groupIndex)
      itemAt(groups, groupIndex, itemIndex)
      list.splice(itemIndex, 1)
    }),
  )
}

/**
 * 替换一项（`cy_changeStyleColor` 的回写）。
 *
 * 原版 `replaceItem(groupIndex, itemIndex, newItem)`（`:52491-52494`）：alt 应用颜色后
 * PS 侧可能改写颜色（如把可编辑色转成不可编辑），原版用返回值覆盖本地那一项。
 * 返回值结构未实测，所以这里**只接受对象**：不是对象就抛，不猜字段、不合并。
 */
export async function replaceKuItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  item: unknown,
): Promise<void> {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CepError('PARSE', 'cy_changeStyleColor 返回值不是对象，未回写')
  }

  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      const list = itemList(groupAt(groups, groupIndex), groupIndex)
      if (!list[itemIndex]) throw new CepError('PARSE', `第 ${itemIndex} 项不存在`)
      list[itemIndex] = item
    }),
  )
}

/**
 * 项排序（上移 / 下移一格）。
 *
 * 原版没有"上移/下移"菜单，只有拖拽（`drag`/`drop`，`app.v4.js:50040-50070`）：
 * 拖拽的落点是"插到目标前/后"，同组内先 `splice` 取出再插入。这里按同一语义把
 * "移动一格"表达成 `splice(from) + splice(to)`，拖拽接线留给页面（右键菜单只做上下移）。
 */
export function moveKuItem(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
  direction: 'up' | 'down',
): Promise<void> {
  return enqueue(() =>
    updateKuGroups(kind, (groups) => {
      const list = itemList(groupAt(groups, groupIndex), groupIndex)
      itemAt(groups, groupIndex, itemIndex)

      const to = itemIndex + (direction === 'up' ? -1 : 1)
      if (to < 0 || to >= list.length) {
        throw new CepError('PARSE', direction === 'up' ? '已经是第一项' : '已经是最后一项')
      }
      const [item] = list.splice(itemIndex, 1)
      list.splice(to, 0, item)
    }),
  )
}

/**
 * 色板数据文件。原版 `path.seBan` = `getUserDataPath() + "/FengZiSeBan/userColor.ini"`
 * （`app.v4.js:5222`；`getUserDataPath()` 是 `%APPDATA%`，`:5180-5183`）。
 * `userDir()` = `getUserDataPath() + USER_DIR`（`cep/fs.ts:45-52`），去掉后缀还原成根。
 */
function swatchFilePath(): string {
  const dir = userDir()
  if (!dir.endsWith(USER_DIR)) {
    throw new CepError('IO', `用户数据目录不以 ${USER_DIR} 结尾，色板路径算不出来：${dir}`)
  }
  return `${dir.slice(0, -USER_DIR.length)}/FengZiSeBan/userColor.ini`
}

/**
 * 读色板数组。文件不存在 / 空文件 = 空数组（原版 `readToArray` 同语义，`app.v4.js:72714-72727`）。
 *
 * **有意偏离**：原版 `readToArray` 连 JSON 坏掉也吞成 `[]`，然后 `write` 覆盖回去 ——
 * 用户的色板会被一次追加抹平。这里坏文件直接抛，宁可这次追加失败。
 */
async function readSwatchItems(path: string): Promise<unknown[]> {
  const text = await readTextSmart(path)
  if (text === null || text === '') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    log.error('style', '色板文件不是合法 JSON', e)
    throw new CepError('PARSE', `色板文件不是合法 JSON，已中止写入：${path}`)
  }
  if (!Array.isArray(parsed))
    throw new CepError('PARSE', `色板文件顶层不是数组，已中止写入：${path}`)
  return parsed
}

/** 写色板全文：旧内容先进 `.bak`，再原子写；写不进去抛（不让用户以为发送成功） */
async function writeSwatchItems(path: string, items: unknown[]): Promise<void> {
  const previous = await readTextSmart(path)
  if (previous) writeTextFile(`${path}.bak`, previous)
  if (!writeTextFileAtomic(path, JSON.stringify(items))) {
    throw new CepError('IO', `色板文件写入失败：${path}`)
  }
}

/**
 * 发送到色板（项）：把这一项写成色板文件的**全部内容**。
 *
 * 原版 `showItemMenu` 的「发送到色板」（`app.v4.js:50349-50355`）：
 * `D.a.write(path.seBan, JSON.stringify([item]))` → 整份替换，不是追加
 * （追加是隔壁那条「追加到色板」`:50357-50364`：读出来 `push` 再写回）。
 * 随后 `sendMessageToSeBan()`（`:50216-50218` = `$cep.sendAppEvent("com.fengzi.event.seban","GengXin")`）。
 *
 * UNVERIFIED：**那条 app event 没有发**。`cep/events.ts` 只封装了 PS 宿主事件
 * （`com.adobe.PhotoshopRegisterEvent`），本项目没有通用 app event 发送器，本次边界也不许改它。
 * 后果：文件写对了，但色板面板会不会自己刷新、还是必须重开面板才看得见，**未验**。
 * 另外色板面板读这个文件时会不会挑剔项字段（非颜色项塞进去会怎样），也**未验**。
 * 下面三条色板命令同一缺口，不再重复标注。
 */
export function sendKuItemToSwatch(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
): Promise<void> {
  return enqueue(async () => {
    const { groups } = await readRawGroups(kind)
    const item = itemAt(groups, groupIndex, itemIndex)
    await writeSwatchItems(swatchFilePath(), [item])
  })
}

/**
 * 追加到色板（项）。原版 `:50356-50364`：`readToArray(seBan)` → `push(该项)` → `write` → tips「追加成功」。
 */
export function appendKuItemToSwatch(
  kind: KuKind,
  groupIndex: number,
  itemIndex: number,
): Promise<void> {
  return enqueue(async () => {
    const { groups } = await readRawGroups(kind)
    const item = itemAt(groups, groupIndex, itemIndex)
    const path = swatchFilePath()

    const items = await readSwatchItems(path)
    items.push(item)
    await writeSwatchItems(path, items)
  })
}

/**
 * 发送到色板（整组）。原版 `:50260-50268`：
 * `write(path.seBan, JSON.stringify(data.info[index].list))` —— **整份替换**，不是逐项追加。
 */
export function sendKuGroupToSwatch(kind: KuKind, groupIndex: number): Promise<void> {
  return enqueue(async () => {
    const { groups } = await readRawGroups(kind)
    const list = itemList(groupAt(groups, groupIndex), groupIndex)
    await writeSwatchItems(swatchFilePath(), list)
  })
}

/** 追加到色板（整组）。原版 `:50269-50290`：读回 → 逐项 push 该组 `list` → 写回 */
export function appendKuGroupToSwatch(kind: KuKind, groupIndex: number): Promise<void> {
  return enqueue(async () => {
    const { groups } = await readRawGroups(kind)
    const list = itemList(groupAt(groups, groupIndex), groupIndex)
    const path = swatchFilePath()

    const items = await readSwatchItems(path)
    for (const item of list) items.push(item)
    await writeSwatchItems(path, items)
  })
}
