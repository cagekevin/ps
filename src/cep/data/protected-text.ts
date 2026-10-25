// 是什么：**排队版**的纯文本落盘（唯一写队列 + `.bak` + 原子写 + 写完回读校验）
// 唯一入口：`data/` 层要写"一个纯文本小文件"（数量、整数字串、标记位）都走这里
// 实际落盘：`./disk-write` 的 `writeDisk`（唯一落盘入口，`.bak` / 原子写 / 回读校验都在那里）
// 本文件只负责**排队**（`runQueued`）——把"串行"这件事和"怎么写"分开
// 谁在用：swatch-repo（最近色上限 `zuiJinShuLiang.txt`）
// 禁止：绕过它直写

import { writeDisk } from '@/cep/disk-write'
import { runQueued } from './write-queue'

/**
 * 写一个纯文本文件，并**证明写进去的就是想要的内容**（`verifyReadBack`）。
 *
 * 备份 / 原子写 / 回读比对三步都在 `writeDisk` 里，本文件不重复实现。
 */
function writeNow(path: string, text: string): Promise<void> {
  return writeDisk(path, text, { verifyReadBack: true }).then(() => {})
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
