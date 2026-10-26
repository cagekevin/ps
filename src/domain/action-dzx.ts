import type { ActionWarehouseIndex } from './action'
import { isRecord } from '@/utils/guards'
import {
  decodeJsonText,
  isDecodeFail,
  shapeFail,
  type Decoded,
  type DecodeFail,
} from '@/utils/decode'

/**
 * `.dzx` 动作仓库交换格式。
 *
 * 原版 app.v4.js:6637-6794：
 * `{ arrFileData: [{ name, data: base64 }], store: ActionWarehouseIndex }`
 */
export interface DzxFile {
  arrFileData: Array<{ name: string; data: string }>
  store: ActionWarehouseIndex
}

/**
 * `.dzx` → 判别联合：失败是可枚举的码（`notJson` / `shape` / `badItem`），不是中文 throw。
 * 与 `ku-io` 的 `parseKuContainer` 同一套口径（同一件事不该两种失败表达）。
 */
export function decodeDzx(text: string): Decoded<DzxFile> | DecodeFail {
  const json = decodeJsonText(text)
  if (isDecodeFail(json)) return json

  const raw = json.value
  if (!isRecord(raw)) return shapeFail('', 'object', raw)

  const rawEntries = raw.arrFileData
  if (!Array.isArray(rawEntries)) return shapeFail('arrFileData', 'array', rawEntries)

  const store = raw.store
  if (!isRecord(store)) return shapeFail('store', 'object', store)
  if (!Array.isArray(store.list)) return shapeFail('store.list', 'array', store.list)

  // `store.list` 的每一项都要真有 name/fileName：后面 id 重写按文件名做映射，
  // 只断言"是对象"不够（`isRecord` 只证是对象，不证字段）
  const list: ActionWarehouseIndex['list'] = []
  for (const item of store.list) {
    if (!isRecord(item)) return { fail: 'badItem', count: store.list.length }
    if (typeof item.name !== 'string' || typeof item.fileName !== 'string') {
      return shapeFail('store.list[].fileName', 'string', item.fileName)
    }
    list.push({ ...item, name: item.name, fileName: item.fileName })
  }

  const arrFileData: DzxFile['arrFileData'] = []
  for (const entry of rawEntries) {
    if (!isRecord(entry)) return { fail: 'badItem', count: rawEntries.length }
    if (typeof entry.name !== 'string' || typeof entry.data !== 'string') {
      return shapeFail('arrFileData[].name', 'string', entry.name)
    }
    arrFileData.push({ name: entry.name, data: entry.data })
  }

  return {
    value: {
      arrFileData,
      store: {
        ...store,
        index: typeof store.index === 'number' ? store.index : 0,
        list,
      },
    },
  }
}

export function encodeDzx(file: DzxFile): string {
  return JSON.stringify(file)
}

function randomName(): string {
  return `sj_dz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.json`
}

/**
 * 给导入项生成新文件名，并按字段映射回 store。
 *
 * 原版 `replaceFileName` 是字符串全局替换，文件名有包含关系时会误替换；
 * 这里按字段映射，不照抄。
 */
export function remapDzxFileNames(file: DzxFile): DzxFile {
  const mapping = new Map<string, string>()
  for (const entry of file.arrFileData) {
    mapping.set(entry.name, randomName())
  }

  const list = file.store.list.map((item) => ({
    ...item,
    fileName: mapping.get(item.fileName) ?? item.fileName,
  }))

  return {
    arrFileData: file.arrFileData.map((entry) => ({
      name: mapping.get(entry.name) ?? entry.name,
      data: entry.data,
    })),
    store: { ...file.store, list },
  }
}
