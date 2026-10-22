/**
 * 纯 JSON 数据的深拷贝。
 *
 * 项目里的配置/剪贴板/默认值都是可序列化对象，用 JSON 往返足够；
 * 集中在这里是为了避免每个模块各写一遍 `JSON.parse(JSON.stringify())`，
 * 以后要换成 `structuredClone` 也只改一处。
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
