import { tagsRepo } from '@/cep/data'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'

const PATH = '/sj_ztglTags.ini'

export const fontTagsEntry: SyncUnitAdapter = {
  id: 'font.tags',
  schema: 1,

  async read() {
    const read = await tagsRepo.read()
    if (read.degraded) throw new Error(read.degraded)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const value = readInlineJson(payload)
      if (!Array.isArray(value)) return { ok: false, message: '字体标签不是数组' }
      await tagsRepo.write(value)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '字体标签写回失败' }
    }
  },
}
