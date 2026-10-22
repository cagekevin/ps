import { readTextSmart, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
import { actionIndexRepo } from '@/cep/data/actions'
import type { ActionWarehouseIndex } from '@/domain/action'
import type { SyncFile, SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, unitPayload } from './util'

const INDEX_PATH = '/sj_dzStoreInfo.json'

function safeName(name: unknown): string {
  if (typeof name !== 'string' || !name || /[\\/]/.test(name)) {
    throw new Error(`动作仓库文件名不合法：${String(name)}`)
  }
  return name
}

function parseFile(file: SyncFile | undefined, label: string): unknown {
  if (!file || file.content.kind !== 'inline') throw new Error(`${label}没有内联内容`)
  try {
    return JSON.parse(file.content.data) as unknown
  } catch {
    throw new Error(`${label}不是合法 JSON`)
  }
}

function readIndex(value: unknown): ActionWarehouseIndex {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('动作仓库索引不是对象')
  }
  const raw = value as { index?: unknown; list?: unknown }
  if (!Array.isArray(raw.list) || !raw.list.length) throw new Error('动作仓库索引没有仓库')

  const list = raw.list.map((item) => {
    const entry = item as { name?: unknown; fileName?: unknown }
    return {
      name: typeof entry.name === 'string' && entry.name ? entry.name : '未命名仓库',
      fileName: safeName(entry.fileName),
    }
  })
  const index = Number(raw.index)
  return {
    index: Number.isInteger(index) && index >= 0 && index < list.length ? index : 0,
    list,
  }
}

/**
 * 动作库同步：索引 + 每个仓库文件，一起作为一个 unit。
 *
 * 写入顺序：先写仓库文件，最后写索引；索引是入口，不能先指向还不存在的文件。
 */
export const actionLibraryEntry: SyncUnitAdapter = {
  id: 'action.library',
  schema: 1,

  async read() {
    const read = await actionIndexRepo.read()
    if (read.degraded) throw new Error(read.degraded)

    const files: SyncFile[] = [inlineFile(INDEX_PATH, JSON.stringify(read.value))]

    const seen = new Set<string>()
    for (const entry of read.value.list) {
      const name = safeName(entry.fileName)
      if (seen.has(name)) throw new Error(`动作仓库文件名重复：${name}`)
      seen.add(name)

      const text = await readTextSmart(`${userDir()}/${name}`)
      if (text === null) throw new Error(`动作仓库文件不存在：${name}`)
      files.push(inlineFile(`/${name}`, text))
    }

    return unitPayload(files)
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const indexFile = payload.files.find((file) => file.path === INDEX_PATH)
      const index = readIndex(parseFile(indexFile, '动作仓库索引'))

      for (const entry of index.list) {
        const file = payload.files.find((item) => item.path === `/${entry.fileName}`)
        parseFile(file, `动作仓库 ${entry.fileName}`)
      }

      // 先写仓库文件，最后写索引
      for (const entry of index.list) {
        const file = payload.files.find((item) => item.path === `/${entry.fileName}`)
        if (!file || file.content.kind !== 'inline') continue
        const target = `${userDir()}/${entry.fileName}`
        if (!writeTextFileAtomic(target, file.content.data)) {
          writeTextFile(target, file.content.data)
        }
      }
      await actionIndexRepo.write(index)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : '动作库写回失败',
      }
    }
  },
}
