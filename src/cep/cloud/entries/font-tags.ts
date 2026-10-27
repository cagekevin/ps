import { tagsWriter, isRawTag } from '@/cep/data'
import { isArrayOf } from '@/utils/guards'
import { writeFailed, type SyncUnitAdapter, type WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'
import { isDecodeFail, shapeFail } from '@/utils/decode'
import { describeDecodeFail } from '@/cep/data/repo-read'
import { REPLACE_WITHOUT_BASELINE } from '@/cep/data/types'

const PATH = '/sj_ztglTags.ini'

export const fontTagsEntry: SyncUnitAdapter = {
  id: 'font.tags',
  schema: 1,

  // 标签写成功 → 标脏
  watch: (markDirty) => tagsWriter.onChange(markDirty),

  async read() {
    const read = await tagsWriter.read()
    if (read.status === 'error') throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const decoded = readInlineJson(payload)
      if (isDecodeFail(decoded)) return writeFailed(describeDecodeFail(decoded))
      const value = decoded.value
      if (!Array.isArray(value)) {
        return writeFailed(describeDecodeFail(shapeFail('', 'array', value)))
      }
      if (!isArrayOf(value, isRawTag)) {
        return writeFailed(describeDecodeFail({ fail: 'badItem', count: value.length }))
      }
      tagsWriter.replace(value, REPLACE_WITHOUT_BASELINE)
      return { status: 'ok' }
    } catch (error) {
      return writeFailed(error instanceof Error ? error.message : String(error))
    }
  },
}
