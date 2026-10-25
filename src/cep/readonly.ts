// 是什么｜替代了什么｜谁在用
// 是什么：**页面唯一允许 import 的 cep 门面** —— 只转出「读」的东西，写的一个都没有。
// 替代了什么：eslint.config.js 里那套「逐名白名单」（`PAGE_ALLOWED_CEP` + `FS_WRITE_EXPORTS` +
//   三条 `importNames` 正则）。那份清单是**手写母体**：漏登记一个名字 = 悄悄删掉页面的能力，
//   而且失效时不报错（2026-10-25 已经发生过一次：`@/cep/env` 漏登记，页面再也读不到 `PS_ENV`）。
//   现在「页面能读到什么」是**这个文件的内容**——可 grep、可 review、缺了就是 TS2305（不是"规则不许你"）。
// 谁在用：`pages/style/index.vue`（userDir）、`pages/set/components/ClearCacheDialog.vue`
//   （userDir / dirUsage）、`pages/fontSet/index.vue`（openUrl）。
// 禁止：本文件只许 re-export **读**。写函数（`writeTextFile` / `writeTextFileAtomic` /
//   `writeBase64File` / `saveExportedText` / `removeFile`）永不许出现在这里；页面要写 ⇒ 走命令层。
//
// 依据：ADR-0002（页面禁止裸调 CEP；PS 出口收口在 src/cep/）、目标架构 §4.7（契约与唯一入口）。

export { dirUsage } from './dir-usage'
export { userDir } from './paths'
export { openUrl } from './open-url'
