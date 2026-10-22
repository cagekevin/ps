import {
  readBase64File,
  readTextFile,
  removeFile,
  userDir,
  writeBase64File,
  writeTextFile,
} from '@/cep/fs'
import type { ActionWarehouseIndex } from '@/domain/action'
import { decodeDzx, encodeDzx, remapDzxFileNames, type DzxFile } from '@/domain/action-dzx'
import { CepError } from '@/utils/errors'
import { actionIndexRepo, currentWarehouseFile, selectActionFile } from './actions'

/**
 * 动作仓库 .dzx 导入导出。
 *
 * 这里负责路径、临时文件、索引和回滚；命令层只负责文件对话框。
 * 导入顺序固定：先写新文件 → 写索引 → 成功后清理旧文件。
 */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task)
  queue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function pathOf(fileName: string): string {
  if (!fileName || /[\\/]/.test(fileName)) {
    throw new CepError('PARSE', `仓库文件名不合法：${fileName}`)
  }
  return `${userDir()}/${fileName}`
}

function validateImported(file: DzxFile): void {
  if (!file.store.list.length) throw new CepError('PARSE', '导入文件没有仓库')

  const names = new Set<string>()
  for (const entry of file.arrFileData) {
    if (!entry.name || /[\\/]/.test(entry.name)) {
      throw new CepError('PARSE', `导入文件名不合法：${entry.name}`)
    }
    if (names.has(entry.name)) throw new CepError('PARSE', `导入文件名重复：${entry.name}`)
    names.add(entry.name)
  }

  const seen = new Set<string>()
  for (const item of file.store.list) {
    if (!item.fileName || /[\\/]/.test(item.fileName)) {
      throw new CepError('PARSE', `仓库文件名不合法：${item.fileName}`)
    }
    if (!names.has(item.fileName)) {
      throw new CepError('PARSE', `索引引用了不存在的文件：${item.fileName}`)
    }
    if (seen.has(item.fileName)) {
      throw new CepError('PARSE', `索引重复引用文件：${item.fileName}`)
    }
    seen.add(item.fileName)
  }
}

function removeAll(fileNames: string[]): void {
  for (const name of fileNames) {
    try {
      removeFile(pathOf(name))
    } catch {
      // 清理失败只留下孤儿文件，不回滚已成功的索引
    }
  }
}

export async function archiveDefaultName(current: boolean): Promise<string> {
  const read = await actionIndexRepo.read()
  const list = current ? [read.value.list[read.value.index]].filter(Boolean) : read.value.list
  if (!list.length) throw new CepError('PARSE', '没有可导出的仓库')
  return current ? `${list[0].name}.dzx` : '全部仓库.dzx'
}

export function exportActionArchive(current: boolean, targetPath: string): Promise<void> {
  return enqueue(async () => {
    const read = await actionIndexRepo.read()
    const index = read.value
    const list = current ? [index.list[index.index]].filter(Boolean) : index.list
    if (!list.length) throw new CepError('PARSE', '没有可导出的仓库')

    const arrFileData = list.map((item) => {
      const data = readBase64File(pathOf(item.fileName))
      if (data === null) throw new CepError('IO', `读取仓库失败：${item.fileName}`)
      return { name: item.fileName, data }
    })

    const store: ActionWarehouseIndex = current
      ? { ...index, index: 0, list: [{ ...list[0] }] }
      : index

    writeTextFile(targetPath, encodeDzx({ arrFileData, store }))
  })
}

export function importActionArchive(append: boolean, sourcePath: string): Promise<void> {
  return enqueue(async () => {
    const text = readTextFile(sourcePath)
    if (text === null) throw new CepError('IO', '读取导入文件失败')

    let imported: DzxFile
    try {
      imported = remapDzxFileNames(decodeDzx(text))
      validateImported(imported)
    } catch (e) {
      if (e instanceof CepError) throw e
      throw new CepError('PARSE', e instanceof Error ? e.message : '导入文件结构不正确')
    }

    const read = await actionIndexRepo.read()
    const current = read.value
    const nextList = append ? [...current.list, ...imported.store.list] : imported.store.list
    const next: ActionWarehouseIndex = {
      index: append ? nextList.length - 1 : 0,
      list: nextList,
    }

    const written: string[] = []
    try {
      for (const entry of imported.arrFileData) {
        if (!writeBase64File(pathOf(entry.name), entry.data)) {
          throw new CepError('IO', `写入仓库失败：${entry.name}`)
        }
        written.push(entry.name)
      }

      await actionIndexRepo.write(next)
    } catch (e) {
      removeAll(written)
      throw e
    }

    selectActionFile(currentWarehouseFile(next))

    if (!append) {
      const keep = new Set(next.list.map((item) => item.fileName))
      removeAll(current.list.map((item) => item.fileName).filter((name) => !keep.has(name)))
    }
  })
}
