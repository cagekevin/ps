import { starsRepo } from '@/cep/data'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'

const PATH = '/sj_ztglStar.ini'

export const fontStarsEntry: SyncUnitAdapter = {
  id: 'font.stars',
  schema: 1,

  // 收藏写成功 → 标脏（`file-repo` 的 emit 在落盘之后，写失败不会走到这里）
  watch: (markDirty) => starsRepo.onChange(markDirty),

  async read() {
    const read = await starsRepo.read()
    if (!read.ok) throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const value = readInlineJson(payload)
      if (!Array.isArray(value)) return { ok: false, message: '字体收藏不是数组' }
      await starsRepo.write(value)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '字体收藏写回失败' }
    }
  },
}
