import { starsWriter, isRawStar } from '@/cep/data'
import { isArrayOf } from '@/utils/guards'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'

const PATH = '/sj_ztglStar.ini'

export const fontStarsEntry: SyncUnitAdapter = {
  id: 'font.stars',
  schema: 1,

  // 收藏写成功 → 标脏（`file-repo` 的 emit 在落盘之后，写失败不会走到这里）
  watch: (markDirty) => starsWriter.onChange(markDirty),

  async read() {
    const read = await starsWriter.read()
    if (!read.ok) throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const value = readInlineJson(payload)
      if (!isArrayOf(value, isRawStar)) return { ok: false, message: '字体收藏不是数组' }
      await starsWriter.write(value)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '字体收藏写回失败' }
    }
  },
}
