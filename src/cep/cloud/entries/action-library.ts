import { describeReadFailure, readOwnFileText } from '@/cep/fs-read'
import { userDir } from '@/cep/paths'
import { writeDiskSync } from '@/cep/disk-write'
import { actionIndexWriter, actionLibraryRepo } from '@/cep/data/actions'
import { REPLACE_WITHOUT_BASELINE } from '@/cep/data/types'
import { runExclusive } from '@/cep/data/exclusive'
import type { ActionWarehouseIndex } from '@/domain/action'
import { writeFailed, type SyncFile, type SyncUnitAdapter, type WriteOutcome } from '@/domain/cloud'
import { CepError } from '@/utils/errors'
import { isDecodeFail, shapeFail } from '@/utils/decode'
import { isRecord } from '@/utils/guards'
import { describeDecodeFail } from '@/cep/data/repo-read'
import { decodeInlineJson, inlineFile, unitPayload } from './util'

const INDEX_PATH = '/sj_dzStoreInfo.json'

function safeName(name: unknown): string {
  if (typeof name !== 'string' || !name || /[\\/]/.test(name)) {
    // 机器话：哪个值不合格（含路径分隔符也算不合格，不许拼进用户目录）
    throw new Error(`EINVALID_NAME: ${String(name)}`)
  }
  return name
}

function readIndex(value: unknown): ActionWarehouseIndex {
  if (!isRecord(value)) throw new Error(describeDecodeFail(shapeFail('', 'object', value)))
  const raw = value
  if (!Array.isArray(raw.list))
    throw new Error(describeDecodeFail(shapeFail('list', 'array', raw.list)))
  if (!raw.list.length) throw new Error(describeDecodeFail({ fail: 'emptyContent' }))

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

  /**
   * 一个 unit 两个写入口：仓库索引（列表 / 当前仓库）与仓库文件（分组 / 动作）分开存，
   * 所以两边都要订。这两行的订阅跟着 unit 走（见 `SyncUnitAdapter`）。
   */
  watch: (markDirty) => {
    const offs = [actionIndexWriter.onChange(markDirty), actionLibraryRepo.onChange(markDirty)]
    return () => {
      for (const off of offs) off()
    }
  },

  async read() {
    const read = await actionIndexWriter.read()
    if (read.status !== 'ok') throw new Error(read.reason)

    const files: SyncFile[] = [inlineFile(INDEX_PATH, JSON.stringify(read.value))]

    const seen = new Set<string>()
    for (const entry of read.value.list) {
      const name = safeName(entry.fileName)
      if (seen.has(name)) throw new Error(`EDUP_NAME: ${name}`)
      seen.add(name)

      const read = await readOwnFileText(`${userDir()}/${name}`)
      // 上传前读不到就不许上传（拿默认值顶上去等于把空仓库推给云端）。
      // T-116：两种不 ok 的**动作相同**（都中止上传），但**用户该做什么不同**——
      // 文件不在 = 索引指向了一个已删的仓库；读不到 = 关掉占用它的程序再试。
      // 以前都说"不存在"，后者会让用户去重建仓库，白折腾
      // 两臂必须分开（T-116）：`ENOENT` = 索引指向一个已删的仓库；errno = 文件被占用 / 权限。
      // 只带机器话，句子由渲染层出 —— 上游要能靠码判断该做什么
      if (read.status === 'notSeen') throw new Error(`ENOENT: ${name}`)
      if (read.status === 'error') {
        throw new Error(`${describeReadFailure(read.failure)}: ${name}`)
      }
      files.push(inlineFile(`/${name}`, read.text))
    }

    return unitPayload(files)
  },

  /**
   * 云下载写回：写 N 个 `sj_dz*.json` + 写索引。
   *
   * **两条纪律，缺一条这个洞就还在**（35 号 P1）：
   * ① 落盘段**同步**（`writeDiskSync` + 同步索引写）—— 两个 IO 之间不容 microtask 边界，
   *    `importActionArchive` / `deleteWarehouse` 能插进去，留下「索引指向不存在的库」或孤儿文件；
   * ② 进 `action-files` **互斥域** —— 和导入/删仓库写同一批 `sj_dz*`，不许并发。
   *
   * 函数本身仍标 `async`（接口要求 `Promise<WriteOutcome>`），但体内**没有 `await`**，
   * 所以整段是一次跑完的同步段。
   */
  async write(payload): Promise<WriteOutcome> {
    try {
      return runExclusive('action-files', '动作库写回', () => {
        const indexFile = payload.files.find((file) => file.path === INDEX_PATH)
        // 判据在 `decodeInlineJson`（云载荷内层唯一入口）；这里只把失败翻成云写回结果
        const indexDecoded = decodeInlineJson(indexFile)
        if (isDecodeFail(indexDecoded)) throw new Error(describeDecodeFail(indexDecoded))
        const index = readIndex(indexDecoded.value)

        // 先逐份校验：账本里每个仓库对应的文件都得能解析，缺一份就不写（半写 = 索引指向空文件）
        for (const entry of index.list) {
          const file = payload.files.find((item) => item.path === `/${entry.fileName}`)
          const decoded = decodeInlineJson(file)
          if (isDecodeFail(decoded)) throw new Error(describeDecodeFail(decoded))
        }

        // 先写仓库文件，最后写索引。
        // 落盘走**唯一入口**（`.bak` + 原子写）—— 以前裸 `writeTextFileAtomic`：无 `.bak`（债 11-24）。
        for (const entry of index.list) {
          const file = payload.files.find((item) => item.path === `/${entry.fileName}`)
          if (!file || file.content.kind !== 'inline') continue
          const target = `${userDir()}/${entry.fileName}`
          try {
            writeDiskSync(target, file.content.data, {
              backup: { mode: 'keep' },
              cas: {
                mode: 'skip',
                why: '云写回整份覆盖本地库文件，冲突由上一层 REV_CONFLICT 判定',
              },
            })
          } catch (error) {
            throw new CepError(
              'IO',
              error instanceof Error ? error.message : String(error),
              undefined,
              error,
            )
          }
        }
        actionIndexWriter.replace(index, REPLACE_WITHOUT_BASELINE)
        return { status: 'ok' }
      })
    } catch (error) {
      return writeFailed(error instanceof Error ? error.message : String(error))
    }
  },
}
