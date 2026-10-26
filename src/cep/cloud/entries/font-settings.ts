import {
  legacySettingsRepo,
  patchFontSetSettings,
  readFontSetSettingsForSync,
} from '@/cep/data/legacy-settings'
import type { FontSetSettings } from '@/domain/font-set-config'
import { writeFailed, type SyncUnitAdapter, type WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'
import { isDecodeFail, shapeFail } from '@/utils/decode'
import { isRecord } from '@/utils/guards'
import { describeDecodeFail } from '@/cep/data/repo-read'

const PATH = '/sj_set.json'

export const fontSettingsEntry: SyncUnitAdapter = {
  id: 'font.settings',
  schema: 1,

  /**
   * `sj_set.json` 是**共用文件**（原面板还有几十个键），任何键写成功都会标脏；
   * 本 adapter 只读回字体字段，内容没变时 engine 的 hash 比较判 `skipped`，不会白推。
   *
   * 会不会变成高频推送：不会。`markDirty` 只重置静默期、不发请求，
   * 队列还有 5 分钟最大等待封顶（`config/cloud.ts`）。真正可能被放大的是**写盘**频率，
   * 那由命令层决定（`patchFontSetSettings` 一次调用一次写），不在这里。
   */
  watch: (markDirty) => legacySettingsRepo.onChange(markDirty),

  async read() {
    const value = await readFontSetSettingsForSync()
    return unitPayload([inlineFile(PATH, JSON.stringify(value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const decoded = readInlineJson(payload)
      if (isDecodeFail(decoded)) return writeFailed(describeDecodeFail(decoded))
      const value = decoded.value
      if (!isRecord(value)) {
        return writeFailed(describeDecodeFail(shapeFail('', 'object', value)))
      }
      await patchFontSetSettings(value as Partial<FontSetSettings>)
      return { status: 'ok' }
    } catch (error) {
      return writeFailed(error instanceof Error ? error.message : String(error))
    }
  },
}
