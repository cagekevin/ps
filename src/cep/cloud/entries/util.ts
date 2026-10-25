import { fileByteSize, type FileEncoding, type SyncFile, type UnitPayload } from '@/domain/cloud'

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

export function readInlineJson(payload: UnitPayload): unknown {
  const file = payload.files[0]
  if (!file || file.content.kind !== 'inline') throw new Error('同步项没有内联内容')
  return JSON.parse(file.content.data)
}
