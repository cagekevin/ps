#!/usr/bin/env node
// 是什么：层间边界守卫——把「目标架构 §4.7 契约与唯一入口」里只靠"评审 + grep"的判据变成会红的检查。
// 替代了什么：逐行字面正则版（L4-L6 只认单引号 + 单行、L1 只认 `.update(` / `.write(` 两个字面、
//   L2 只认 `getLayerState(` 一个符号名）。四类漏法见 TD-17-10 / TD-17-22。
// 谁在用：`npm run check` 第 6 步；判据来源 = `docs/架构/目标架构.md` §4.4 / §4.7
//   + `daily/架构日志/12-跨区-地基三层与门禁-2026-10-24.md` §A（边界规则 R）、§B（漏的方向违规）。
//
// 【申诉口三问】
//   守什么  ：层与层之间的**方向性**违规（domain 反向依赖适配层、命令层绕过唯一入口、
//              状态层写用户资产、适配层反向依赖文案层）。方向问题，不是风格偏好。
//   什么时候该改它：判据本身被裁定作废时（例如决定让 domain 依赖 cep 的类型）。
//                      改法：先改 `docs/架构/目标架构.md` 对应行，再改这里的规则表，两处一起改。
//   怎么改  ：放宽 = 删掉对应规则条目；加严 = 在 RULES 里加一条，并补上"红了怎么办"文案。
//
// 【判据形态：判「边」，不判「行」】
//   除 L1 判调用形状外，规则判的都是 **import 边**（来源文件 → 目标模块）。判边而不判行的理由：
//   `import { getLayerState as g }` / `import {\n  x,\n} from "vue"` 改的是**语法**，
//   不该改判定结果。语法解析只在 `scripts/source-scan.mjs` 里写一次（见该文件头）。
//
// 【存量：只在「具名例外清单」里放行】
//   盘上既有违规由 `NAMED` 逐条具名（文件 + 规则 + 为什么现在不改 + 谁负责），放行条数落在
//   `scripts/layer-boundary.baseline.json`（`--update` 生成）。两者必须**互相对齐**：
//   · 基线里有、NAMED 里没有 ⇒ 红（不许出现没人认领的存量）；
//   · NAMED 里有、基线里没有 ⇒ 红（过期豁免要删，否则它变成永久通行证）；
//   · 条数不一致 ⇒ 红。
//   为什么两处：基线是"放行几条"的机器判据，NAMED 是"凭什么放行"的裁决记录 ——
//   少了任一条，下一个人就看不到是谁、为什么、什么时候该消。
//
// 例外：`src/pages/**` 的越层由 `scripts/page-boundary.mjs` 负责（页面层另有规则），本脚本不重复。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSources, scanImports } from './source-scan.mjs'

/** `--root=<dir>` 只给测试用（在临时目录里造分层文件）；生产不传 = 仓库根 */
const ROOT =
  process.argv.find((a) => a.startsWith('--root='))?.slice(7) ??
  fileURLToPath(new URL('..', import.meta.url))
/** 基线放 `scripts/` 而不是 `docs/生成/`：docs 不归守卫所有，基线是守卫自己的放行账 */
const BASELINE = join(ROOT, 'scripts', 'layer-boundary.baseline.json')

/** 判 import 边：`test(spec)` 只看来源模块，与写法（引号 / 换行 / 别名）无关 */
const RULES = [
  {
    id: 'L2',
    dir: 'src/commands',
    label: '命令层不得自己取选区',
    test: (spec) => spec === '@/selection' || spec.startsWith('@/selection/'),
    why: '选区快照唯一入口是 `selection/`，`registry.execute` 每次执行刷一次，命令复用父命令的快照。命令自己调 `refreshTextInfo()` 等于绕过唯一入口，两次刷新互相覆盖',
    fix: '用 `ctx.selection`；要刷新选区就发一条 `requires: "layer"` 的命令',
    /** 危害是"拿到取选区的**能力**"；`import type` 编译期擦除，拿不到能力 → 放行 */
    runtimeOnly: true,
    /** 唯一入口的持有者：刷快照的地方就是 registry，只有它可以碰 selection */
    exempt: (rel) => rel === 'src/commands/registry.ts',
  },
  {
    id: 'L3',
    dir: 'src/cep',
    label: '适配层不得依赖错误文案层',
    test: (spec) => spec === '@/utils/error-text' || spec.startsWith('@/utils/error-text/'),
    why: '文案归 `utils/error-text.ts`，适配层只抛 `CepError(code)`，不拼人话（目标架构 §4.7「错误文案」）',
    fix: '在适配层抛 `new CepError(code, detail)`，由 registry / useCommand 归一后再出文案',
    /** 同 L2：危害是"能拼人话"，type-only 拿不到函数 */
    runtimeOnly: true,
  },
  {
    id: 'L4',
    dir: 'src/domain',
    label: '领域层不得反向依赖适配层',
    test: (spec) => spec === '@/cep' || spec.startsWith('@/cep/'),
    why: '方向反了：domain 是最底层的纯规则，`@/cep` 是适配层。领域类型放 domain，适配层反向引 domain',
    fix: '把类型下沉到 `src/domain/<概念>.ts`（如 `domain/font-item.ts`），适配层改成 `import type ... from "@/domain/..."`',
  },
  {
    id: 'L5',
    dir: 'src/domain',
    label: '领域层零框架：不得依赖 Vue',
    test: (spec) => spec === 'vue' || spec.startsWith('vue/'),
    why: 'domain 是纯函数与类型，零 IO 零框架（AGENTS「domain 纯函数零 IO」）。引 Vue 后 domain 无法脱离运行时单测，UI 状态也会被塞进地基',
    fix: '把响应式状态搬到 `stores/<域>-view.ts` 或 `composables/`，domain 只留纯函数',
  },
  {
    id: 'L6',
    dir: 'src/utils',
    label: '工具层不得依赖状态层 / 框架',
    test: (spec) =>
      spec === 'vue' ||
      spec.startsWith('vue/') ||
      spec === '@/stores' ||
      spec.startsWith('@/stores/'),
    why: 'utils 是最底层工具箱，依赖 `stores` 会把状态层的初始化顺序绑进工具函数，也会让 store 与 utils 互为依赖',
    fix: 'utils 只收回调 / 纯函数；要提示用户就由调用方（registry / useCommand）接 `stores/feedback`',
  },
]

/**
 * L1 · 状态层只读投影。
 *
 * 判据不是"黑名单里有哪些写方法"，而是**`Repo<T>` 声明了哪些方法**：
 * store 里 `xxxRepo.<m>()` 的 m 必须落在接口里，且必须是读侧（`read` / `onChange`）。
 * 于是 `repo.appendItem(...)`（接口里根本没有的能力）与接口将来新增的写方法都被拦到 ——
 * 不用往守卫里补名字（补名字 = 第四份真相 = A4 说的"母体"）。
 */
const REPO_DECL = join(ROOT, 'src/cep/data/types.ts')
const REPO_READ = new Set(['read', 'onChange'])
const REPO_WRITE = new Set(['write', 'update'])
const L1 = {
  id: 'L1',
  label: '状态层只读投影，不得写用户资产',
  why: 'store 是只读投影，写用户资产的唯一入口是 commands 层（ADR-16 / 目标架构 §4.1 M1）',
  fix: '把写操作包成一条命令，命令里调 `ctx.data.<repo>.update(...)`，store 只订阅 `repo.onChange`',
}

/** 从 `interface Repo<T> { … }` 里读方法名；读不出来就红，不许静默放过整条 L1 */
function repoMethods() {
  if (!existsSync(REPO_DECL)) return null
  const body = readFileSync(REPO_DECL, 'utf8').match(
    /interface\s+Repo<[^>]*>\s*\{([\s\S]*?)\n\}/,
  )?.[1]
  if (!body) return null
  return new Set([...body.matchAll(/^\s*(\w+)\s*\(/gm)].map((m) => m[1]))
}

const violations = []

for (const rule of RULES) {
  for (const { file, text } of loadSources(join(ROOT, rule.dir), ['.ts', '.vue'])) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    if (rule.exempt?.(rel)) continue
    for (const record of scanImports(text)) {
      if (rule.runtimeOnly && record.typeOnly) continue
      if (!rule.test(record.spec)) continue
      violations.push({ rule, file: rel, line: record.line, text: record.text.slice(0, 160) })
    }
  }
}

const methods = repoMethods()
/** store 里对 `xxxRepo.<m>()` 的调用（先收齐再判：没有数据层声明的夹具不应被判死） */
const repoCalls = []
const CALL_RE = /\b(\w*[Rr]epo)\s*\.\s*(\w+)\s*\(/g
for (const { file, text, masked } of loadSources(join(ROOT, 'src/stores'), ['.ts', '.vue'])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  for (const match of masked.matchAll(CALL_RE)) {
    repoCalls.push({
      file: rel,
      line: text.slice(0, match.index).split('\n').length,
      text: match[0].trim(),
      method: match[2],
    })
  }
}

if (!methods) {
  // 判据来源缺席：这棵树里没有 `Repo<T>` 声明（夹具）。有调用要判才红，没有就跳过整条 L1。
  if (repoCalls.length) {
    violations.push({
      rule: { ...L1, why: '`Repo<T>` 接口读不出来 —— L1 的判据来自这份声明，声明变了判据就失效' },
      file: 'src/cep/data/types.ts',
      line: 1,
      text: '找不到 `interface Repo<T> { … }`',
    })
  }
} else {
  const drifted = [...REPO_READ, ...REPO_WRITE].filter((m) => !methods.has(m))
  if (drifted.length) {
    violations.push({
      rule: {
        ...L1,
        why: `读写侧名单与声明对不上（缺 ${drifted.join(' / ')}）—— 判据要跟声明一起改`,
      },
      file: 'src/cep/data/types.ts',
      line: 1,
      text: [...methods].join(', '),
    })
  }
  for (const call of repoCalls) {
    if (methods.has(call.method) && !REPO_WRITE.has(call.method)) continue
    violations.push({
      rule: {
        ...L1,
        why: methods.has(call.method)
          ? '`Repo<T>` 的写侧方法（`write` / `update`）：store 拿到写入口就能顺手改用户资产'
          : `\`${call.method}\` 不在 \`Repo<T>\` 接口里 —— 接口外的能力（写库 / 旁路 IO）一律不许 store 拿到`,
      },
      file: call.file,
      line: call.line,
      text: call.text,
    })
  }
}

/** 具名例外清单：每条 = 文件:行 + 为什么现在不改 + 谁负责（条数必须与基线一致） */
const NAMED = [
  {
    key: 'L6 src/utils/error-handler.ts',
    count: 2,
    where: 'src/utils/error-handler.ts:1,3  `vue` + `@/stores/feedback`',
    why: '它要接全局错误提示，依赖 stores/feedback + vue；拆开要改启动装配（main.ts）',
    owner: '阶段 3（G1 剩余）/ 用户决定',
  },
  {
    key: 'L2 src/commands/fontSet.ts',
    count: 1,
    where: 'src/commands/fontSet.ts:30  `@/selection/current-text`',
    why: '`refreshTextInfo()` 内部调 `jsx.font.getFontSimpleInfo()`（src/selection/current-text.ts:132-139），确实是命令自己取选区；本轮不碰 src/',
    owner: '阶段 3（G1 剩余）/ 用户决定',
  },
]

const keyOf = (v) => `${v.rule.id} ${v.file}`
const caught = {}
for (const v of violations) caught[keyOf(v)] = (caught[keyOf(v)] ?? 0) + 1

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(caught).sort(([a], [b]) => a.localeCompare(b)))
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  const total = Object.values(sorted).reduce((s, n) => s + n, 0)
  console.log(
    `[layer] 已写入 ${relative(ROOT, BASELINE)}：${Object.keys(sorted).length} 个文件 / ${total} 处`,
  )
  console.log(
    '[layer] 下一步：把每一行补进 `scripts/layer-boundary.mjs` 的 NAMED（为什么现在不改 / 谁负责）',
  )
  process.exit(0)
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}

/** `--root` 是临时夹具，没有"仓库存量"概念，不参与具名对齐 */
const isRepoRun = !process.argv.some((a) => a.startsWith('--root='))
const unnamed = isRepoRun
  ? Object.keys(baseline).filter((key) => !NAMED.some((n) => n.key === key))
  : []
const expired = isRepoRun ? NAMED.filter((n) => !(n.key in baseline)) : []
const mismatched = isRepoRun
  ? NAMED.filter((n) => n.key in baseline && (baseline[n.key] ?? 0) !== n.count)
  : []

/** 逐条扣减基线配额：允许 N 条，只报第 N+1 条起 */
const quota = { ...baseline }
const fresh = []
for (const v of violations) {
  const key = keyOf(v)
  if ((quota[key] ?? 0) > 0) {
    quota[key] -= 1
    continue
  }
  fresh.push(v)
}
const stale = Object.entries(baseline).filter(([key, n]) => (caught[key] ?? 0) < n)

if (!fresh.length && !unnamed.length && !expired.length && !mismatched.length) {
  console.log(
    `[layer] 通过：${RULES.length + 1} 条层间判据无新增违规（L1 / ${RULES.map((r) => r.id).join(' / ')}）`,
  )
  const allowed = Object.values(baseline).reduce((s, n) => s + n, 0)
  if (allowed)
    console.log(`[layer] 放行存量 ${allowed} 处，全部在 NAMED 里具名（为什么现在不改 / 谁负责）`)
  if (stale.length)
    console.log(`[layer] 提示：${stale.length} 处基线已下降，跑 \`--update\` 再同步 NAMED`)
  process.exit(0)
}

console.error('[layer] 失败：层间判据有违规\n')
for (const v of fresh) {
  console.error(`  ${v.file}:${v.line}  [${v.rule.id}] ${v.rule.label}`)
  console.error(`    代码：${v.text}`)
  console.error(`    为什么不行：${v.rule.why}`)
  console.error(`    怎么改：${v.rule.fix}\n`)
}
if (unnamed.length) {
  console.error('[layer] 基线里有存量没进 NAMED（不许出现没人认领的放行）：')
  for (const key of unnamed) console.error(`  ${key} —— 在 NAMED 里补「为什么现在不改 + 谁负责」`)
  console.error('')
}
if (expired.length) {
  console.error('[layer] NAMED 里的例外已经不在基线里（过期豁免要删）：')
  for (const n of expired) console.error(`  ${n.key}（${n.where}）`)
  console.error('')
}
if (mismatched.length) {
  console.error('[layer] NAMED 的条数与基线不一致：')
  for (const n of mismatched) console.error(`  ${n.key}：NAMED=${n.count} 基线=${baseline[n.key]}`)
  console.error('')
}
console.error(
  '规则：层方向不可逆 —— domain ← cep ← commands ← pages；store 只读；选区只在 selection/；错误文案只在 utils/error-text.ts。',
)
process.exit(1)
