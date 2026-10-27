// 是什么：字体面板「层级预设」作为一个云同步项（T-55），文件 `sj_ztHierarych.json`
// 唯一入口：层级预设的云端读写只能经过这个 adapter；engine 经 SyncUnitAdapter 使用
// 替代了什么：原版 `fontSetHierarych` 里直接 `$sync.pushFile`（`L31794:110-152`）
// 谁在用：cep/cloud/entries/index.ts 注册进 cloudEntries
// 禁止：页面/组件不许 import；这里不判断冲突、不发请求

import { hierarchyWriter } from '@/cep/data/font-extra'
import { writeFailed, type SyncUnitAdapter, type WriteOutcome } from '@/domain/cloud'
import type { HierarchyFile, HierarchyPreset } from '@/domain/font-set-config'
import { inlineFile, readInlineJson, unitPayload } from './util'
import { isDecodeFail, shapeFail } from '@/utils/decode'
import { isRecord } from '@/utils/guards'
import { describeDecodeFail } from '@/cep/data/repo-read'
import { REPLACE_WITHOUT_BASELINE } from '@/cep/data/types'

const PATH = '/sj_ztHierarych.json'

function toLevels(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error(describeDecodeFail(shapeFail('', 'array', value)))
  if (!value.length) throw new Error(describeDecodeFail({ fail: 'emptyContent' }))
  const bad = value.find((item) => {
    const n = Number(item)
    return !Number.isFinite(n) || n < 1
  })
  if (bad !== undefined) {
    throw new Error(describeDecodeFail(shapeFail('list[].data', 'number', bad)))
  }
  return value.map((item) => Number(item))
}

/**
 * 形状校验：`{index, list:[{name, data:number[]}]}`。
 * 依据：`data/font-extra.ts:135-143` 的默认值 + `hierarchyWriter` 的 `HierarchyFile`；
 * 真实文件样本未取得，故按「宽松读取、严格拒绝」处理（字段缺失就报错，不猜）。
 */
function toHierarchyFile(value: unknown): HierarchyFile {
  if (!isRecord(value)) throw new Error(describeDecodeFail(shapeFail('', 'object', value)))
  const raw = value
  if (!Array.isArray(raw.list))
    throw new Error(describeDecodeFail(shapeFail('list', 'array', raw.list)))
  if (!raw.list.length) throw new Error(describeDecodeFail({ fail: 'emptyContent' }))

  const list: HierarchyPreset[] = raw.list.map((item) => {
    const entry = isRecord(item) ? item : {}
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!name) throw new Error(describeDecodeFail(shapeFail('list[].name', 'string', entry.name)))
    return { name, data: toLevels(entry.data) }
  })

  const index = Number(raw.index)
  return {
    index: Number.isInteger(index) && index >= 0 && index < list.length ? index : 0,
    list,
  }
}

export const fontHierarchyEntry: SyncUnitAdapter = {
  id: 'font.hierarchy',
  schema: 1,

  // 层级预设写成功 → 标脏（原版 `fontSetHierarych` 直接 `$sync.pushFile`，见文件首注释）
  watch: (markDirty) => hierarchyWriter.onChange(markDirty),

  async read() {
    const read = await hierarchyWriter.read()
    if (read.status === 'error') throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const decoded = readInlineJson(payload)
      if (isDecodeFail(decoded)) return writeFailed(describeDecodeFail(decoded))
      const file = toHierarchyFile(decoded.value)
      hierarchyWriter.replace(file, REPLACE_WITHOUT_BASELINE)
      return { status: 'ok' }
    } catch (error) {
      return writeFailed(error instanceof Error ? error.message : String(error))
    }
  },
}
