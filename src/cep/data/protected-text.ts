// 是什么：仓库层**受保护的纯文本写入口**（唯一写队列 + `.bak` + 原子写 + 写完回读校验）
// 唯一入口：`data/` 层要写"一个纯文本小文件"（数量、整数字串、标记位）都走这里
// 替代了什么：`swatch.setRecentLimit` 里那句裸 `writeTextFile`（无 tmp / 非原子 / 无备份，TD-09-19 / TD-16-1）
// 谁在用：swatch-repo（最近色上限 `zuiJinShuLiang.txt`）
// 禁止：绕过它直写；这里不做业务判断（内容对不对由调用方保证）

import { readTextOutcome, writeTextFileAtomic } from '@/cep/fs'
import { CepError } from '@/utils/errors'
import { log } from '@/utils/logger'
import { runQueued } from './write-queue'

/** 备份读成功才算"有上一版"；读不到 / 不存在都不写 `.bak`（不拿猜测当备份） */
async function backupIfReadable(path: string): Promise<void> {
  const before = await readTextOutcome(path)
  if (before.status !== 'ok') return
  const written = writeTextFileAtomic(`${path}.bak`, before.text)
  if (written.status === 'error') {
    throw new CepError('IO', `${path} 备份失败，已中止写入：${written.reason}`)
  }
}

/**
 * 写一个纯文本文件，并**证明写进去的就是想要的内容**。
 *
 * 三步都不许省：
 * 1. 备份（原文可读时）—— 用户改错了能拿回上一版；
 * 2. 原子写（tmp + rename）—— 面板关在写中途不会留下半截文件；
 * 3. **回读比对** —— 写完读回来的字节必须与写入的一致，否则抛。
 *    这一步是"写完能证明它没被破坏"：前两步只保证"尽力写对"，只有它能说"确实对了"。
 */
async function writeNow(path: string, text: string): Promise<void> {
  await backupIfReadable(path)

  const written = writeTextFileAtomic(path, text)
  if (written.status === 'error') {
    throw new CepError('IO', `${path} 写入失败：${written.reason}`)
  }

  const after = await readTextOutcome(path)
  if (after.status !== 'ok' || after.text !== text) {
    log.error('repo', `${path} 写入后回读不一致`, after.status === 'ok' ? after.text : after.status)
    throw new CepError('IO', `${path} 写入后回读不一致，已按失败处理`)
  }
}

/** 排队版：**绝大多数调用方用这个**（自己不在写队列里时） */
export function writeProtectedText(path: string, text: string): Promise<void> {
  return runQueued(() => writeNow(path, text))
}

/**
 * 不排队版：调用方**必须已经持有写队列**（`runQueued` 的任务体里）。
 * 唯一使用者是 `swatch.setRecentLimit`——它要"写数量文件 + 裁最近色"两件事在一段里做完，
 * 再排一次队就是自锁（实测：4 条用例 5s 超时）。
 */
export function writeProtectedTextNow(path: string, text: string): Promise<void> {
  return writeNow(path, text)
}
