import { starsWriter, isRawStar } from '@/cep/data'
import { isArrayOf } from '@/utils/guards'
import { writeFailed, type SyncUnitAdapter, type WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'
import { isDecodeFail, shapeFail } from '@/utils/decode'
import { describeDecodeFail } from '@/cep/data/repo-read'
import { REPLACE_WITHOUT_BASELINE } from '@/cep/data/types'

const PATH = '/sj_ztglStar.ini'

export const fontStarsEntry: SyncUnitAdapter = {
  id: 'font.stars',
  schema: 1,

  // 收藏写成功 → 标脏（`file-repo` 的 emit 在落盘之后，写失败不会走到这里）
  watch: (markDirty) => starsWriter.onChange(markDirty),

  async read() {
    const read = await starsWriter.read()
    if (read.status !== 'ok') throw new Error(read.reason)
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
      if (!isArrayOf(value, isRawStar)) {
        return writeFailed(describeDecodeFail({ fail: 'badItem', count: value.length }))
      }
      starsWriter.replace(value, REPLACE_WITHOUT_BASELINE)
      return { status: 'ok' }
    } catch (error) {
      return writeFailed(error instanceof Error ? error.message : String(error))
    }
  },
}
