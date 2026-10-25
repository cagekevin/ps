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

/**
 * 数组：**替代裸 `Array.isArray(x)`**。
 *
 * TS 陷阱：`Array.isArray(x)` 对 `unknown` 会收窄成 `any[]` —— `any` 就此流进类型世界，
 * 下游每个成员访问都 unchecked（`no-unsafe-*` 报的就是它）。这里谓词写 `unknown[]`，
 * 运行时判据与 `Array.isArray` **一模一样**，只是不把 `any` 带出去。
 */
export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * 字符串。**唯一一份**：`font-extra` 曾自造 `const isString = (x): x is string => typeof x === 'string'`。
 * 与 `isUnknownArray` 同理 —— 写成谓词，别在调用点内联 `typeof x === 'string'` 再转型。
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 数组 + 逐元素形状证明。
 *
 * `isItem` 必须是**证明**（真校验），不是断言 —— 见本文件首行。
 * 元素形状全可选的类型（`{ id?: string }` 这类）传 `isRecord` 就是真证明：
 * 一个不含任何字段的对象确实满足"字段全可选"的契约，被排除的只有原始值与 null。
 */
export function isArrayOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(isItem)
}
