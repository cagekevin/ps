// 是什么：样式库文件（`.kux/.kus/.kug/.kuc/.kuf`）三种顶层形态的识别与「库载荷」提取，纯函数
// 替代了什么：此前只有 `.dzx` 的 `domain/action-dzx.ts`；四类样式库若各自判一次就是四份实现
// 谁在用：`cep/data/style-library-repo.ts`（读磁盘库文件）；导入导出（台账 T-48 第 2 段）
// 禁止：不要在这里读文件、不要在这里解码 base64（解码函数由调用方注入，见 `decode`）
import { isArrayOf, isRecord } from '@/utils/guards'
import { isDecodeFail, shapeFail, type Decoded, type DecodeFail } from '@/utils/decode'
import type { KuKind } from './style-library'

/**
 * 形态依据 `docs/生成/库文件格式契约.md` §0.1（实测，不是推断）：
 * - `container`：`.kux` / `.dzx` → `{ arrFileData: [{ name, data }], store }`
 * - `flat`：`.kus` / `.kug` → `[{ name, data }]`，`[0]` 是库文件，其余是旁路图
 * - `groups`：`.kuc` / `.kuf` → `[{ name, show, list }]`，数组本身就是组数据
 *
 * 所以解析第一条判断必须是 `Array.isArray`，不能无脑读 `arrFileData`。
 */
export type KuShape = 'container' | 'flat' | 'groups'

/**
 * 已证的库文件形状（**生产者给对**，消费侧不 `as`、不兜底）。
 * `kuShapeOf` 返回它 —— 形状证明只做一次，在这里；消费侧只 switch 标签。
 */
export type ProvenKu =
  | { shape: 'groups'; groups: Record<string, unknown>[] }
  | { shape: 'flat'; head: Record<string, unknown> }
  | { shape: 'container'; entries: Array<{ name: string; data?: unknown }> }

export function kuShapeOf(parsed: unknown): Decoded<ProvenKu> | DecodeFail {
  if (Array.isArray(parsed)) {
    const head: unknown = parsed[0]
    // flat 的元素才有 `data`；groups 的元素是组对象（`{name,show,list}`）
    // 判据即证明（`isRecord` + `'data' in head`）⇒ 不需要 `as` 断言
    if (isRecord(head) && 'data' in head) return { value: { shape: 'flat', head } }
    // groups：**每个元素都得是对象**（`[42]` 不是"三个组"）—— 说不出是哪一项，所以给个数
    if (!isArrayOf(parsed, isRecord)) return { fail: 'badItem', count: parsed.length }
    return { value: { shape: 'groups', groups: parsed } }
  }
  if (isRecord(parsed)) {
    // container：`arrFileData` 是数组，且每个元素是带 `name: string` 的对象
    const arrFileData = parsed.arrFileData
    if (!Array.isArray(arrFileData)) return shapeFail('arrFileData', 'array', arrFileData)
    const entries = arrFileData.filter(
      (entry): entry is { name: string; data?: unknown } =>
        isRecord(entry) && typeof entry.name === 'string',
    )
    return { value: { shape: 'container', entries } }
  }
  // 既不是数组也不是对象：说不出具体字段（形态本来就多），给"期望数组 + 实际值"
  return shapeFail('', 'array', parsed)
}

/**
 * 库文件名 → 库类型；**不是库文件**给 `'sidecar'`（旁路图）。
 *
 * 一张表同时回答"是不是库文件"和"是哪一种"—— 拆成两个判据会长出"名字像库文件、
 * 类型却认不出"的缝（一个说真、一个给空），调用方各自兜底，最后谁都不知道该信哪个。
 *
 * 前缀 `sj_ku` + 后三位定类型，照抄原版 `app.v4.js:53678`：
 * `Col / Gra / Fon / Sty / Fot`（`Fot` 实测无样本，按白名单收）。
 */
export type KuLibraryKind = KuKind | 'sidecar'

const KU_LIBRARY_TABLE: ReadonlyArray<{ code: string; kind: KuKind }> = [
  { code: 'Col', kind: 'color' },
  { code: 'Gra', kind: 'gradient' },
  { code: 'Fon', kind: 'font' },
  { code: 'Fot', kind: 'font' },
  { code: 'Sty', kind: 'style' },
]

export function kuLibraryKind(name: string): KuLibraryKind {
  if (!name.startsWith('sj_ku')) return 'sidecar'
  return KU_LIBRARY_TABLE.find((entry) => entry.code === name.slice(5, 8))?.kind ?? 'sidecar'
}

/** 是否是库文件条目（不是 `kuStyle/*`、`Gradient/*` 旁路图）。导入导出改名分派也用它，别各写一份 */
export function isKuLibraryFileName(name: string): boolean {
  return kuLibraryKind(name) !== 'sidecar'
}

/**
 * 解 `data` 字段：**先判类型，再解码**。
 *
 * `data` 可能是布尔 `false`（原版 `readBase64` 读不到就返回 `false`：`app.v4.js:72476-72483`，
 * 实测两处：全库导出第 6 条、`.kus` 的 `kuStyle/<id>.psd` 项）——直接丢给 base64 解码会抛
 * TypeError。空串同样按"没有内容"处理。
 * 依据：`docs/生成/库文件格式契约.md` §2.5 第 3 点、§2.6 第 2 点。
 */
export function decodeKuData(
  value: unknown,
  decode: (base64: string) => string,
): Decoded<string> | DecodeFail {
  // 不是字符串（`false` / `0` / 缺字段）⇒ 契约 §2.5 的「这个条目没有内容」：
  // 是可枚举的结论（`emptyContent`），不是 `null` 也不是"空库"
  if (typeof value !== 'string') return { fail: 'emptyContent' }
  // 三份样本里换行两种形态并存：解码前一律去空白（契约 §1.1 约束 2）
  const compact = value.replace(/\s/g, '')
  if (!compact) return { fail: 'emptyContent' }
  return { value: decode(compact) }
}

/**
 * 内层载荷（`.kus/.kug` 的 `data` 解出来的文本）→ 组数组。
 *
 * 返回 `Decoded` / `DecodeFail`：**不用 `{ groups, note }` 那种形状** ——
 * 那是可忽略字段（`note` 空串算正常、非空算坏，`.groups` 永远可取），
 * 调用方一句 `if (!source.groups)` 就把「结构不认识」「内层不是数组」「内层不是 JSON」
 * 「有非对象项」四种原因压成同一句（判据 4 + 判据 3）。
 */
function decodeKuArrayText(content: Decoded<string> | DecodeFail): Decoded<unknown[]> | DecodeFail {
  // "没有内容"由 `decodeKuData` 给出，原样上抛 —— 不在这一层二次翻译
  if (isDecodeFail(content)) return content

  let parsed: unknown
  try {
    parsed = JSON.parse(content.value)
  } catch {
    return { fail: 'notJson' }
  }
  if (!Array.isArray(parsed)) return shapeFail('', 'array', parsed)
  // 「数组 + 逐条证明」只有一份实现：`guards.isArrayOf`（元素判据不在此手写 `parsed.every(isGroupRecord)`）
  if (!isArrayOf(parsed, isRecord)) return { fail: 'badItem', count: parsed.length }
  return { value: parsed }
}

/**
 * 从三种形态里取出「组数组」。
 *
 * 只做形态分派与解码，不认字段——字段归 `domain/style-library.ts`。
 * 失败是**可枚举的判别联合**（`shape` / `emptyContent` / `notJson` / `badItem`）：
 * 调用方能说清"是形态不认识"还是"内层不是 JSON"还是"有非对象项"。
 */
export function resolveKuGroups(
  parsed: unknown,
  decode: (base64: string) => string,
): Decoded<unknown[]> | DecodeFail {
  const proven = kuShapeOf(parsed)
  // 形态判定失败**原样上抛**：`kuShapeOf` 已说清是"没有 arrFileData"还是"数组里混了非对象"，
  // 这里再包一句 `shapeFail('', 'array', …)` 就把那个原因盖掉了。
  if (isDecodeFail(proven)) return proven

  // 形状证明在 `kuShapeOf` 做完，这里只 switch 标签 —— 零 `as`、零兜底（消费侧不替生产者补课）
  const shape = proven.value
  switch (shape.shape) {
    case 'groups':
      return { value: shape.groups }
    case 'flat':
      return decodeKuArrayText(decodeKuData(shape.head.data, decode))
    case 'container': {
      const hit = shape.entries.find((entry) => isKuLibraryFileName(entry.name))
      if (!hit) return { fail: 'emptyContent' }
      return decodeKuArrayText(decodeKuData(hit.data, decode))
    }
  }
}
