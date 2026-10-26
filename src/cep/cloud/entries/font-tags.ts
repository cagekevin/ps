import { tagsWriter, isRawTag } from '@/cep/data'
import { isArrayOf } from '@/utils/guards'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'
import { REPLACE_WITHOUT_BASELINE } from '@/cep/data/types'

const PATH = '/sj_ztglTags.ini'

export const fontTagsEntry: SyncUnitAdapter = {
  id: 'font.tags',
  schema: 1,

  // 标签写成功 → 标脏
  watch: (markDirty) => tagsWriter.onChange(markDirty),

  async read() {
    const read = await tagsWriter.read()
    if (read.status !== 'ok') throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const value = readInlineJson(payload)
      if (!isArrayOf(value, isRawTag)) return { ok: false, message: '字体标签不是数组' }
      tagsWriter.replace(value, REPLACE_WITHOUT_BASELINE)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '字体标签写回失败' }
    }
  },
}
