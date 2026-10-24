// 是什么：类型守卫的唯一一份（`isRecord` 这类"形状证明"）
// 唯一入口：要判"这个 unknown 是不是普通对象"就 import 这里，别在各处再写一遍
// 替代了什么：`domain/ku-io` / `domain/style-library` / `data/style-library-repo` /
//   `data/style-library-io` 四份一模一样的 `isRecord`（TD-09-17；守卫是**证明**不是断言，见 §20）
// 谁在用：domain 的 ku-io / style-library、data 的 style-library-repo / style-library-io
// 禁止：写成 `as Record<string, unknown>`；守卫的返回值必须是类型谓词

/** 普通对象：非 null、非数组。数组要单判（`Array.isArray`），不混进来 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
