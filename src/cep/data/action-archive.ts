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
import type { RepoRead } from './types'

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

/**
 * 索引读坏了就停下（D-42 同口径：读坏禁止覆盖写）。
 *
 * 为什么必须在**任何写之前**：坏索引的 `value` 是 fallback `DEFAULT_INDEX`（一条「默认仓库」），
 * 拿它当真索引算 `next.list`，再 `write(next)` 就把用户真实的仓库列表顶掉了——
 * 文件还在磁盘上，但索引不再指向它们，面板里等于全没了。
 *
 * 文案要求：让人看出"是文件坏了"，不是"你没有仓库"——后者会让人以为数据被清了。
 */
function requireIndex(
  read: RepoRead<ActionWarehouseIndex>,
  action: '导入' | '导出',
): ActionWarehouseIndex {
  if (!read.ok) {
    throw new CepError(
      'IO',
      `动作库索引文件损坏（${read.reason}），${action}已中止：磁盘上的仓库文件没动`,
    )
  }
  return read.value
}

export async function archiveDefaultName(current: boolean): Promise<string> {
  const index = requireIndex(await actionIndexRepo.read(), '导出')
  const list = current ? [index.list[index.index]].filter(Boolean) : index.list
  if (!list.length) throw new CepError('PARSE', '没有可导出的仓库')
  return current ? `${list[0].name}.dzx` : '全部仓库.dzx'
}

export function exportActionArchive(current: boolean, targetPath: string): Promise<void> {
  return enqueue(async () => {
    const index = requireIndex(await actionIndexRepo.read(), '导出')
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

    // 任何写之前先确认索引是真实数据：坏索引时下面的 next.list 会基于 fallback 算出来
    const current = requireIndex(await actionIndexRepo.read(), '导入')
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
