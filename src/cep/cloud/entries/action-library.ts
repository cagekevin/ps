import { readTextOutcome, userDir, writeTextFile, writeTextFileAtomic } from '@/cep/fs'
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
    if (!read.ok) throw new Error(read.reason)

    const files: SyncFile[] = [inlineFile(INDEX_PATH, JSON.stringify(read.value))]

    const seen = new Set<string>()
    for (const entry of read.value.list) {
      const name = safeName(entry.fileName)
      if (seen.has(name)) throw new Error(`动作仓库文件名重复：${name}`)
      seen.add(name)

      const read = await readTextOutcome(`${userDir()}/${name}`)
      // 上传前读不到就不许上传（拿默认值顶上去等于把空仓库推给云端）。
      // T-116：两种不 ok 的**动作相同**（都中止上传），但**用户该做什么不同**——
      // 文件不在 = 索引指向了一个已删的仓库；读不到 = 关掉占用它的程序再试。
      // 以前都说"不存在"，后者会让用户去重建仓库，白折腾
      if (read.status === 'notSeen') throw new Error(`动作仓库文件不存在：${name}`)
      if (read.status === 'error') {
        throw new Error(`动作仓库文件读不到：${name}（${read.reason}）`)
      }
      files.push(inlineFile(`/${name}`, read.text))
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
