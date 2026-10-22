import type { ActionWarehouseIndex } from './action'

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

export function decodeDzx(text: string): DzxFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }

  if (!raw || typeof raw !== 'object') throw new Error('文件结构不正确')
  const file = raw as Record<string, unknown>
  if (!Array.isArray(file.arrFileData) || !file.store || typeof file.store !== 'object') {
    throw new Error('缺少 arrFileData 或 store')
  }

  const arrFileData = file.arrFileData.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('arrFileData 项不正确')
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string' || typeof item.data !== 'string') {
      throw new Error('arrFileData 项缺少 name/data')
    }
    return { name: item.name, data: item.data }
  })

  const store = file.store as ActionWarehouseIndex
  if (!Array.isArray(store.list)) throw new Error('store.list 不正确')

  return { arrFileData, store }
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
