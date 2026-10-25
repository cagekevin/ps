// 是什么：样式库文件（`.kux/.kus/.kug/.kuc/.kuf`）三种顶层形态的识别与「库载荷」提取，纯函数
// 替代了什么：此前只有 `.dzx` 的 `domain/action-dzx.ts`；四类样式库若各自判一次就是四份实现
// 谁在用：`cep/data/style-library-repo.ts`（读磁盘库文件）；导入导出（台账 T-48 第 2 段）
// 禁止：不要在这里读文件、不要在这里解码 base64（解码函数由调用方注入，见 `decode`）
import { isArrayOf, isRecord } from '@/utils/guards'

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

export function kuShapeOf(parsed: unknown): ProvenKu | null {
  if (Array.isArray(parsed)) {
    const head: unknown = parsed[0]
    // flat 的元素才有 `data`；groups 的元素是组对象（`{name,show,list}`）
    // 判据即证明（`isRecord` + `'data' in head`）⇒ 不再 `as` 断言
    if (isRecord(head) && 'data' in head) {
      return { shape: 'flat', head }
    }
    // groups：**每个元素都得是对象**（`[42]` 不是"三个组"）
    if (!isArrayOf(parsed, isRecord)) return null
    return { shape: 'groups', groups: parsed }
  }
  if (isRecord(parsed)) {
    // container：`arrFileData` 是数组，且每个元素是带 `name: string` 的对象
    const arrFileData = parsed.arrFileData
    if (!Array.isArray(arrFileData)) return null
    const entries = arrFileData.filter(
      (entry): entry is { name: string; data?: unknown } =>
        isRecord(entry) && typeof entry.name === 'string',
    )
    return { shape: 'container', entries }
  }
  return null
}

/**
 * 库文件名白名单，照抄原版 `app.v4.js:53678`：
 * `sj_kuCol / sj_kuSty / sj_kuGra / sj_kuFon / sj_kuFot`（`sj_kuFot` 实测无样本，照白名单收）。
 */
const KU_LIBRARY_NAME = /^sj_ku(?:Col|Gra|Fon|Sty|Fot)/

/** 是否是库文件条目（不是 `kuStyle/*`、`Gradient/*` 旁路图）。导入导出改名分派也用它，别各写一份 */
export function isKuLibraryFileName(name: string): boolean {
  return KU_LIBRARY_NAME.test(name)
}

/**
 * 解 `data` 字段：**先判类型，再解码**。
 *
 * `data` 可能是布尔 `false`（原版 `readBase64` 读不到就返回 `false`：`app.v4.js:72476-72483`，
 * 实测两处：全库导出第 6 条、`.kus` 的 `kuStyle/<id>.psd` 项）——直接丢给 base64 解码会抛
 * TypeError。空串同样按"没有内容"处理。
 * 依据：`docs/生成/库文件格式契约.md` §2.5 第 3 点、§2.6 第 2 点。
 */
export function decodeKuData(value: unknown, decode: (base64: string) => string): string | null {
  if (typeof value !== 'string') return null
  // 三份样本里换行两种形态并存：解码前一律去空白（契约 §1.1 约束 2）
  const compact = value.replace(/\s/g, '')
  if (!compact) return null
  return decode(compact)
}

export interface KuGroupsSource {
  /** 组数组原文（未归一化）；`null` = 这份文件里没有可用的库载荷 */
  groups: unknown[] | null
  /** 非空 = 跳过原因。调用方必须当成"读不到"，不能当成空库（否则用户会以为库里没东西） */
  note: string
}

function parseArrayText(text: string | null, note: string): KuGroupsSource {
  if (text === null) return { groups: null, note }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed)) return { groups: null, note: `${note}：内层不是数组` }
    // 同 `resolveKuGroups` 的 groups 分支：内层数组的每一项也必须是对象（TD-12-21）
    // 「数组 + 逐条证明」只有一份实现：`guards.isArrayOf`（原来这里手写 `parsed.every(isGroupRecord)`）
    if (!isArrayOf(parsed, isRecord)) {
      return { groups: null, note: `${note}：内层数组里有非对象项` }
    }
    return { groups: parsed, note: '' }
  } catch {
    return { groups: null, note: `${note}：内层不是合法 JSON` }
  }
}

/**
 * 从三种形态里取出「组数组」。
 *
 * 只做形态分派与解码，不认字段——字段归 `domain/style-library.ts`。
 */
export function resolveKuGroups(
  parsed: unknown,
  decode: (base64: string) => string,
): KuGroupsSource {
  const proven = kuShapeOf(parsed)
  if (!proven) return { groups: null, note: '结构不认识（既不是数组也不是容器）' }

  // 形状证明在 `kuShapeOf` 做完，这里只 switch 标签 —— 零 `as`、零兜底（消费侧不替生产者补课）
  switch (proven.shape) {
    case 'groups':
      return { groups: proven.groups, note: '' }
    case 'flat': {
      const head = proven.head
      if (!head) return { groups: null, note: '扁平清单是空的' }
      const text = decodeKuData(head.data, decode)
      return parseArrayText(text, `库文件读取失败（${String(head.name ?? '未知文件')}）`)
    }
    case 'container': {
      const hit = proven.entries.find((entry) => isKuLibraryFileName(entry.name))
      if (!hit) return { groups: null, note: '容器里没有样式库文件' }
      const text = decodeKuData(hit.data, decode)
      return parseArrayText(text, `库文件读取失败（${hit.name}）`)
    }
  }
}
