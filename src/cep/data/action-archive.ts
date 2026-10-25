import { readBase64Outcome, readExternalText } from '@/cep/fs-read'
import { userDir } from '@/cep/paths'
import { removeFile, writeBase64File } from '@/cep/disk-write'
import { writeDisk } from '@/cep/disk-write'
import type { ActionWarehouseIndex } from '@/domain/action'
import { decodeDzx, encodeDzx, remapDzxFileNames, type DzxFile } from '@/domain/action-dzx'
import { CepError } from '@/utils/errors'
import { msg } from '@/domain/messages'
import { log } from '@/utils/logger'
import { actionIndexWriter, currentWarehouseFile, selectActionFile } from './actions'
import { runQueued } from './write-queue'
import type { RepoRead } from './types'

/**
 * 动作仓库 .dzx 导入导出。
 *
 * 这里负责路径、临时文件、索引和回滚；命令层只负责文件对话框。
 * 导入顺序固定：先写新文件 → 写索引 → 成功后清理旧文件。
 */
function pathOf(fileName: string): string {
  if (!fileName || /[\\/]/.test(fileName)) {
    throw new CepError('PARSE', msg.data.fn.warehouseFileNameInvalid(fileName))
  }
  return `${userDir()}/${fileName}`
}

function validateImported(file: DzxFile): void {
  if (!file.store.list.length) throw new CepError('PARSE', msg.data.text.importNoWarehouse)

  const names = new Set<string>()
  for (const entry of file.arrFileData) {
    if (!entry.name || /[\\/]/.test(entry.name)) {
      throw new CepError('PARSE', msg.data.fn.importFileNameInvalid(entry.name))
    }
    if (names.has(entry.name))
      throw new CepError('PARSE', msg.data.fn.importFileNameDup(entry.name))
    names.add(entry.name)
  }

  const seen = new Set<string>()
  for (const item of file.store.list) {
    if (!item.fileName || /[\\/]/.test(item.fileName)) {
      throw new CepError('PARSE', msg.data.fn.warehouseFileNameInvalid(item.fileName))
    }
    if (!names.has(item.fileName)) {
      throw new CepError('PARSE', msg.data.fn.indexRefMissingFile(item.fileName))
    }
    if (seen.has(item.fileName)) {
      throw new CepError('PARSE', msg.data.fn.indexDupRefFile(item.fileName))
    }
    seen.add(item.fileName)
  }
}

function removeAll(fileNames: string[]): void {
  for (const name of fileNames) {
    // 删除失败只留下孤儿文件，不回滚已成功的索引——但**必须记下来**（旧实现的 catch 是死代码：
    // `removeFile` 从不抛，返回值却被丢掉，删没删掉没人知道，TD-09-26）
    const removed = removeFile(pathOf(name))
    if (!removed.ok) log.warn('action', `清理旧仓库文件失败（留下孤儿）：${name}`, removed.reason)
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
    throw new CepError('IO', msg.data.fn.actionIndexCorruptAbort(read.reason, action))
  }
  return read.value
}

export async function archiveDefaultName(current: boolean): Promise<string> {
  const index = requireIndex(await actionIndexWriter.read(), '导出')
  const list = current ? [index.list[index.index]].filter(Boolean) : index.list
  if (!list.length) throw new CepError('PARSE', msg.data.text.noExportableWarehouse)
  return current ? `${list[0].name}.dzx` : '全部仓库.dzx'
}

export function exportActionArchive(current: boolean, targetPath: string): Promise<void> {
  return runQueued(async () => {
    // 锁内读：走不排队的 readInLock，避免 runQueued 套 runQueued 自锁（write-queue.ts:6 / TD-09-30）
    const index = requireIndex(await actionIndexWriter.readInLock(), '导出')
    const list = current ? [index.list[index.index]].filter(Boolean) : index.list
    if (!list.length) throw new CepError('PARSE', msg.data.text.noExportableWarehouse)

    const arrFileData = list.map((item) => {
      const read = readBase64Outcome(pathOf(item.fileName))
      // T-109：导出前读不到就不许导出。两种不 ok 这里同果（都抛同一句），文案不变
      if (read.status !== 'ok')
        throw new CepError('IO', msg.data.fn.readWarehouseFailed(item.fileName))
      return { name: item.fileName, data: read.base64 }
    })

    const store: ActionWarehouseIndex = current
      ? { ...index, index: 0, list: [{ ...list[0] }] }
      : index

    // 导出包是**新文件**，无 `.bak` 概念（`previous: null`）；走唯一落盘入口（原子写）
    await writeDisk(targetPath, encodeDzx({ arrFileData, store }), { previous: null })
  })
}

export function importActionArchive(append: boolean, sourcePath: string): Promise<void> {
  return runQueued(async () => {
    const read = await readExternalText(sourcePath)
    // T-107：导入前读不到就不许继续。两种不 ok 这里同果（都抛同一句），文案不变
    if (read.status !== 'ok') throw new CepError('IO', msg.data.text.readImportFileFailed)
    const text = read.text

    let imported: DzxFile
    try {
      imported = remapDzxFileNames(decodeDzx(text))
      validateImported(imported)
    } catch (e) {
      if (e instanceof CepError) throw e
      throw new CepError('PARSE', e instanceof Error ? e.message : '导入文件结构不正确')
    }

    // 任何写之前先确认索引是真实数据：坏索引时下面的 next.list 会基于 fallback 算出来
    // 锁内读：readInLock（不自排自，TD-09-30）
    const current = requireIndex(await actionIndexWriter.readInLock(), '导入')
    const nextList = append ? [...current.list, ...imported.store.list] : imported.store.list
    const next: ActionWarehouseIndex = {
      index: append ? nextList.length - 1 : 0,
      list: nextList,
    }

    const written: string[] = []
    try {
      for (const entry of imported.arrFileData) {
        const outcome = writeBase64File(pathOf(entry.name), entry.data)
        if (outcome.status === 'error') {
          throw new CepError('IO', msg.data.fn.writeWarehouseFailed(entry.name, outcome.reason))
        }
        written.push(entry.name)
      }

      // 已在全局写锁内：再排队会自锁（writeInLock 的注释写了这一条）
      await actionIndexWriter.writeInLock(next)
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
