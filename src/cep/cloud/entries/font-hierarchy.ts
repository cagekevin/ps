// 是什么：字体面板「层级预设」作为一个云同步项（T-55），文件 `sj_ztHierarych.json`
// 唯一入口：层级预设的云端读写只能经过这个 adapter；engine 经 SyncUnitAdapter 使用
// 替代了什么：原版 `fontSetHierarych` 里直接 `$sync.pushFile`（`L31794:110-152`）
// 谁在用：cep/cloud/entries/index.ts 注册进 cloudEntries
// 禁止：页面/组件不许 import；这里不判断冲突、不发请求

import { hierarchyWriter } from '@/cep/data/font-extra'
import type { SyncUnitAdapter, WriteOutcome } from '@/domain/cloud'
import type { HierarchyFile, HierarchyPreset } from '@/domain/font-set-config'
import { inlineFile, readInlineJson, unitPayload } from './util'

const PATH = '/sj_ztHierarych.json'

function toLevels(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('层级预设的字号列表为空')
  const levels = value.map((item) => Number(item))
  if (levels.some((item) => !Number.isFinite(item) || item < 1)) {
    throw new Error('层级预设里有非法字号')
  }
  return levels
}

/**
 * 形状校验：`{index, list:[{name, data:number[]}]}`。
 * 依据：`data/font-extra.ts:135-143` 的默认值 + `hierarchyWriter` 的 `HierarchyFile`；
 * 真实文件样本未取得，故按「宽松读取、严格拒绝」处理（字段缺失就报错，不猜）。
 */
function toHierarchyFile(value: unknown): HierarchyFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('层级预设不是对象')
  }
  const raw = value as { index?: unknown; list?: unknown }
  if (!Array.isArray(raw.list) || raw.list.length === 0) throw new Error('层级预设没有条目')

  const list: HierarchyPreset[] = raw.list.map((item) => {
    const entry = item as { name?: unknown; data?: unknown }
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!name) throw new Error('层级预设缺少名字')
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
    if (!read.ok) throw new Error(read.reason)
    return unitPayload([inlineFile(PATH, JSON.stringify(read.value))])
  },

  async write(payload): Promise<WriteOutcome> {
    try {
      const file = toHierarchyFile(readInlineJson(payload))
      await hierarchyWriter.write(file)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : '层级预设写回失败',
      }
    }
  },
}
