import { patchFontSetSettings, readFontSetSettingsForSync } from '@/cep/data/legacy-settings'
import type { FontSetSettings } from '@/domain/font-set-config'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import { inlineFile, readInlineJson, unitPayload } from './util'

const PATH = '/sj_set.json'

export const fontSettingsEntry: SyncUnitAdapter = {
  id: 'font.settings',
  schema: 1,

  async read() {
    const value = await readFontSetSettingsForSync()
    return unitPayload([inlineFile(PATH, JSON.stringify(value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const value = readInlineJson(payload)
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, message: '字体设置不是对象' }
      }
      await patchFontSetSettings(value as Partial<FontSetSettings>)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '字体设置写回失败' }
    }
  },
}
