// 是什么｜替代了什么｜谁在用
// 是什么：**读的观测层** —— 三态骨架、`ENOENT` 判据、多来源合并策略，各一份；只报观测，不下结论
// 替代了什么：`cep/fs.ts:103-213` 与 `:317-415`（原来和写原语、环境判断、编码、目录统计混在一个文件里）
// 谁在用：四个档各有固定消费者 ——
//   `readOwnFileText` → `data/style-library-repo.ts`(4) / `cloud/entries/action-library.ts` / `data/swatch-repo.ts` / `cep/log-file.ts`
//   `readExternalText` → `commands/{font,rename}.ts` / `data/{action-archive,style-library-io}.ts`
//   `readBase64File` → `data/{style-library-repo,style-library-io,action-archive}.ts`
//   原语 `readTextSync` / `readTextAsync` → **只有** `cep/disk-write.ts` 与 `data/repo-read.ts`
// 禁止：这里**不许**判"读到坏数据该怎么办"（那是数据层的 `decode`）；也不许把三态压成 `boolean` / `string` / `null`
//
// ── `readTextSync` 的四个具名消费者（**加第五个之前先改 ADR-0026**）─────────────────────
// 它导出是因为"同步读"这件事本身有四个正当用途，不是因为它是通用读入口：
//   ① `cep/disk-write.ts`  —— 落盘前的 CAS 比对与写完回读（`await` 会多一个 microtask 边界 = D-26 丢更新处）
//   ② `data/file-repo.ts`  —— `rawOverwrite` 取原文（坏原文照写但要隔离，所以不能走 `readRepoFile` 的结论）
//   ③ `data/settings.ts`   —— 界面偏好在 store setup / computed 里读，不能 `await`
//   ④ `cep/log-file.ts`    —— 日志 dump 读回全文
// **面板数据文件（JSON）一律走 `data/repo-read.ts` 的 `readRepoFile(target, decode, fallback)`** ——
// 自己 `readTextSync` + `JSON.parse` + 当数据用，就绕过了 `decode`，"文件坏了"在页面上会变成"空面板"。

import { hasNode, nodeRequire, toPosix, type NodeModules } from './node'
import { evalScriptRaw, hasCep } from './transport'
import { userDir } from './paths'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * 三态读取结果（**观测**，不是结论）。
 *
 * 三个状态各自只描述"原语看到了什么"：
 * - `ok`：读到了内容；
 * - `notSeen`：文件系统**明确说那个路径上没有东西**——只认 `ENOENT`。
 *   **这不等于"文件不存在"**，也不代表"权限问题"：`EPERM` / `EACCES` / `EBUSY` / 网络盘错误
 *   一律进 `error`（实测 `C:\Windows\System32\config\SAM`：`accessSync` 报 `EPERM`，而
 *   `existsSync` 报 `false`——用 `existsSync` 判存在性会把"读不到"错判成"没有"）。
 *   要不要当"首次使用"由数据层按各自语义判（ADR-26 ②）；
 * - `error`：看不到或读不出来，`reason` 带原始错误码与文本。
 *
 * 压成两态（`string | null`）就会让写路径拿 fallback 派生值覆盖用户文件（D-42 / T-105）。
 */
export type TextRead =
  { status: 'ok'; text: string } | { status: 'notSeen' } | { status: 'error'; reason: string }

/** base64 读取的三态（与 `TextRead` 同形：**观测**，不是结论） */
export type Base64Read =
  { status: 'ok'; base64: string } | { status: 'notSeen' } | { status: 'error'; reason: string }

/** Node 系统错误的 `code`（`ENOENT` / `EPERM` / `EACCES` / `EBUSY` …）；取不到返回空串 */
function errCode(e: unknown): string {
  if (typeof e !== 'object' || e === null || !('code' in e)) return ''
  const code = e.code
  return typeof code === 'string' ? code : ''
}

/**
 * **唯一的错误归判据**：只认 `ENOENT` 是"查不到"，其余错误码一律 `error` + 原始原因。
 *
 * 为什么必须只有一份：读侧（`readTextNode` / `readBase64File`）与写侧/删除侧原本各自
 * 写了一遍「是不是 ENOENT」，四份会各自漂移 —— 一处把 `EPERM` 认成"没有"，
 * 就会出现「读不到 → 当成首次使用 → 拿默认值覆盖用户文件」（D-42 / T-105）。
 * 想放开哪个错误码当"没有"，只改这里，一次生效、一次被审。
 */
export function classifyFsError(
  e: unknown,
): { status: 'error'; reason: string } | { status: 'notSeen' } {
  const code = errCode(e)
  if (code === 'ENOENT') return { status: 'notSeen' }
  const message = e instanceof Error ? e.message : String(e)
  return { status: 'error', reason: code ? `${code}: ${message}` : message }
}

/**
 * Node 同步读的三态骨架：`hasNode` 守卫 + `try/catch` + `classifyFsError`。
 *
 * **唯一一份**：utf8 文本（`readTextNode`）与 base64 字节（`readBase64File`）都走这里，
 * 只把"怎么取字节"当参数传进来。以前这两处各自写了一遍 `if (!hasNode()) … try/catch …`，
 * 结构重复、只差 `readFileSync` 的编码参数。
 */
function readNodeOutcome<T>(
  take: (fs: NodeModules['fs']) => T,
): { status: 'ok'; value: T } | { status: 'notSeen' } | { status: 'error'; reason: string } {
  if (!hasNode()) return { status: 'error', reason: 'Node 不可用（--enable-nodejs 未开）' }
  try {
    return { status: 'ok', value: take(nodeRequire('fs')) }
  } catch (e) {
    const classified = classifyFsError(e)
    return classified.status === 'notSeen' ? { status: 'notSeen' } : classified
  }
}

function readTextNode(absPath: string): TextRead {
  const out = readNodeOutcome((fs) => fs.readFileSync(absPath, 'utf8'))
  return out.status === 'ok' ? { status: 'ok', text: out.value } : out
}

/**
 * **同步取原文**。用途**只有一个**：给写侧拿"上一版原文"做 CAS 比对 / `.bak` / 写完回读。
 *
 * 导出消费者**只有两个底座模块**（`grep -rn "readTextSync(" src`）：`cep/disk-write.ts` 与
 * `data/repo-read.ts`。其余一律走本文件对外的**四个档**：
 * - 面板数据文件（JSON，要 `decode`）→ `data/repo-read.ts` 的 `readRepoFile`
 * - 我们自己的文件原文（库文件 / 上传 / 纯文本）→ `readOwnFileText`
 * - 用户选的外部文件 → `readExternalText`
 * - 字节（base64）→ `readBase64File`
 *
 * 为什么它必须同步：落盘前的 CAS 比对若 `await`，会多一个 microtask 边界，
 * 另一个面板正好能在那个边界里写完一次 —— 这就是 D-26 丢更新的位置。
 *
 * 为什么必须三态：两态（`string | null`）会把 `EPERM` 压成"没有"，于是 CAS 比对在权限错时
 * 恒判"没人改过"（TD-09-24）；偏好读失败被当成默认值再写回覆盖原文件（TD-09-23）。
 *
 * **想加第二个消费者 ⇒ 先回答"它是不是在取上一版原文做备份/CAS"。答不出就说明它该走上面四条档里的某一条。**
 */
export function readTextSync(absPath: string): TextRead {
  // `hasNode` 守卫与三态映射都在 `readNodeOutcome` 里，这里不再各写一遍
  return readTextNode(absPath)
}

/**
 * 读文件为 base64。与 `readTextAsync` 同一条规矩：**只认 `ENOENT` 是 `notSeen`**，
 * 其余错误码一律 `error`（不用 `existsSync`，它对"存在但读不到"也返回 `false`）。
 *
 * 为什么它也需要三态：`style-library-io.ts` 的 `writeKuFile` 用"读没读到原文"判断
 * "这个文件是不是本次新建的"，回滚时只删新建的那些。把"读不到"当成"没有"，
 * 回滚就会删掉一个本来就存在的文件（T-109 的 P1）。
 */
export function readBase64File(absPath: string): Base64Read {
  // 与 `readTextNode` 共用同一个骨架（`readNodeOutcome`），只换"怎么取字节"
  const out = readNodeOutcome((fs) => fs.readFileSync(absPath).toString('base64'))
  return out.status === 'ok' ? { status: 'ok', base64: out.value } : out
}

/**
 * jsx 侧「文件不存在」的固定前缀。**脚本拼的那句和这里解析的那句必须是同一个常量**——
 * 以前脚本标了它、解析处 `startsWith(ERR_PREFIX) → null` 又把它扔掉，三态就此压成两态（T-105）。
 *
 * **精度上限（T-108 已知残差）**：ExtendScript 的 `File.exists` 没有错误码，权限不足与文件
 * 不存在都返回 false，所以这条路分不出 `EPERM`。**有 Node 时不影响结论**——`combineReads`
 * 让 Node 的 `error` 压过 jsx 的 `notSeen`；只有 CEP 没开 `--enable-nodejs` 时才退化成不精确。
 */
const JSX_MISSING_PREFIX = '文件不存在: '

async function readTextViaJsxOutcome(absPath: string): Promise<TextRead> {
  const script =
    `(function(){try{var __f = new File(${JSON.stringify(toPosix(absPath))});` +
    `if(!__f.exists){return '${ERR_PREFIX}${JSX_MISSING_PREFIX}' + __f.fsName;}` +
    `__f.encoding = 'UTF-8'; __f.open('r'); var __s = __f.read(); __f.close(); return __s;}` +
    `catch(e){return '${ERR_PREFIX}' + ((e && e.message) ? e.message : String(e));}})()`
  try {
    const raw = await evalScriptRaw(script, 15000)
    if (!raw.startsWith(ERR_PREFIX)) return { status: 'ok', text: raw }
    const message = raw.slice(ERR_PREFIX.length)
    if (message.startsWith(JSX_MISSING_PREFIX)) return { status: 'notSeen' }
    return { status: 'error', reason: message }
  } catch (e) {
    return { status: 'error', reason: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 多来源优先级（**策略，不是观测**）。
 *
 * 同一路径有两个来源（Node / jsx `File`）时，怎么合并两条观测是一条**决定**，不是事实：
 * 这里选「读不到」压过「查不到」——宁可报错，也不许把读失败降级成首次使用（D-42）。
 *
 * 它只能留在原语层：数据层根本看不到"有两个来源"这件事，挪过去就没法判。
 * 所以本条**必须**是具名的、可测的、注释写明是策略——不许再往里塞别的规则（ADR-26 ②）。
 */
function combineReads(node: TextRead | null, viaJsx: TextRead): TextRead {
  if (viaJsx.status === 'ok') return viaJsx
  if (node?.status === 'error') return node
  return viaJsx
}

/**
 * 读入口（ADR-26 ④）：Node 优先，失败退 jsx `File`。
 *
 * ── 本仓一共**两个**读入口（别再把这里读成"唯一"）──────────────────────────
 * 1. **同步**：`readTextSync`（Node-only 快路径）。消费者**三个**：
 *    `file-repo` 的 CAS 比对（D-26 硬需求）、`settings` 的同步偏好链（不能 `await`）、
 *    `log-file` 的 dump（`grep -rn "readTextSync(" src` = 3 处）。
 * 2. **异步**：就是本函数（Node 优先 + jsx `File` 回退）。
 * 两者共用 `readTextNode` + `classifyFsError` ⇒ **一个判据，两个入口**。
 *
 * **为什么同步入口唯一**：CEP 里能"同步读文件"的能力只有 Node `readFileSync` 一种；
 * jsx `evalScript` 是回调式，物理上不可能同步返回。能力集合里只有一条路 ⇒ 做不出第二个同步入口。
 *
 * **为什么异步入口唯一**：异步有两条路（Node 快路径 / jsx 回退），但它们的**合并策略只有一个
 * 正确位置**（`combineReads`：Node 的 `error` 压过 jsx 的 `notSeen`；两条都说 `notSeen` 才
 * `notSeen`）。拆成两个函数，合并判据就散到调用点 ⇒ 必然出现"某处只判 jsx"的分叉。
 *
 * **为什么不能只留一个**：
 * - 只留异步 → CAS 比对会多一个 microtask 边界（D-26 正是丢更新处）；`getPref` 在 store 顶层
 *   ref / computed 里不能 `await`。
 * - 只留同步 → CEP 未开 `--enable-nodejs` 时**读不到任何文件**（那条路只有 jsx 能给，而 jsx 只能异步）。
 *
 * 只有两条路都确认"查不到"才返回 `notSeen`；只要有一条路说"读不到"，就是 `error`
 * （合并规则见 `combineReads`，那是策略）。写路径必须用它：读失败被当成"文件不存在"时，
 * `update` 会拿 `fallback()` 派生的值覆盖用户文件，而且因为"原文为空"连 `.bak` 都不留（D-42 / T-105）。
 */
export async function readTextAsync(absPath: string): Promise<TextRead> {
  const node = hasNode() ? readTextNode(absPath) : null
  if (node?.status === 'ok') return node
  if (!hasCep()) return node ?? { status: 'error', reason: '当前环境没有 Node，也没有 CEP' }
  return combineReads(node, await readTextViaJsxOutcome(absPath))
}

/**
 * **「我们自己的文件原文」档**：读 `userDir()` 下、**本层不解释内容**的文件，原样交给调用方。
 *
 * 三个消费者，三种解释方，同一个机制：
 * - 库文件（`.kus/.kug/.kux/.kuf` / 裸组数组）→ 格式归 `domain/ku-format.ts`（三形态分派，
 *   见 `docs/生成/库文件格式契约.md` §2.3）。**这里不能 `JSON.parse`**，会把 `.kus` 容器当坏文件。
 * - 云同步上传 → 要磁盘上那份字节级原文；`decode` 再 `stringify` 会改格式（空格 / 键序），
 *   云端会认为内容变了。
 * - 纯文本（日志 `sj_v5_log.txt`、最近色数量 `zuiJinShuLiang.txt`）→ 无格式。
 *
 * 为什么合成**一个**入口而不是按"格式所有权"分三个：三者行为完全相同（都取原文、都不 parse），
 * 差别只在**调用方怎么解释内容**。按解释方分档 = 按调用点分档 —— 那会让下一个人在三个名字之间选，
 * 选错就是又一处不一致。
 *
 * 守卫：**只读 `userDir()` 下的文件**；传外面的路径直接 `error`（外面归 `readExternalText`）。
 *
 * ⚠️ **已知缺口，不掩饰**：它读得出任何一个 `userDir()` 下文件的原文，包括 `sj_set.json` 这种数据文件。
 * 这是"取原文"本身的性质 —— 上传 / 导出 / 库文件都必须能拿到原文，堵不掉。
 * 但它**产不出 `RepoRead`**：数据文件的结论只能由 `readRepoFile` 经 `decode` 产出。
 * 谁拿这里的原文自己 `JSON.parse` 当数据用，就是在写第二份 `decode` —— 那是可见的（review 一眼），
 * 不是"绕过入口"。**判据入口唯一、取原文开放**，这是设计不是漏洞。
 */
export function readOwnFileText(target: string): TextRead {
  const root = `${userDir()}/`
  if (!target.startsWith(root)) {
    return { status: 'error', reason: `readOwnFileText 只读用户目录下的文件：${target}` }
  }
  return readTextSync(target)
}

/**
 * **外部文件档**：读**用户对话框选的文件**（`.dzx` 导入 / 字体列表 / `.kux` 导入）。
 *
 * 为什么它是异步的：路径不在我们控制下，无 Node 时只能走 jsx `File` 回退。
 * 为什么它必须单独一个名字：它是**唯一**允许读 `userDir()` **之外**的入口，
 * 所以守卫反过来 —— **拒绝 `userDir()` 下的路径**（那些是面板自己的文件，归 `readOwnFileText` /
 * `readRepoFile`）。两条守卫方向相反、互为补集，所以"读哪个目录"在结构上没有第三种选择。
 */
export function readExternalText(target: string): Promise<TextRead> {
  if (target.startsWith(`${userDir()}/`)) {
    return Promise.resolve({
      status: 'error',
      reason: `readExternalText 只读用户目录外的文件；面板自己的文件走 readOwnFileText / readRepoFile：${target}`,
    })
  }
  return readTextAsync(target)
}
