// 是什么｜替代了什么｜谁在用
// 是什么：**纯文本小文件的唯一落盘口**（`.bak` + 原子写 + 写完回读校验），同步
// 替代了什么：`writeDisk`（async 版）+ `runQueued` 排队 + "排队版/不排队版"两个函数
// 谁在用：`swatch-repo.ts`（最近色上限 `zuiJinShuLiang.txt`）
// 禁止：绕过它直写；它只服务"纯文本小文件"，数据文件走 `Repo`
//
// 为什么不再有两个函数：锁删了（`Repo<T>` 全同步 ⇒ 读改写是不可打断的同步段），
// "我有没有持锁"这个问题不存在，所以也不该有 `writeProtectedText` / `writeProtectedTextNow` 之分。

import { writeDiskSync } from '@/cep/disk-write'

/**
 * 写一个纯文本文件，并**证明写进去的就是想要的内容**（`verifyReadBack`）。
 *
 * 备份 / 原子写 / 回读比对三步都在 `writeDiskSync` 里，本文件不重复实现。
 * 写失败抛 —— 不返回 boolean，调用方不用猜。
 */
export function writeProtectedText(path: string, text: string): void {
  writeDiskSync(path, text, {
    backup: { mode: 'keep' },
    cas: { mode: 'skip', why: '单值文本，值由 UI 当前态决定，冲突即覆盖' },
    verifyReadBack: true,
  })
}
