// 是什么：**仓库的唯一构造器**（按环境选实现 + 强制 decode）＋ 它的两个实现件的选择规则
// 替代了什么：`pick.ts`（已删）—— 它的 `normalize` 曾是可选参数，12/13 个仓库因此把 `JSON.parse` 的结果直接当 `T`
// 谁在用：`src/cep/data` 下 13 个仓库定义（actions / common-use / font-extra / free-panel / index / legacy-settings / rename / style-library-repo）
//
// ── 唯一性声明（写清楚，别让人以为是假的）──────────────────────────────────────
// **这个文件里的 `dataRepo` 是应用层唯一能造出 `Repo<T>` 的入口**，理由与边界：
// 1. **形状通道唯一（结构上不可能绕过）**：`dataRepo` 的第 3 参 `decode: Decoder<T>` **必填**，
//    而 `fileRepo` 同样必填。所以「把 `JSON.parse` 的结果直接当 `T`」在类型层写不出来 ——
//    这条不靠自觉，靠签名。
// 2. **内存实现唯一（结构上不可能绕过）**：`memoryRepo` **不导出**，只有本文件能用。
//    它是最危险的那个 —— 直接用它 = 一个永远成功、永不失败的仓库（T-111 踩过：用例全绿但
//    测的是内存仓库）。现在没有导出 ⇒ 调用表达式写不出来。
// 3. **`fileRepo` 仍导出，这是本文件做不到的那一条**：TypeScript 没有 package-private，
//    要让它不可 import 只能把它搬进本文件（一个文件干两件事，代价大于收益）。它绕过的是
//    「环境选择」而**不是**「形状通道」：直接调用在无 Node 的浏览器里会抛 `NO_NODE`（**响的**），
//    不会静默写坏数据。所以留导出给实现级用例，**但不把它当入口**。
//    ⇒ 这条我判「放弃强声明」：`fileRepo` 是**唯一实现**，不是唯一入口。
// 4. **其它「一份实现」不是唯一入口**（`isArrayOf` / `toCommonUseItems` / `isCommonUseItem`）：
//    它们各自只有一份定义，但 TS 挡不住别人再写一份 —— 这类只能叫「唯一实现」，不叫「唯一入口」。
//
// ── 怎么用（照抄，别自己发明）──────────────────────────────────────────────────
// ① 新增一个数据文件 = 三行 + 一个 decode（缺一编译不过）：
//
//      const fooImpl: Repo<FooFile> = dataRepo(
//        () => `${userDir()}/${DATA_FILES.foo}`,  // 路径：文件名只能来自 `cep/env.ts` 的 DATA_FILES
//        createEmptyFooFile,                      // fallback：文件不存在时给什么（**不是** dev 种子）
//        decodeFooFile,                           // decode：必填，写在 `domain/<域>.ts`
//      )
//      export const fooRepo: RepoView<FooFile> = fooImpl    // store 只拿读侧
//      export const fooWriter: Repo<FooFile> = fooImpl      // 写侧另起名字，只给 commands/cloud
//
// ② 只在浏览器 dev 需要种子时：第 4 参 `{ seed: () => clone(SEED) }`（默认等于 fallback）。
// ③ 需要 `requireExisting` / `backup` / `retries` 时同样放第 4 参，别自己包一层写盘。
//
// ── 别这么写（每一条都对应一次踩过的坑）──────────────────────────────────────
// ✗ 自己写 `hasCep() ? fileRepo(...) : memoryRepo(...)` —— 环境选择只在这一处，别处再判就是分裂
// ✗ 直接 `import { fileRepo } from './file-repo'` —— 绕过环境选择；浏览器 dev 里抛 `NO_NODE`
// ✗ 不传 decode，或传 `(raw) => ({ value: raw as T })` —— 前者编译不过，后者是"盖章撒谎"
// ✗ 在模块加载期把实现定死 —— 测试装桥晚一步就静默测内存仓库（T-111 的假绿）
import { hasCep } from '@/cep/transport'
import type { Decoder } from '@/utils/decode'
import { fileRepo, type FileRepoOptions } from './file-repo'
import type { Repo } from './types'

/**
 * 内存仓库。**只在浏览器 dev 里用**，且**不导出**（唯一入口是 `dataRepo`）。
 *
 * 为什么需要它：P3 把 `ps.ts` 里的 mock 分支拿掉后，浏览器里没有 Node，
 * 写文件会抛 `NO_NODE`；标签/星级就没人兜底了。data 层必须和 jsx 一样双实现。
 *
 * 注意：CEP 里 Node 不可用时**不许**退回这里（ADR-14）——那会让用户以为保存成功。
 */
function memoryRepo<T>(initial: () => T): Repo<T> {
  let value = initial()
  const listeners = new Set<(value: T) => void>()
  const emit = (): void => {
    for (const listener of listeners) listener(value)
  }

  // 没有本地队列：`Repo<T>` 全同步，内存态读改写本身就是一段不可打断的同步代码。
  return {
    // 内存态没有"从磁盘读到坏内容"这一步，所以永远是成功读（`ok: true`）
    read: () => ({ ok: true as const, value }),

    write: (next) => {
      value = next
      emit()
    },

    overwrite: (next) => {
      value = next
      emit()
    },

    update: (mutator) => {
      const result = mutator(value)
      if (result !== undefined) value = result
      emit()
      return value
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * 按环境选实现，**只看 hasCep**：
 * - 浏览器（无 CEP）→ 内存 + dev 种子
 * - CEP（有/无 Node）→ 文件；无 Node 时写会抛 NO_NODE，不许退回内存（ADR-14）
 *
 * `decode` **必填**：磁盘内容是 `unknown`，只有它认得的那种形状才变成 `T`。
 * 不传就无法构造仓库 —— 「把 `JSON.parse` 的结果直接当 `T`」在类型层写不出来。
 *
 * 内存实现不需要 decode：它的初值本来就是 `T`（`seed`），没有"从磁盘读到的 unknown"这一步。
 *
 * **实现在第一次使用时才定，不在模块加载时定死**（T-113）：13 个仓库都在 import 期构造，
 * 若这里直接 `return hasCep() ? fileRepo : memoryRepo`，测试把 CEP 桥装晚一步就会静默走
 * `memoryRepo`（永不失败）——用例全绿但测的是内存仓库（T-111 第一版踩过）。
 * `npm run check` 的 `assertion-guard` 会拦住回到老写法（`return hasCep() ?`）。
 *
 * 单独成文件是为了避免 `data/index.ts` 与各仓库文件互相 import 成环。
 */
export function dataRepo<T>(
  resolvePath: () => string,
  fallback: () => T,
  decode: Decoder<T>,
  options: FileRepoOptions & { seed?: () => T } = {},
): Repo<T> {
  const { seed = fallback, ...fileOptions } = options
  /** 只在**首次调用**时求值并缓存：同一仓库实例的队列 / 监听表不能因为多次选择而分裂 */
  let impl: Repo<T> | null = null
  const repo = (): Repo<T> =>
    (impl ??= hasCep() ? fileRepo(resolvePath, fallback, decode, fileOptions) : memoryRepo(seed))

  return {
    read: () => repo().read(),
    write: (value) => repo().write(value),
    overwrite: (value) => repo().overwrite(value),
    update: (mutator) => repo().update(mutator),
    onChange: (listener) => repo().onChange(listener),
  }
}
