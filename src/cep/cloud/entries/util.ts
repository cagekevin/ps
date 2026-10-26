import { fileByteSize, type FileEncoding, type SyncFile, type UnitPayload } from '@/domain/cloud'
import type { Decoded, DecodeFail } from '@/utils/decode'

export function inlineFile(path: string, data: string, encoding: FileEncoding = 'json'): SyncFile {
  return {
    path,
    size: fileByteSize(data),
    content: { kind: 'inline', data, encoding },
  }
}

export function unitPayload(files: SyncFile[]): UnitPayload {
  return { schema: 1, files }
}

/**
 * **云载荷内层（`file.content.data`）的唯一解析入口** —— 判据只在这里。
 *
 * 为什么必须有它：云端下发的内容与磁盘坏文件**信任级别相同**（都不可信），
 * `entries/util.ts` 与 `entries/action-library.ts` 都需解析云载荷：各自写 `JSON.parse` +
 * 中文 `throw` 会变成两份实现、两份自由文本文案（TD-18-115）。
 *
 * 失败在类型上取不到值：成功臂才带 `value`，`DecodeFail` 只有码 + 观测。
 * 文案**不在这里产生**（刀 3）—— 由 `describeDecodeFail` 唯一渲染。
 */
export function decodeInlineJson(file: SyncFile | undefined): Decoded<unknown> | DecodeFail {
  // 没有内联内容 = 「这一份载荷里没有内容」，不是形状错、也不是读不到
  if (!file || file.content.kind !== 'inline') return { fail: 'emptyContent' }
  try {
    return { value: JSON.parse(file.content.data) }
  } catch {
    return { fail: 'notJson' }
  }
}

/**
 * 单文件载荷 → 那份内容。**不判**（判据在 `decodeInlineJson`）：
 * 「`font.*` 这四类 unit 只有一个文件」是业务约定，不是解析判据。
 */
export function readInlineJson(payload: UnitPayload): Decoded<unknown> | DecodeFail {
  return decodeInlineJson(payload.files[0])
}
