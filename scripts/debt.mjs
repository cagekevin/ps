#!/usr/bin/env node
/**
 * 债务账本读写**唯一入口** —— 主表 `债务.md`（只留待办）+ 归档 `债务-归档.md`（已完成）。
 *
 * 【为什么存在】`债务.md` 原有 2 个手写点（`债务登记5步法` Step 4.2 追加 + `架构师改码7步法` Step 7.4 改状态），
 *   且两处都只规定"不删"、**没规定"改状态怎么改"** → 实测漂移：同 ID 两行（改状态被写成再追一行）、
 *   归类 **40+ 种写法**、`\|` 转义被误判 + 裸 `|` 撑破列致 14 行错位。收口判据（CLAUDE §5.4.9）：可写点 ≥2 且已漂移过 → 该收。
 *
 * 【机制：写入口，不是闸】`add`/`resolve` 在**落盘前**拒非法枚举 / 含 `|` 的摘要 / 不存在的锚点 —— 表单校验，
 *   **不挂 `gates.manifest.json`、不进 CI**（用户 2026-09-14 定调：写文档要的是**规范**，不是门禁）。
 *
 * 【活账 / 死账分离】`archive` 把已完成项移入 `债务-归档.md` → 主表只剩待办（实测 146KB/182 条 → 4.9KB/8 条）。
 *   读命令**默认跨两者**：查历史债用 `--all` / `--area` / `search`，不必手读归档文件。
 *
 * 【取号口径 = 主表 ∪ 归档】（2026-09-14 修复）`add` 的"区内 max 序号"与"区域名"都取自 `loadAll()`，
 *   与读命令**同一口径**；并在落盘前加**取号自检**（新 ID 已存在 → 拒写）。
 *   ⚠️ 旧实现只查主表 → 某区历史债**全部归档后** `maxN` 归零 → 下次登记必得 `TD-<NN>-1` 撞已归档 ID；
 *   又因 `loadAll()` 按 ID 去重（主表优先），撞号会**静默遮蔽**归档同名债 = 账本静默腐坏。
 *   实证：2026-09-14 02 区登记被误分配 `TD-02-1`/`TD-02-2`（均已于首轮存在并归档），区域名同时退化成裸 `02`。
 *   → 见 TD-17-2（已解决）。
 *
 * 【摘要 / note 里别用 ASCII 双引号 `"`】（2026-09-14 实证 · PowerShell）PowerShell 5.1 传实参给原生
 *   命令时会把 `"` 当**引号边界**处理 ⇒ 参数被截断（实测：一条 note 只进到 `…必须是` 就没了）。
 *   规范：正文用中文引号 `「」`，**不要**用 `"`。这条对 `--summary`/`--note`/`--status` 都成立。
 *
 * 【锚点口径 = 只认区域日志】（2026-09-14 · TD-22-17 收口）原校验只有 `existsSync(join(LOG_DIR, anchor))`
 *   ⇒ `../docs/132-….md` 这类**逃逸路径**同样"存在"故通过。实证后果：6 条债锚在 `docs/132`，
 *   区域日志里根本没有探债段（违反 §七.3「债明细真源 = 每区架构日志」），
 *   且 `show` 会把入口拼成 `daily/架构日志/132-M2 计划 §八` 这种**不存在的路径**。
 *   新判据（`anchorProblem()`，写入前 + `audit` 只读巡检**共用同一份**）：
 *   锚点必须是无路径分隔符的区域日志命名 `<NN>-…-<日期>.md`（跨区轮次 `20-跨区-…` 同样匹配）。
 *   明细搬家后改锚点用 `reanchor`（**禁手写表格行**）。
 *
 * 【列错位为什么能无损解析】`line.split('|')` 与 `join('|')` 互逆：只要重新定出正确列边界，描述里的裸 `|`
 *   会被逐字还原。靠**四级校验**（标准 / A 尾部多余段 / B 右锚定 / C 左锚定状态起点），任一级不过就报 `manual`，**绝不猜**。
 *
 * 【结账闸：`resolve` 必须有凭证（2026-10-25 · TD-09-37）】
 *   实证：全量复算 115 条「已解决」→ 39 条**零凭证**（"旧台账 D-xx 已 done 迁移归档"）、
 *   76 条只有散文数字（19 条假或口径窄）。根因**不是有人算错**，是「结账」这个动作**没有门槛**：
 *   写进去就永久有效，从没人复算。故 `resolve` 起强制 `--evidence`，三道闸缺一即**拒写**（不是警告）：
 *     ① 格式 / 三问齐全；② 凭证命令**真跑一遍**；③ 声称与实跑**对得上**。
 *   **不许开后门**：没有 `--force` / `--legacy` / 环境变量；主刀也得给凭证。
 *   机器化不了的（如「删掉了冗余实现」）走**人工降级**：`kind=人工;by=<谁>;why=<为什么>`，
 *   **显式标记 + 有名有姓**，`reverify` 单列「人工担保」，不与机验混算。
 *   存量复算用 `reverify`（**只读**）：真跑每条凭证命令，出「可复用 / 数字漂移 / 无凭证待补」三张清单。
 *
 * 用法（读）：
 *   node scripts/debt.mjs list [--area 22] [--status 待还] [--class 增债] [--all] [--json]
 *     · 默认 = 主表待办；给了 `--area`/`--status`/`--class`/`--all` 之一 = **跨主表 + 归档**筛
 *   node scripts/debt.mjs area <NN>            # 某区**全部**历史债（含归档）—— 开审前查"这区以前查出过什么"
 *   node scripts/debt.mjs search <关键词> [--area 22]   # 跨区找同类问题（多词 AND）
 *   node scripts/debt.mjs show <TD-ID>         # 单条最新真相 + **解法入口**（锚点区域日志）
 *   node scripts/debt.mjs audit [--liveness]   # 只读体检（**不是闸**）；常开"锚点里有没有这个债号"（断链巡检）；
 *                                              # --liveness 追加"债描述点名的代码文件是否还在"
 * 用法（写 / 维护）：
 *   node scripts/debt.mjs add --area 22 --summary "…" [--class 增债] [--rate 中] [--owner 结构债]
 *                              [--anchor 22-视频-横切全量-2026-09-13.md] [--refs "@见 TD-xx"]
 *   node scripts/debt.mjs resolve <TD-ID> --evidence "cmd=…;claim=…;fail=…;cplx=…;impl=…"
 *                              [--status 已解决] [--note "…"] [--date YYYY-MM-DD] [--drop-original]
 *                              # **凭证强制**（见文件头【结账闸】）；没有 `--evidence` 直接拒写
 *                              # 该行已有 `原记「…」` ⇒ **默认逐字保留**（重结账 ≠ 销毁历史）；
 *                              # 要丢必须显式 `--drop-original`（会打印被丢掉的原文）
 *   node scripts/debt.mjs edit <TD-ID> --field summary｜solution｜classify｜rate --value "…"
 *                              # 整格/文本替换：现象 · 解法（寄居状态格）· 归类 · 利息率
 *                              # `solution` 只替换解法那一段：`原记「…」` 与 `evidence:v1{…}`
 *                              # **逐字保留**；要销毁原文必须显式 `--drop-original`
 *   node scripts/debt.mjs reanchor <TD-ID> --anchor 22-视频-剪辑器-M2计划审计-2026-09-14.md
 *   node scripts/debt.mjs move <TD-ID> --to <NN>          # 整体迁区（改 ID 区段 + 区名列，其余逐字保留）
 *   node scripts/debt.mjs archive [--dry]
 * 用法（只读复算）：
 *   node scripts/debt.mjs reverify <TD-ID> | --all   # 真跑每条「已解决」自带的凭证命令，与声称对账；
 *                                                   # 汇总三张清单：可复用 / 数字漂移 / 无凭证待补
 *                                                   # （+ 跑不动 / 人工担保 两张，见文件头）
 *                                                   # **只读：不改任何状态**，改不改账本由人决定
 * 用法（撤销结账 · `resolve` 的严格反向）：
 *   node scripts/debt.mjs reopen <TD-ID> --why "…" [--dry]        # **已解决** → 待还（不要求凭证）
 *   node scripts/debt.mjs reopen --from-reverify [--dry]           # 直接吃 reverify 的「无凭证」那批
 *                                                                  # 只降「已解决」：裁定类不降、有凭证的不降
 *                                                                  # 归档行降级时**搬回主表**（否则 = 假降级）
 *                                                                  # 原结账句逐字进 `原记「…」`（不截断）
 * 测试夹具：`--root=<dir>`（任意位置）—— 把账本指到已知答案的夹具，见 `tests/scripts/debt-*.test.ts`。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

// `--root=<dir>` 只给测试夹具用（与 `stats.mjs` / `layer-boundary.mjs` 同款口径）：
// 它把**账本位置**指到夹具，不改任何判据 —— 结账闸在哪个根上跑都得给凭证。
const ROOT_ARG = process.argv.find((a) => a.startsWith('--root='))?.slice(7) ?? ''
const ROOT = ROOT_ARG ? resolve(ROOT_ARG) : fileURLToPath(new URL('..', import.meta.url))
const LOG_DIR = join(ROOT, 'daily', '架构日志')
const LEDGER = join(LOG_DIR, '债务.md')
const ARCHIVE = join(LOG_DIR, '债务-归档.md')

/**
 * 【读债必看 ADR】（2026-09-18 · 7 步法 铁律 6 · ADR-0001）
 * **既有约定未必是对的 —— 它可能正是我们要消灭的对象。** 读债 / 普查前先过一遍 ADR 索引，
 * 免得把已被推翻的旧约定当依据（实证：拿一条"并不存在的既有约定"给非法值兜底背书）。
 */
const ADR_NUDGE =
  '   ↳ 读债前先过 `docs/adr/README.md` 索引 —— 哪些既有约定已被**推翻**（铁律 6：既有约定不是判据来源）'

// ─────────────────────────────────────────────────────────────────────────────
// 规范真源（唯一）：改枚举 = 改这里 + 两处流程文档，不得只改一处
// ─────────────────────────────────────────────────────────────────────────────
const CLASSES = ['还债', '持平', '增债']
const RATES = ['高', '中', '低']
const OWNERS = ['结构债', '业务债']
const STATUS_WORDS = [
  '待还',
  '待用户拍板',
  '已解决',
  '已裁定非债',
  '已裁定',
  '待翻新',
  '已退役',
  '不做',
]
const TODO_WORDS = ['待还', '待用户拍板', '待翻新']
const DONE_WORDS = ['已解决', '已裁定', '已裁定非债', '已退役', '不做']
const _STATUS_RANK = {
  待还: 1,
  不做: 1,
  待翻新: 2,
  待用户拍板: 2,
  已裁定: 3,
  已裁定非债: 3,
  已解决: 4,
}
/** 历史写法 → 规范词（存量归一用；新登记不接受别名） */
const STATUS_ALIAS = {
  已自纠: '已解决',
  已办: '已解决',
  已闭: '已解决',
  已修: '已解决',
  '待 G5 接线': '待还',
  待人工跑: '待还',
  待回改: '待还',
  待做: '待还',
  部分完成: '待还',
  迁入中: '待还',
}
/** 归类别名（`→` 后是状态流转，取箭头前；"非债"是裁定不是归类 → 归持平） */
const CLASS_ALIASES = {
  '还债+持平': '还债',
  '还债（源头收敛·设计+重构）': '还债',
  '还基（规则修正）': '还债',
  '增债→还': '增债',
  '持平→已还': '持平',
  '持平→待翻新': '持平',
  '持平→待还': '持平',
  '持平→**保留分层**': '持平',
  '持平（**半成品**）': '持平',
  '持平（**M1 必需项缺位**）': '持平',
  '持平（**裁：推迟 M2**）': '持平',
  '增债→**不做**': '增债',
  '增债→**删**': '增债',
  '增债→**不建/复用**': '增债',
  '增债→**并入**': '增债',
  '增债→**建**': '增债',
  '增债→**已修**': '增债',
  '增债→**已办**': '增债',
  '增债→**升级**': '增债',
  '增债→**非债**': '持平',
  非债: '持平',
  设计观察: '持平',
  待还: '持平',
  累计: '增债',
}
const RATE_ALIASES = { 中高: '高', '低-中': '中', '—': '低', '-': '低' }
/**
 * 本仓高频**母体词**同义表 —— 只用于 `search`：**精确匹配 0 命中时**才降级扩展（不牺牲精度）。
 * 目的：AI 想找"同类问题"时用的词与账本里写的词往往不同（搜"重复实现"而账本写"SSOT 第二份"）。
 */
const SYNONYMS = {
  SSOT: [
    '双真相',
    '第二份',
    '两份真相',
    '同语义两处',
    '两处维护',
    '重复实现',
    '两处实现',
    '同语义两实现',
    '抄成多份',
  ],
  双真相: ['SSOT', '第二份', '两份'],
  静默: ['吞错', 'catch', '零日志', '不报错', '静默失败', '无信号', '吞掉', '无声'],
  吞错: ['静默', 'catch', '零日志'],
  假收窄: ['as any', 'as never', 'as unknown', '断言', '绕过类型'],
  死代码: ['0 引用', '零消费', '死导出', '死参数', '无人调用', '没用', '残留'],
  唯一入口: ['绕过', '旁路', '直调', '入口', '绕过入口'],
  兜底: ['回退', '降级', 'fallback', '退化', '兜底式'],
  假成功: ['伪装', '假绿', '谎报', '不报错'],
  注释漂移: ['描述漂移', '失实注释', '过时注释', 'stale'],
  漏网: ['未覆盖', '盲区', '回潮', '复发'],
}
/** 反向索引：值 → 所属键（让"搜表外的同义说法"也能扩展，如 `重复实现` → SSOT 全组） */
const SYN_REV = (() => {
  const m = {}
  for (const [k, vs] of Object.entries(SYNONYMS))
    for (const v of vs) (m[v.toLowerCase()] ??= []).push(k)
  return m
})()
/** 把一个搜索词扩展成同义组（键 + 双向） */
function expandWord(w) {
  const out = new Set([w])
  for (const v of SYNONYMS[w] ?? []) out.add(v)
  for (const k of SYN_REV[w.toLowerCase()] ?? []) {
    out.add(k)
    for (const v of SYNONYMS[k]) out.add(v)
  }
  return [...out]
}

const MAP = {
  TD: { id: 0, area: 1, summary: 2, class: 3, rate: 4, status: 5, anchor: 6, cols: 7 },
  MD: { id: 0, summary: 1, class: 2, status: 3, anchor: 4, cols: 5 },
}
const TABLE_ROW = /^\|\s*\*{0,2}(TD|MD)-\d+-\d+/
const ESC = '\u0001'

const today = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const stripBold = (s) =>
  String(s ?? '')
    .trim()
    .replace(/^\*+|\*+$/g, '')
    .trim()
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

// ─────────────────────────────────────────────────────────────────────────────
// 解析（含列错位四级校验）
// ─────────────────────────────────────────────────────────────────────────────
const isClassish = (s) => {
  const t = stripBold(s)
  return CLASSES.includes(t) || has(CLASS_ALIASES, t) || /^(还债|持平|增债)/.test(t)
}
const isRateish = (s) => {
  const t = stripBold(s)
  return (
    RATES.includes(t) ||
    has(RATE_ALIASES, t) ||
    /^[高中低]-?[高中低]/.test(t) ||
    /^(高|中|低|—|-)/.test(t)
  )
}
const isStatusShape = (s) =>
  /^\*{0,2}\[(已裁定非债|已解决|已裁定|待用户拍板|待翻新|已退役|待还|不做)/.test(
    String(s ?? '').trim(),
  )
const isAnchorish = (s) =>
  /^\*{0,2}\[[^\]]*\]\([^)]*\)/.test(String(s ?? '').trim()) || stripBold(s) === '—'

/** 解析一行表格 → null | {broken} | {kind, parts, inner, fields, mode}；mode: ok/A/B/C/manual */
function readRow(line) {
  if (!TABLE_ROW.test(line)) return null
  const kind = line.match(TABLE_ROW)[1]
  const parts = line
    .replace(/\\\|/g, ESC)
    .split('|')
    .map((x) => x.replaceAll(ESC, '\\|'))
  if (parts[0] !== '' || parts[parts.length - 1].trim() !== '') return { broken: true, kind, parts }
  const inner = parts.slice(1, -1)
  const C = MAP[kind]
  const fields = (arr) => ({
    kind,
    id: stripBold(arr[C.id]),
    area: (arr[C.area] ?? '').trim(),
    summary: (arr[C.summary] ?? '').trim(),
    class: (arr[C.class] ?? '').trim(),
    rate: (arr[C.rate] ?? '').trim(),
    status: (arr[C.status] ?? '').trim(),
    anchor: (arr[C.anchor] ?? '').trim(),
  })
  if (inner.length === C.cols) return { kind, parts, inner, fields: fields(inner), mode: 'ok' }
  const n = inner.length
  if (kind !== 'TD' || n < C.cols)
    return { kind, parts, inner, fields: fields(inner), mode: 'manual' }
  // A：左端标准位置正确 + 尾部多段（同锚点被贴两次）
  if (
    isClassish(inner[3]) &&
    isRateish(inner[4]) &&
    isStatusShape(inner[5]) &&
    inner.slice(6).every(isAnchorish)
  ) {
    const fixed = [
      ...inner.slice(0, 6),
      inner
        .slice(6)
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' · '),
    ]
    return { kind, parts, inner, fields: fields(fixed), mode: 'A', fixedInner: fixed }
  }
  // B：右锚定（末 4 段 = 归类 / 利率 / 状态 / 锚点）
  if (
    isClassish(inner[n - 4]) &&
    isRateish(inner[n - 3]) &&
    isStatusShape(inner[n - 2]) &&
    isAnchorish(inner[n - 1])
  ) {
    const fixed = [
      inner[0],
      inner[1],
      inner
        .slice(2, n - 4)
        .join('|')
        .trim(),
      inner[n - 4].trim(),
      inner[n - 3].trim(),
      inner[n - 2].trim(),
      inner[n - 1].trim(),
    ]
    return { kind, parts, inner, fields: fields(fixed), mode: 'B', fixedInner: fixed }
  }
  // C：左找"状态起点"（首个状态形状段）+ 右锚定锚点
  if (isAnchorish(inner[n - 1])) {
    for (let i = 4; i <= n - 2; i++) {
      if (!isStatusShape(inner[i]) || !isClassish(inner[i - 2]) || !isRateish(inner[i - 1]))
        continue
      const status = inner.slice(i, n - 1).join('｜')
      if (!statusWord(status)) continue
      const fixed = [
        inner[0],
        inner[1],
        inner
          .slice(2, i - 2)
          .join('|')
          .trim(),
        inner[i - 2].trim(),
        inner[i - 1].trim(),
        status.trim(),
        inner[n - 1].trim(),
      ]
      return { kind, parts, inner, fields: fields(fixed), mode: 'C', fixedInner: fixed }
    }
  }
  return { kind, parts, inner, fields: fields(inner), mode: 'manual' }
}

// ─────────────────────────────────────────────────────────────────────────────
// 枚举归一
// ─────────────────────────────────────────────────────────────────────────────
function normClass(v) {
  const s = stripBold(v)
  if (CLASSES.includes(s)) return { value: s }
  if (has(CLASS_ALIASES, s)) return { value: CLASS_ALIASES[s], from: String(v).trim() }
  const m = s.match(/^(还债|持平|增债)/)
  return m ? { value: m[1], from: String(v).trim() } : { unknown: true, value: s }
}
function normRate(v) {
  const raw = String(v ?? '').trim()
  if (!raw) return { value: '' }
  const s = stripBold(raw)
  if (RATES.includes(s)) return { value: s }
  if (has(RATE_ALIASES, s)) return { value: RATE_ALIASES[s], from: raw }
  if (/^[中高]-?[中高]|^中高/.test(s)) return { value: '高', from: raw }
  if (/^低-中|^中-低/.test(s)) return { value: '中', from: raw }
  const m = s.match(/^(高|中|低)/)
  return m ? { value: m[1], from: raw } : { unknown: true, value: s }
}
function normStatus(v) {
  const raw = String(v ?? '').trim()
  if (!raw) return { value: raw }
  const tail = raw.replace(/^\*{0,2}\[\*{0,2}/, '')
  for (const k of Object.keys(STATUS_ALIAS))
    if (tail.startsWith(k))
      return { value: `[${STATUS_ALIAS[k]}${tail.slice(k.length)}`, from: raw }
  if (isStatusShape(raw)) return { value: raw }
  const bare = stripBold(raw)
  const m = bare.match(/^(已裁定非债|已解决|已裁定|待用户拍板|待翻新|已退役|待还|不做)(.*)$/)
  if (m) return { value: `[${m[1]}${m[2]}]`, from: raw }
  if (STATUS_WORDS.includes(bare)) return { value: `[${bare}]`, from: raw }
  return { unknown: true, value: raw }
}
/** 状态词（先同义归一） */
function statusWord(status) {
  const m = normStatus(status).value.match(
    /^\*{0,2}\[(已裁定非债|已解决|已裁定|待用户拍板|待翻新|已退役|待还|不做)/,
  )
  return m ? m[1] : ''
}
/** 状态列里的"一句注"（= 解法 / 裁定摘要），截断显示 */
function statusNote(status, max = 76) {
  const t = normStatus(status).value.replace(/\*\*/g, '')
  const m = t.match(/^\*{0,2}\[([^\]]+)\]/)
  const body = m ? m[1] : t
  const note = body
    .replace(/^(已裁定非债|已解决|已裁定|待用户拍板|待翻新|已退役|待还|不做)\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*/, '')
    .replace(/^[·：:]\s*/, '')
    // 凭证是机器串（长），列表里只留一个记号；解码看 `show` / `reverify`
    .replace(EVIDENCE_BLOB_RE, '凭证✓')
  if (!note) return ''
  return note.length > max ? note.slice(0, max) + '…' : note
}

// ─────────────────────────────────────────────────────────────────────────────
// 结账凭证（evidence）—— 写入口闸与 `reverify` 共用的**同一份**解析 / 校验 / 复算
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 格式（v1，机器可读，写在状态格里）：
 *   机验：evidence:v1{cmd=<只读命令>;claim=<命令输出里必须出现的数字或结论>;fail=<失败现在由谁看到>;
 *                     cplx=<复杂度降在哪>;impl=真实现[：细节]|替身：<替的是什么>[;red=<先红凭证，可选>]}
 *   人工：evidence:v1{kind=人工;by=<担保人>;why=<为什么机器化不了>;claim=…;fail=…;cplx=…;impl=…}
 *
 * 【为什么写进状态格，而不是另开一个 `债务-凭证/` 目录】① `archive` 把完成行**逐字搬进归档**、
 *   `move` 只改 ID 与区名列 ⇒ 凭证自动跟着走，不会因为"搬了行 / 换了号"变成孤儿；
 *   ② 账本外再放一份 = 第二份真相，还得再立一条"搬家时同步"的规矩。
 *
 * 【为什么 `claim` 只认"输出里必须出现"】它就是**别人复算的那一句话**：命令跑出来的输出里
 *   有这串，说明结论成立；没有就是漂移。数字按**独立数字**比对（`3` 不会被 `143` 蒙混过去）。
 */
const EVIDENCE_TAG = 'evidence:v1'
const EVIDENCE_BLOB_RE = /evidence:v1\{[^{}]*\}/
const EVIDENCE_KEYS = ['cmd', 'claim', 'fail', 'cplx', 'impl', 'red']
const EVIDENCE_KEYS_MANUAL = ['kind', 'by', 'why', 'claim', 'fail', 'cplx', 'impl', 'red']
/** 值里禁这些字符：`|` 撑破表格列；`]` 状态格在第一个 `]` 处截断；`{}` 是 blob 边界；`;` 是字段分隔 */
const EVIDENCE_FORBIDDEN = /[|｜\]{}]/
/** 凭证命令必须**只读** —— 它要被反复复算，带写副作用就是"复算会改世界" */
const EVIDENCE_READONLY_DENY = [
  { re: /(?<!\d)>(?!&1)/, why: '重定向 `>`' },
  { re: /\brm\s+-/, why: '`rm -`' },
  { re: /\bmv\s+/, why: '`mv`' },
  { re: /\bsed\s+-i/, why: '`sed -i`' },
  { re: /\bgit\s+(?:checkout|reset|clean|stash|switch)\b/, why: 'git 写操作' },
  { re: /\bnpm\s+publish\b/, why: '`npm publish`' },
]
const EVIDENCE_TIMEOUT_MS = 180_000

/** 从状态格取凭证（`reverify` / `show` 用；`null` = 这条没凭证） */
function parseEvidenceBlob(statusText) {
  const m = String(statusText ?? '').match(EVIDENCE_BLOB_RE)
  if (!m) return null
  const fields = {}
  const bad = []
  for (const seg of m[0].slice(EVIDENCE_TAG.length + 1, -1).split(';')) {
    if (!seg.trim()) continue
    const i = seg.indexOf('=')
    if (i < 0) bad.push(seg.trim())
    else fields[seg.slice(0, i).trim()] = seg.slice(i + 1).trim()
  }
  return { fields, bad, raw: m[0] }
}

function formatEvidence(fields) {
  const order = fields.kind === '人工' ? EVIDENCE_KEYS_MANUAL : EVIDENCE_KEYS
  const parts = order
    .filter((k) => fields[k] !== undefined && fields[k] !== '')
    .map((k) => `${k}=${fields[k]}`)
  return `${EVIDENCE_TAG}{${parts.join(';')}}`
}

/** 拒写时的**可复制填空模板**（没有它，下一个人只会想办法绕过闸） */
function evidenceHelp() {
  return [
    '',
    '   把下面五行填好，作为 `--evidence` 传进来（一行，字段用 `;` 分隔）：',
    '',
    "     cmd=<一条只读命令，别人拿去能跑出同一个结果，如 grep -c 'xxx' src/a.ts>",
    '     claim=<上面这条命令的输出里必须出现的数字或结论，如 3>',
    '     fail=<失败了现在由谁看到：页面内联 / 日志 / 门禁>',
    '     cplx=<复杂度降在哪：重复份数 N→1 / 环节数 / 兜底计数>',
    '     impl=<真实现 | 替身：替的是什么>',
    '',
    '   直接复制填空：',
    '     node scripts/debt.mjs resolve TD-xx-1 --note "…" \\',
    '       --evidence "cmd=…;claim=…;fail=…;cplx=…;impl=真实现"',
    '',
    '   机器化不了（如「删掉了冗余实现」）才走**人工降级**，必须显式标记 + 有名有姓：',
    '     --evidence "kind=人工;by=<你的名字>;why=<为什么这条没法机器化>;claim=…;fail=…;cplx=…;impl=替身：…"',
    '',
    '   ↳ 口径见 `架构师改码7步法` §7.1「一凭证」；存量复算：`node scripts/debt.mjs reverify <ID>`',
  ].join('\n')
}

/**
 * 闸 ①：格式 / 三问齐全 / 命令只读。
 * 返回 `{ blob, fields }`；不合格 → 打印问题 + 模板，**直接 exit 1（不写盘）**。
 */
function requireEvidence(raw) {
  const problems = []
  let text = String(raw ?? '').trim()
  const missing = !text
  if (missing) problems.push('没有 `--evidence`（结账必须有凭证）')
  // 允许整段粘贴（带 `evidence:v1{…}` 外壳时剥掉）
  const wrapped = text.match(EVIDENCE_BLOB_RE)
  if (wrapped) text = wrapped[0].slice(EVIDENCE_TAG.length + 1, -1)

  const fields = {}
  const bad = []
  for (const seg of text.split(';')) {
    if (!seg.trim()) continue
    const i = seg.indexOf('=')
    if (i < 0) bad.push(seg.trim())
    else fields[seg.slice(0, i).trim()] = seg.slice(i + 1).trim()
  }

  const kind = fields.kind || '机验'
  if (kind !== '机验' && kind !== '人工')
    problems.push(`kind=\`${kind}\` 只认「机验」或「人工」（不写 = 机验）`)
  const allowed = kind === '人工' ? EVIDENCE_KEYS_MANUAL : EVIDENCE_KEYS
  for (const k of Object.keys(fields))
    if (!allowed.includes(k)) problems.push(`不认识的键 \`${k}\`（只认 ${allowed.join(' / ')}）`)
  for (const seg of bad) problems.push(`这段不是 \`键=值\`：\`${seg}\``)

  const need =
    kind === '人工' ? ['by', 'why', 'claim', 'fail', 'cplx', 'impl'] : EVIDENCE_KEYS.slice(0, 5)
  // 整个 `--evidence` 都没给时，只报"没有凭证" + 模板（不逐键刷屏）
  if (!missing) for (const k of need) if (!fields[k]) problems.push(`缺 \`${k}=\``)

  for (const [k, v] of Object.entries(fields)) {
    if (EVIDENCE_FORBIDDEN.test(v))
      problems.push(
        `\`${k}\` 的值里有禁用字符（\`|\` 撑破表格列 / \`]\` 截断状态格 / \`{}\` 是凭证边界）`,
      )
  }
  for (const k of ['fail', 'cplx'])
    if (fields[k] && fields[k].length < 4)
      problems.push(`三问的 \`${k}\` 太短（≥4 字）：要给一句人话，不是"无"`)
  if (fields.impl && !/^(?:真实现|替身)/.test(fields.impl))
    problems.push(
      '`impl=` 只认「真实现」或「替身：<替的是什么>」（验证跑的是真实现还是替身，必须说清）',
    )

  if (kind === '人工') {
    if (fields.by && fields.by.length < 2)
      problems.push('`by=` 要有名有姓（≥2 字）—— 人工担保必须能追责')
    if (fields.why && fields.why.length < 8)
      problems.push('`why=` 要写清为什么这条没法机器化（≥8 字）')
    if (fields.cmd)
      problems.push('人工凭证不该带 `cmd=`（有可跑命令就该走机验，别借人工降级走后门）')
  } else if (fields.cmd) {
    for (const d of EVIDENCE_READONLY_DENY)
      if (d.re.test(fields.cmd))
        problems.push(`凭证命令必须是只读命令：命中 ${d.why}（它要被反复复算，不许带写副作用）`)
  }

  if (problems.length) {
    console.error(
      `❌ 结账被拒：**${missing ? '没有凭证' : '凭证不合格'}**（写入口闸，不是警告；没有 --force / 环境变量旁路）`,
    )
    for (const p of problems) console.error('   · ' + p)
    console.error(evidenceHelp())
    process.exit(1)
  }
  const withKind = { ...fields, kind }
  return { blob: formatEvidence(withKind), fields: withKind }
}

function outputTail(s, n = 4) {
  return String(s ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-n)
}

/** 真跑凭证命令（只读；`cwd` = 账本根，别人拿去跑也是同一个结果） */
function runEvidenceCommand(cmd) {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: EVIDENCE_TIMEOUT_MS,
    })
    return { ok: true, exit: 0, output: String(out) }
  } catch (e) {
    const err = e
    return {
      ok: false,
      exit: typeof err.status === 'number' ? err.status : -1,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
      reason: err.signal ? `被 ${err.signal} 结束` : err.code === 'ETIMEDOUT' ? '超时' : '',
    }
  }
}

/** 声称是否成立：数字按**独立数字**比对（`3` 不被 `143` 蒙混），其余按原文子串 */
function claimMatches(output, claim) {
  const text = String(output ?? '')
  const c = String(claim ?? '').trim()
  if (!c) return false
  if (/^\d+(?:\.\d+)?$/.test(c))
    return new RegExp(`(?<![\\d.])${c.replace('.', '\\.')}(?![\\d.])`).test(text)
  return text.includes(c)
}

function numbersIn(output, max = 6) {
  const out = []
  for (const m of String(output ?? '').matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)) {
    if (!out.includes(m[0])) out.push(m[0])
    if (out.length >= max) break
  }
  return out
}

/**
 * 闸 ②③：真跑一遍 + 声称对得上。
 * 跑不动 / 对不上 → **拒写**（账本未写入）。人工担保跳过（没有命令可跑，改由 `by` 追责）。
 */
function verifyClaim(ev) {
  const f = ev.fields
  if (f.kind === '人工') {
    console.log(`⚠️ 人工担保落账：本条**不可机验**，责任在 ${f.by}（${f.why}）`)
    console.log('   ↳ `reverify` 会把它单列在「人工担保」里，不与机验混算')
    return
  }
  const res = runEvidenceCommand(f.cmd)
  if (!res.ok) {
    console.error('❌ 结账被拒：**凭证命令跑不动**（写入口闸，不是警告；账本未写入）')
    console.error(`   命令 : ${f.cmd}`)
    console.error(`   实跑 : exit=${res.exit}${res.reason ? `（${res.reason}）` : ''}`)
    for (const l of outputTail(res.output)) console.error(`   | ${l.slice(0, 160)}`)
    console.error('   ↳ 跑不动的命令等于没凭证：要么修命令，要么换一条能跑出同一个结果的。')
    process.exit(1)
  }
  if (!claimMatches(res.output, f.claim)) {
    const nums = numbersIn(res.output)
    console.error('❌ 结账被拒：**凭证声称对不上**（写入口闸，不是警告；账本未写入）')
    console.error(`   命令 : ${f.cmd}`)
    console.error(`   声称 : ${f.claim}`)
    console.error(
      `   实跑 : exit=0，输出里没有「${f.claim}」${nums.length ? `；输出里的数字：${nums.join(' / ')}` : ''}`,
    )
    for (const l of outputTail(res.output)) console.error(`   | ${l.slice(0, 160)}`)
    console.error('   ↳ 凭证要能被**别人拿去复算**：改声称或改命令，不许写成"大概 / 约"。')
    process.exit(1)
  }
  console.log(`✅ 凭证已复算：\`${f.cmd}\` → 命中「${f.claim}」`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 读取（主表 + 归档）
// ─────────────────────────────────────────────────────────────────────────────
function parseText(text, src) {
  const rows = []
  text.split(/\r?\n/).forEach((line, li) => {
    const r = readRow(line)
    if (r && !r.broken) rows.push({ li, line, src, ...r })
  })
  return rows
}
/** 主表（可写） */
function loadLedger() {
  const text = readFileSync(LEDGER, 'utf8')
  return { text, lines: text.split(/\r?\n/), rows: parseText(text, 'main') }
}
/**
 * 主表 ∪ 归档 ∪ **全文归档**（同 ID 优先级：主表 > 活归档 > 全文归档）。读命令一律用它。
 *
 * 【为什么必须并入"全文归档"（2026-09-16 · A10 工具债当场修）】
 *   `债务-全文归档-<date>.md` 是**账本压缩前的完整快照**（压缩时把长叙述截断，原文只留在这里）。
 *   旧实现只读 `债务-归档.md` ⇒ **只存在于全文归档里的债号被判成"不存在"** ⇒ 任何"债号有效性"
 *   判定都会误报。实证（TD-24-1/2）：`TD-02-19`（八轮新立）与 `TD-12-2`（已裁定）都被 `show`
 *   报「主表与归档中均无」，而 `src/` 注释引用它们**完全正确** —— 于是"**工具读不全**"被误登记成
 *   "两处注释漂移"（2 条假债）。修法 = 并入全文归档（**只增有效集合，不改优先级**）。
 *   ⚠️ 该口径同时是 `add` 取号的依据 ⇒ 修完后再也不会因"只查一部分"而撞已归档 ID。
 */
function loadAll() {
  const main = readFileSync(LEDGER, 'utf8')
  const arch = existsSync(ARCHIVE) ? readFileSync(ARCHIVE, 'utf8') : ''
  const fullArchives = readdirSync(LOG_DIR)
    .filter((n) => /^债务-全文归档-.*\.md$/.test(n))
    .sort() // 多个全文归档时按文件名（含日期）升序：旧的先入 ⇒ `!has` 保证旧的不覆盖新的
    .map((n) => readFileSync(join(LOG_DIR, n), 'utf8'))
  const byId = new Map()
  // src: main（活表）> archive（活归档，行规范化）> full（全文归档，**压缩前快照**）。
  // ⚠️ `full` 的行可能含**裸 `|`**（当年写入时未转义，如 `source:'kv' | 'local'`）⇒ 列会错位
  // ⇒ 它**只用于"债号存在性 + add 取号"**；`list` / `search` / `show` 的**字段输出**一律忽略它
  // （`show` 见到 full 行只报"存在 + 原文去处"，不展示可能错位的字段）。
  for (const r of [
    ...parseText(main, 'main'),
    ...parseText(arch, 'archive'),
    ...fullArchives.flatMap((t) => parseText(t, 'full')),
  ]) {
    if (!byId.has(r.fields.id)) byId.set(r.fields.id, r)
  }
  return [...byId.values()]
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * stats —— 只读：把「债的形态 / 解法分布」变成一条**随时可重算**的命令。
 *
 * 【为什么做成命令，而不是把数字写死在 SOP 文档里】写死的数字**必然过期** ——
 *   本仓最高频母体恰恰就是 M4「描述层无对账」（276 条债里 41 条是这类）。
 *   形态的**语义**（检出信号）维护在两份 SOP：`债务登记5步法.md` §3.4 / `架构师改码7步法.md` 附 B；
 *   本命令只负责**现算一遍**，两边口径靠同一份关键词表对齐。
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SHAPES = [
  ['注释/文档漂移', /注释|漂移|过期|失真|失实/],
  ['静默吞/失败伪装成功', /静默|伪装|吞/],
  ['死代码/幽灵预留', /死代码|死参数|零消费|零引用|幽灵|预留|预支/],
  ['绕过唯一入口', /绕过|旁路|裸调|裸写|直调/],
  ['SSOT 第二份', /第二份|第二真相|SSOT|双源|同语义两|两份/],
  ['口径错位', /口径|不一致|对不上|错位/],
  ['假护栏/假守卫', /假护栏|假守卫|假豁免|恒真|恒绿|恒空/],
  ['复发/回潮', /复发|回潮|再犯/],
]
const FIXES = [
  ['收口到唯一实现', /收口|唯一实现|下沉|委托|单点|单源/],
  ['探针先红后绿', /探针|先红后绿/],
  ['契约钉死', /契约|唯一真相|钉死|判别联合/],
  ['删除', /已删|删除|删掉|删死/],
  ['加机器闸', /加闸|补闸|机器守卫|新增规则|闸/],
  ['改判非债', /改判非债|非债|已裁定/],
  ['用户裁定', /用户裁定|待用户拍板/],
]

function cmdStats() {
  const rows = loadAll()
  const hit = (re) => rows.filter((r) => re.test(r.line)).length
  const cls = (w) =>
    rows.filter((r) => new RegExp('\\|\\s*\\**' + w + '\\s*\\**\\|').test(r.line)).length
  console.log(`📊 债务形态统计（主表 ∪ 归档，共 ${rows.length} 条）`)
  console.log(`   归类：还债 ${cls('还债')} · 持平 ${cls('持平')} · 增债 ${cls('增债')}`)
  console.log(
    `   状态：已解决 ${hit(/已解决/)} · 改判非债 ${hit(/非债|已裁定/)} · 待还 ${hit(/待还/)}`,
  )
  console.log('\n【问题形态】按频次降序 —— 高频的先用 grep 扫（检出信号见 债务登记5步法 §3.4）')
  for (const [name, re] of SHAPES.slice().sort((a, b) => hit(b[1]) - hit(a[1]))) {
    console.log(`   ${String(hit(re)).padStart(4)}  ${name}`)
  }
  console.log('\n【解法分布】按频次降序 —— 排前的是本仓真正管用的手法（见 架构师改码7步法 附 B）')
  for (const [name, re] of FIXES.slice().sort((a, b) => hit(b[1]) - hit(a[1]))) {
    console.log(`   ${String(hit(re)).padStart(4)}  ${name}`)
  }
}
const idNum = (id) => Number((id.match(/^TD-(\d+)-/) ?? [])[1] ?? -1)
const idSeq = (id) => Number((id.match(/^TD-\d+-(\d+)/) ?? [])[1] ?? 0)
const idKey = (id) => idNum(id) * 1000 + idSeq(id)
const SRC_TAG = (r) => (r.src === 'archive' ? '（归档）' : '')

// ─────────────────────────────────────────────────────────────────────────────
// 读命令
// ─────────────────────────────────────────────────────────────────────────────
function cmdList(argv) {
  const area = argVal(argv, '--area'),
    status = argVal(argv, '--status'),
    cls = argVal(argv, '--class'),
    rate = argVal(argv, '--rate')
  const json = argv.includes('--json'),
    all = argv.includes('--all'),
    archived = argv.includes('--archived')
  // 排除 src==='full'（全文归档快照）：它的行可能列错位，只用于存在性/取号，不参与列表输出
  const rows = loadAll().filter((r) => r.fields.kind === 'TD' && r.src !== 'full')
  const filtered = !!(area || status || cls || rate || all || archived)
  let sel = rows
  if (archived) sel = sel.filter((r) => r.src === 'archive')
  else if (!filtered)
    sel = sel.filter((r) => r.src === 'main' && TODO_WORDS.includes(statusWord(r.fields.status)))
  if (area) sel = sel.filter((r) => idNum(r.fields.id) === Number(area))
  if (status) sel = sel.filter((r) => statusWord(r.fields.status) === status)
  if (cls) sel = sel.filter((r) => normClass(r.fields.class).value === cls)
  if (rate) sel = sel.filter((r) => normRate(r.fields.rate).value === rate)
  sel.sort((a, b) => idKey(a.fields.id) - idKey(b.fields.id))

  if (json) {
    console.log(
      JSON.stringify(
        sel.map((r) => ({ ...r.fields, src: r.src, line: r.li + 1 })),
        null,
        2,
      ),
    )
    return
  }
  const scope = !filtered ? '主表待办' : archived ? '仅归档' : '主表 + 归档'
  console.log(
    `🔎 debt list ｜ ${scope} ｜ 命中 ${sel.length} 条（全档 ${loadAll().filter((r) => r.fields.kind === 'TD').length} · 主表 ${loadMainCount()}）`,
  )
  if (!sel.length) {
    console.log('   （无匹配记录）')
    return
  }
  for (const r of sel) printRow(r)
  if (!filtered)
    console.log(
      '   ↳ 查历史债加 `--all` / `--area <NN>` / `search <关键词>`（历史在 `债务-归档.md`，本命令已打通）',
    )
  console.log(ADR_NUDGE)
}
const loadMainCount = () => loadLedger().rows.filter((r) => r.fields.kind === 'TD').length

function cmdArea(argv) {
  const nn = argv.find((a) => !a.startsWith('--'))
  if (!nn) fail('用法：node scripts/debt.mjs area <NN>（如 area 22）')
  cmdList(['--area', nn, '--all'])
}

function cmdSearch(argv) {
  const kw = argv[0] && !argv[0].startsWith('--') ? argv[0] : argVal(argv, '--q')
  if (!kw)
    fail(
      '用法：node scripts/debt.mjs search <关键词> [--area 22]（多词 = AND；精确无命中时自动同义词扩展）',
    )
  const area = argVal(argv, '--area')
  const words = kw.split(/\s+/).filter(Boolean)
  // 同上：排除全文归档快照行（列可能错位），避免检索命中垃圾字段
  let pool = loadAll().filter((r) => r.fields.kind === 'TD' && r.src !== 'full')
  if (area) pool = pool.filter((r) => idNum(r.fields.id) === Number(area))
  const hay = (r) => `${r.fields.id} ${r.fields.area} ${r.fields.summary} ${r.fields.status}`
  let syn = false
  let sel = pool.filter((r) => words.every((w) => hay(r).includes(w)))
  if (!sel.length) {
    syn = true
    sel = pool.filter((r) =>
      words.every((w) => expandWord(w).some((v) => hay(r).toLowerCase().includes(v.toLowerCase()))),
    )
  }
  sel.sort((a, b) => idKey(a.fields.id) - idKey(b.fields.id))
  const inMain = sel.filter((r) => r.src === 'main').length
  const ext = syn
    ? words
        .map((w) => {
          const e = expandWord(w).filter((x) => x !== w)
          return e.length ? `${w}〔≈ ${e.join(' / ')}〕` : w
        })
        .join(' + ')
    : words.join(' + ')
  console.log(
    `🔎 debt search「${ext}」${area ? ` in 区 ${area}` : ''}${syn ? '［同义词扩展］' : ''} ｜ 命中 ${sel.length} 条（主表 ${inMain} · 归档 ${sel.length - inMain}）`,
  )
  if (!sel.length) {
    console.log(
      '   （无匹配）换个词试试：母体名（SSOT / 静默 / 假收窄 / 死代码 / 唯一入口 / 兜底 / 假成功 / 注释漂移）、',
    )
    console.log('   症状（刷新 / 破图 / 丢输入 / 残留 / 回弹）、或文件名片段。')
    console.log('   兜底办法：`node scripts/debt.mjs area <NN>` 直接列该区全部历史债。')
    return
  }
  for (const r of sel) printRow(r)
  console.log(
    '   ↳ 某条的**完整解法（含被压缩掉的长决策）+ 证据入口**：`node scripts/debt.mjs show <TD-ID>`',
  )
}

function printRow(r) {
  const f = r.fields
  const note = statusNote(f.status)
  const sum = f.summary.length > 84 ? f.summary.slice(0, 84) + '…' : f.summary
  console.log(
    `${f.id} ｜ ${f.area} ｜ [${statusWord(f.status) || '?'}]${SRC_TAG(r)} ${note ? '· ' + note : ''}`,
  )
  console.log(`        ${normClass(f.class).value} / ${normRate(f.rate).value} ｜ ${sum}`)
}

function cmdShow(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  if (!id) fail('用法：node scripts/debt.mjs show <TD-ID>')
  const hit = loadAll().filter((r) => r.fields.id === id)
  if (!hit.length) fail(`主表 ∪ 归档 ∪ 全文归档 中均无 ${id}`)
  for (const r of hit) {
    // 【2026-09-16】只存于「全文归档」（压缩前快照）的债号：该行可能含裸 `|` 导致列错位
    // ⇒ 只报"它存在 + 原文去处"，不展示可能错位的字段（字段级真相以主表/活归档为准）。
    if (r.src === 'full') {
      console.log(`── ${id}（仅存于「全文归档」：账本压缩前的长叙述原文，无规范化行）`)
      console.log('   ↳ 原文：daily/架构日志/债务-全文归档-*.md（搜该 ID）')
      continue
    }
    const f = r.fields
    const warn = ['A', 'B', 'C'].includes(r.mode)
      ? ` · 列错位已自动解析（${r.mode}）`
      : r.mode === 'manual'
        ? ' · ⚠️ 列错位需人工'
        : ''
    console.log(`── ${f.id}${SRC_TAG(r)}${warn}`)
    const statusTail = f.status.replace(/^\*{0,2}\[[^\]]*\]/, '').replace(EVIDENCE_BLOB_RE, '')
    console.log(`  状态   : [${statusWord(f.status)}]${statusTail}`)
    console.log(
      `  归类   : ${normClass(f.class).value}   利息率 : ${normRate(f.rate).value}   区域 : ${f.area ?? ''}`,
    )
    console.log(`  现象   : ${f.summary}`)
    // 凭证（TD-09-37）：状态格里的机器串在这里解码给人看；复算 = `reverify <ID>`
    const ev = parseEvidenceBlob(f.status)
    if (ev) {
      console.log(
        `  凭证   : ${ev.fields.kind === '人工' ? `人工担保（by ${ev.fields.by}）` : '机验（可复算）'}`,
      )
      for (const [k, v] of Object.entries(ev.fields))
        if (k !== 'kind') console.log(`           ${k.padEnd(5)} = ${v}`)
      console.log(`           ↳ 复算：node scripts/debt.mjs reverify ${f.id}`)
    }
    // 完整解法：从"全文归档"取该 ID 的原始行（账本压缩时丢掉的长决策都在那儿）
    const full = readFullArchive(id)
    const note = full?.fields.status ?? f.status
    if (note) console.log(`  解法   : ${note}`)
    if (full?.fields.summary && full.fields.summary !== f.summary)
      console.log(`  现象·详: ${full.fields.summary}`)
    console.log(
      `  入口   : daily/架构日志/${f.anchor.replace(/^\**\[([^\]]+)\]\([^)]*\).*$/, '$1')}${isAnchorish(f.anchor) ? '' : '（锚点非标准形状，见原文）'}`,
    )
    if (f.anchor && isAnchorish(f.anchor))
      console.log(
        `           ↳ **下一跳**：该区域日志的「探债」段有最完整的决策、探针与证据（搜 \`${id}\`）`,
      )
    if (full)
      console.log(
        `           ↳ 长叙述原文：daily/架构日志/债务-全文归档-2026-09-14.md（搜 \`${id}\`）`,
      )
  }
}
/** 从"债务-全文归档-*.md"取某 ID 的原始行（完整长叙述/解法） */
function readFullArchive(id) {
  const f = readdirSync(LOG_DIR).find((n) => /^债务-全文归档-.*\.md$/.test(n))
  if (!f) return null
  const raw = readFileSync(join(LOG_DIR, f), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.includes(`| ${id} |`) || l.includes(`**${id}**`))
  if (!raw) return null
  const r = readRow(raw)
  return r && !r.broken ? r : null
}

// ─────────────────────────────────────────────────────────────────────────────
// 写命令（唯一写入者）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 锚点合法性的**唯一判据** —— 写入前校验（`add`/`reanchor`）与只读巡检（`audit`）**共用同一份**。
 *
 * 【为什么必须收窄】见文件头【锚点口径】。判据三条，缺一不可：
 *  ① 不含路径分隔符（`/` `\`）—— 这一条就堵死 `../docs/…` 逃逸；
 *  ② 命名是区域日志 `<NN>-…-<日期>.md`（排除 `债务.md` / `index.md` / `_template.md`）；
 *  ③ 文件真的存在（防手抄错名）。
 * 返回 `''` = 合法；否则返回**人话原因**（供 `add`/`reanchor` 直接报错、`audit` 直接列出）。
 */
const REGION_ANCHOR_RE = /^\d{2}-[^/\\|]+\.md$/
function anchorProblem(anchor) {
  const a = String(anchor ?? '').trim()
  if (!a || a === '—') return '锚点为空（明细必须落区域日志，禁 `—`）'
  if (/[/\\]/.test(a)) return `锚点含路径分隔符（只准写 \`daily/架构日志/\` 下的文件名）：\`${a}\``
  if (!REGION_ANCHOR_RE.test(a))
    return `锚点不是区域日志命名（\`<NN>-<区域>-<日期>.md\`）：\`${a}\``
  if (!existsSync(join(LOG_DIR, a))) return `锚点文件不存在：daily/架构日志/${a}`
  return ''
}

function validate({ cls, rate, owner, summary, anchor }) {
  const errs = []
  if (!CLASSES.includes(cls)) errs.push(`归类 \`${cls}\` 不在白名单 [${CLASSES.join(' / ')}]`)
  if (rate && !RATES.includes(rate))
    errs.push(`利息率 \`${rate}\` 不在白名单 [${RATES.join(' / ')}]`)
  if (owner && !OWNERS.includes(owner))
    errs.push(`归属 \`${owner}\` 不在白名单 [${OWNERS.join(' / ')}]`)
  if (!summary) errs.push('摘要为空')
  if (/[|｜]/.test(summary || ''))
    errs.push('摘要含竖线 → 用「／」代替（裸 `|` 会撑破表格列，本仓已有 14 行因此错位）')
  if (summary && summary.length > 120)
    errs.push(`摘要 ${summary.length} 字 > 120（一行一债，长叙述写区域文件）`)
  if (anchor) {
    const p = anchorProblem(anchor)
    if (p) errs.push(p)
  }
  if (errs.length) {
    console.error('❌ 登记被拒（写入口校验，**不是闸**）：')
    for (const e of errs) console.error('   · ' + e)
    process.exit(1)
  }
}

function cmdAdd(argv) {
  const area = argVal(argv, '--area'),
    summary = argVal(argv, '--summary')
  const cls = argVal(argv, '--class') || '增债',
    rate = argVal(argv, '--rate') || '中',
    owner = argVal(argv, '--owner') || '结构债'
  const anchor = argVal(argv, '--anchor') || '',
    refs = argVal(argv, '--refs') || '',
    status = argVal(argv, '--status') || '待还'
  if (!area || !summary)
    fail('用法：add --area 22 --summary "…" [--class 增债] [--rate 中] [--anchor <区域文件>]')
  validate({ cls, rate, owner, summary, anchor })
  const { text } = loadLedger() // 只为拿"可写主表"原文；**取号 / 区域名不吃它**
  const nn = String(area)
  // 取号 + 区域名口径 = 主表 ∪ 归档（与 list/area/search/show 同源）。旧实现只查主表，
  // 某区历史债全部 archive 后 maxN 归零 → 必撞已归档 ID（详见文件头【取号口径】）。
  const allTd = loadAll().filter((r) => r.fields.kind === 'TD')
  const same = allTd.filter((r) => r.fields.id.match(/^TD-(\d+)-/)?.[1] === nn)
  if (same.some((r) => r.src === 'main' && r.mode === 'manual'))
    fail('本区主表存在"列错位需人工"的行 → 先修，否则新 ID 可能撞号')
  const maxN = same.reduce((mx, r) => Math.max(mx, idSeq(r.fields.id)), 0)
  const id = `TD-${nn}-${maxN + 1}`
  // 取号自检（fail-loud）：撞号即拒写，防"归档新增行 / 手工残留"再破口径
  const dup = allTd.find((r) => r.fields.id === id)
  if (dup)
    fail(
      `取号自检失败：${id} 已存在于${dup.src === 'archive' ? '归档' : '主表'} → 拒写（撞号会被 loadAll 静默遮蔽）`,
    )
  // 区域名：优先主表既有写法（"活的"），退化取归档写法，并剥"（@见 …）"跨区后缀（新债跨区引用各自标）
  const areaRaw = (same.find((r) => r.src === 'main') ?? same[0])?.fields.area ?? ''
  const areaText = areaRaw.replace(/（@见[^）]*）/g, '').trim() || `${nn}`
  const anchorText = anchor ? `[${anchor}](./${anchor})` : '—'
  const row = `| ${id} | ${areaText}${refs ? `（${refs}）` : ''} | ${summary} | ${cls} | ${rate} | [${status}] | ${anchorText} |`
  writeFileSync(LEDGER, text.replace(/\s*$/, '') + '\n' + row + '\n')
  console.log(`✅ 已登记 ${id}（${cls} · ${rate} · ${status}）`)
  console.log('   ' + row)
}

function cmdResolve(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  if (!id)
    fail(
      '用法：resolve <TD-ID> --evidence "cmd=…;claim=…;fail=…;cplx=…;impl=…" [--status 已解决] [--note "…"] [--date YYYY-MM-DD]',
    )
  const status = argVal(argv, '--status') || '已解决'
  if (!STATUS_WORDS.includes(status))
    fail(`状态 \`${status}\` 不在白名单 [${STATUS_WORDS.join(' / ')}]`)
  const note = argVal(argv, '--note') || '',
    date = argVal(argv, '--date') || today()
  // 【2026-09-16 · A10 当场修】`note` 会整段写进**状态列**，裸管道符会撑破表格列
  // ⇒ 本仓已有若干行因此错位（`debt.mjs audit` 的「状态含裸 |」项即其残骸）。
  // 与 `validate` 拦 summary 同口径：**在写入口拦掉**（`validate` 只管 add，resolve 此前无人管）。
  if (/[|｜]/.test(note)) {
    fail('note 含竖线 → 用「／」代替（裸管道符会撑破表格列，本仓已有数行因此错位）')
  }
  // 状态格在第一个 `]` 处截断（`statusNote` / `normStatus` 都这么读）⇒ `]` `{` `}` 会把凭证与显示一起毁掉
  if (/[\]{}]/.test(note)) {
    fail(
      'note 含 `]` / `{` / `}` → 状态格在第一个 `]` 处截断，这几个字符会毁掉凭证与显示；改用「」',
    )
  }
  // ── 结账闸（TD-09-37）：① 凭证合格 → ② 真跑 → ③ 声称对得上，缺一即拒写 ──
  const evidence = requireEvidence(argVal(argv, '--evidence'))
  verifyClaim(evidence)

  // ── 目标 = 主表优先，**归档也允许改**（2026-09-14）──
  // 【为什么】`archive` 之后才发现状态文案要修（实证：note 被 PowerShell 的 ASCII 双引号截断）时，
  //   旧实现**直接硬失败且没有替代路径** ⇒ 人只能手改表格行 = 破「唯一写入者」这条红线。
  //   归档只是「主表只留待办」的取舍，**不是「不可改」**（成本守恒：合法通过成本必须 ≤ 绕行成本）。
  const main = loadLedger()
  const targets = [{ file: LEDGER, label: '主表', lines: main.lines, rows: main.rows }]
  if (existsSync(ARCHIVE)) {
    const archText = readFileSync(ARCHIVE, 'utf8')
    targets.push({
      file: ARCHIVE,
      label: '归档',
      lines: archText.split(/\r?\n/),
      rows: parseText(archText, 'archive'),
    })
  }
  for (const t of targets) {
    const hit = t.rows.filter((r) => r && !r.broken && r.fields && r.fields.id === id)
    if (!hit.length) continue
    if (hit.length > 1) fail(`${id} 在${t.label}出现 ${hit.length} 次（重复 ID）→ 先处理重复`)
    const r = hit[0]
    if (r.mode === 'manual') fail(`${id} 在${t.label}是「列错位需人工」行 → 先修列，再改状态`)
    const C = MAP[r.kind]
    const parts = t.lines[r.li].split('|')
    // 已登记的 `原记「…」` **默认逐字保留**（重结账 ≠ 销毁历史；要丢必须 --drop-original）
    const orig = originalMarker(String(parts[1 + C.status] || ''))
    const dropOriginal = argv.includes('--drop-original')
    if (orig && dropOriginal)
      console.log(
        `⚠️ 按 --drop-original 丢掉原文：${(orig.match(/原记「([\s\S]*)」/) ?? [])[1] ?? ''}`,
      )
    const newStatus = `[${status} ${date}${note ? ' · ' + note : ''} · ${evidence.blob}${
      orig && !dropOriginal ? ' · ' + orig : ''
    }]`
    parts[1 + C.status] = ` ${newStatus} `
    t.lines[r.li] = parts.join('|')
    writeFileSync(t.file, t.lines.join('\n'))
    console.log(`✅ ${id} → ${newStatus}`)
    console.log(`   旧状态：${r.fields.status}`)
    if (t.label === '主表')
      console.log(
        '   ↳ 收尾别忘了 `node scripts/debt.mjs archive`（把已完成项移入归档，主表只留待办）',
      )
    else console.log('   ↳ 改的是**归档**行（主表已无此 ID）；若只是修状态文案，无需再 `archive`')
    return
  }
  fail(`主表与归档中均无 ${id}`)
}

/**
 * reanchor —— 改某条债的**锚点**（明细真源搬家 / 修陈旧锚点）。
 *
 * 【为什么需要它】债 ID 永久绑区域（§七.3），但区域日志**按日期分片** —— 同一区每次新审计写新文件，
 * 于是"明细搬家"是**必然事件**，而本仓红线是**禁手写表格行**（写入者唯一 = 本脚本）。
 * 没有这个命令时，唯一的出路就是手改 `债务-归档.md`（= 自己破自己的红线）。
 * 实证：2026-09-14 六条债（TD-22-7~12）因缺此命令而被锚在 `docs/132`（TD-22-17）。
 *
 * 【纪律】与 `resolve` 同款：**就地替换锚点列**，不新增行；可改主表**或**归档里的行（自动找）。
 *  用法：reanchor <TD-ID> --anchor 22-视频-剪辑器-M2计划审计-2026-09-14.md
 */
function cmdReanchor(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  const anchor = argVal(argv, '--anchor')
  if (!id || !anchor)
    fail('用法：reanchor <TD-ID> --anchor <区域文件>（如 22-视频-剪辑器-M2计划审计-2026-09-14.md）')
  const problem = anchorProblem(anchor)
  if (problem) fail(`锚点被拒（写入口校验，**不是闸**）：\n   · ${problem}`)
  const files = [{ file: LEDGER, src: '主表', lines: loadLedger().lines }]
  if (existsSync(ARCHIVE))
    files.push({ file: ARCHIVE, src: '归档', lines: readFileSync(ARCHIVE, 'utf8').split(/\r?\n/) })
  for (const f of files) {
    const hits = f.lines
      .map((l, i) => [readRow(l), i])
      .filter(([r]) => r && !r.broken && r.fields && r.fields.id === id)
    if (!hits.length) continue
    const hit = hits.find(([r]) => r.mode !== 'manual')
    if (!hit) fail(`${id} 在${f.src}是「列错位需人工」行 → 先修列，再改锚点`)
    const [r, li] = hit
    const C = MAP[r.kind]
    const parts = f.lines[li].split('|')
    const old = r.fields.anchor
    parts[1 + C.anchor] = ` [${anchor}](./${anchor}) `
    f.lines[li] = parts.join('|')
    writeFileSync(f.file, f.lines.join('\n'))
    console.log(`✅ ${id} 锚点已改（${f.src}）`)
    console.log(`   旧：${old}`)
    console.log(`   新：[${anchor}](./${anchor})`)
    console.log('   ↳ 别忘了在新锚点文件的「探债」段补该债的明细（叙述不进账本）')
    return
  }
  fail(`主表与归档中均无 ${id}`)
}

/**
 * edit —— 就地回改某条债的**现象 / 解法**文本（TD-17-33）。
 *
 * 【为什么需要它】**描述过期是常态**（实证 2026-09-20 一轮撞到 3 次：TD-23-5 记「252 文件」实测 16 项 ·
 *   TD-07-9 记的处数 · TD-25-32 的「4 处」）。此前**没有**就地改的路，只能二选一，且两条都不可接受：
 *   ① 手改表格行 = 破「唯一写入者」红线；② `resolve --note` = 把债**误标成已解决**（A8 状态不许预支）。
 *   ⇒ 补本命令，让「改描述」有**正当路径**。
 *
 * 【语义】`edit <TD-ID> --field summary|solution|classify|rate --value "…"`
 *   · `summary`  = 现象列（整格替换）
 *   · `solution` = 解法文本（寄居在状态格：`· ` 之后的文本；**状态词与日期原样保留**）
 *   · `classify` = 归类列（整格替换；值必须是 `CLASSES` 里的规范词）
 *   · `rate`     = 利息率列（整格替换；值必须是 `RATES` 里的规范词；MD 行无此列）
 * 【明确不改】ID / 区 / 状态词 / 锚点 —— 各有其命令：`move` / `resolve` / `reanchor`。
 *
 * 【为什么补 classify / rate（2026-09-21 · 工具债）】`audit` 把「归类非规范」「利息率非规范」
 *   算进 `AUTO_KINDS`，小结里报「**可归一/修复** N 项」；但此前这两列**没有任何写入口**
 *   ⇒ 报得出、改不了 = **假指引**（用户照着小结走会发现无路可走，只能手改表格 = 破"唯一写入者"红线）。
 *   补入口让小结的声明成真。**枚举列只收规范值**：别名/流转写法（如 `增债→已还`）请自行取箭头前的值 ——
 *   写入口不替调用方归一（归一是 `normClass` 的职责，在此再做一份 = 第二份真相）。
 */
function cmdEdit(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  const field = argVal(argv, '--field')
  const value = argVal(argv, '--value')
  if (!id || !field || !value)
    fail('用法：edit <TD-ID> --field summary|solution|classify|rate --value "…"')
  const EDIT_FIELDS = { summary: '现象', solution: '解法', classify: '归类', rate: '利息率' }
  if (!has(EDIT_FIELDS, field)) {
    fail(
      '--field 只支持 `summary`（现象）／`solution`（解法）／`classify`（归类）／`rate`（利息率）；ID/区/状态/锚点请用 move / resolve / reanchor',
    )
  }
  // 枚举列只收规范值（防写入口自己长出一份归一逻辑 —— 归一归 `normClass`/`normRate`）
  if (field === 'classify' && !CLASSES.includes(value)) {
    fail(
      `归类 \`${value}\` 不在白名单 [${CLASSES.join(' / ')}]（带「→ 状态流转」的旧写法请填箭头前的那个值）`,
    )
  }
  if (field === 'rate' && !RATES.includes(value)) {
    fail(`利息率 \`${value}\` 不在白名单 [${RATES.join(' / ')}]`)
  }
  // 与 add / resolve 同口径：裸管道符会撑破表格列（本仓已有数行因此错位）
  if (/[|｜]/.test(value)) fail('value 含竖线 → 用「／」代替（裸管道符会撑破表格列）')
  if (field === 'summary' && value.length > 120) {
    fail(`现象 ${value.length} 字 > 120（一行一债，长叙述写区域文件）`)
  }

  const files = [{ file: LEDGER, src: '主表', lines: loadLedger().lines }]
  if (existsSync(ARCHIVE))
    files.push({ file: ARCHIVE, src: '归档', lines: readFileSync(ARCHIVE, 'utf8').split(/\r?\n/) })
  for (const f of files) {
    const hits = f.lines
      .map((l, i) => [readRow(l), i])
      .filter(([r]) => r && !r.broken && r.fields && r.fields.id === id)
    if (!hits.length) continue
    const hit = hits.find(([r]) => r.mode !== 'manual')
    if (!hit) fail(`${id} 在${f.src}是「列错位需人工」行 → 先修列，再改文本`)
    const [r, li] = hit
    const C = MAP[r.kind]
    if (field === 'rate' && C.rate === undefined) fail(`${id} 是 ${r.kind} 行，没有利息率列`)
    const parts = f.lines[li].split('|')
    const old =
      field === 'summary'
        ? r.fields.summary
        : field === 'classify'
          ? r.fields.class
          : field === 'rate'
            ? r.fields.rate
            : String(r.fields.status || '')
    if (field === 'summary') {
      parts[1 + C.summary] = ` ${value} `
    } else if (field === 'classify') {
      parts[1 + C.class] = ` ${value} `
    } else if (field === 'rate') {
      parts[1 + C.rate] = ` ${value} `
    } else {
      // 解法寄居在状态格：**只替换解法那一段**，状态词 + 日期 + 凭证 + `原记` 全部原样
      const cell = String(parts[1 + C.status] || '')
      const m = cell.match(/^\s*\[\s*([^\]·]*)/)
      const head = m ? m[1].trim() : ''
      // 已登记的凭证与 `原记「…」`**不跟着解法一起被冲掉**（改描述 ≠ 重结账，更 ≠ 销毁历史）
      const tail = settlementTail(cell)
      const dropOriginal = argv.includes('--drop-original')
      const conflict = tail && !dropOriginal ? editConflict(value, tail) : ''
      if (conflict) {
        console.error('❌ edit 被拒：新解法与已登记的 `原记「…」` 冲突（不猜，也不顺手销毁历史）')
        console.error('   · ' + conflict)
        console.error(`   · 现有尾巴：${tail.length > 120 ? tail.slice(0, 120) + '…' : tail}`)
        console.error('')
        console.error('   ↳ 确认要销毁原文就显式加 `--drop-original`（会打印被丢掉的原文）；')
        console.error('     否则改说法，让新旧能共存。')
        process.exit(1)
      }
      if (dropOriginal && /原记「/.test(tail))
        console.log(
          `⚠️ 按 --drop-original 丢掉原文：${
            (tail.match(/原记「([\s\S]*)」\s*$/) ?? [])[1]?.slice(0, 200) ?? ''
          }`,
        )
      parts[1 + C.status] = ` [${head} · ${value}${tail && !dropOriginal ? ' · ' + tail : ''}] `
    }
    f.lines[li] = parts.join('|')
    writeFileSync(f.file, f.lines.join('\n'))
    console.log(`✅ ${id} 的${EDIT_FIELDS[field]}已改（${f.src}）`)
    console.log(`   旧：${old}`)
    console.log(`   新：${value}`)
    return
  }
  fail(`主表与归档中均无 ${id}`)
}

/**
 * move —— 把某条债**整体迁往另一区**（改 ID 区段 + 区名列，其余字段逐字保留）。
 *
 * 【为什么需要它】债 ID 永久绑区域（§七.3），但「登记时选错区」是真实会发生的
 * （实证 2026-09-15：M7 四条债误登 23 区〔仓库卫生〕，明细真源属 02 区〔存储/持久化〕）。
 * `reanchor` 只改锚点、不改 ID——补不了这个缺口；没有本命令时唯一出路是手改表格行
 * = 破「唯一写入者」红线（本仓已有 TD-23-6~9 四条因此悬在错误区域）。
 *
 * 【语义】`move <TD-ID> --to <NN>`：
 *   · 新 ID = `TD-<NN>-<区内 max+1>`（取号 / 撞号自检与 `add` **同一口径** = 主表 ∪ 归档）；
 *   · 区名列取目标区既有写法（主表优先、退化归档、剥「（@见 …）」后缀，与 `add` 同源）；
 *   · 锚点 / 状态 / 归类 / 利率 / 摘要 **逐字保留**；**就地替换该行**（不新增行、不改行位置）；
 *   · 主表与归档都可迁（归档迁出后仍在归档——`archive` 语义不受影响）。
 */
function cmdMove(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  const to = argVal(argv, '--to')
  if (!id || !to) fail('用法：move <TD-ID> --to <NN>（如 move TD-23-6 --to 02）')
  if (!/^\d{2}$/.test(to)) fail(`目标区号非法：\`${to}\`（两位数字，如 02）`)
  const files = [{ file: LEDGER, src: '主表', lines: loadLedger().lines }]
  if (existsSync(ARCHIVE))
    files.push({ file: ARCHIVE, src: '归档', lines: readFileSync(ARCHIVE, 'utf8').split(/\r?\n/) })
  for (const f of files) {
    const hits = f.lines
      .map((l, i) => [readRow(l), i])
      .filter(([r]) => r && !r.broken && r.fields && r.fields.id === id)
    if (!hits.length) continue
    const hit = hits.find(([r]) => r.mode !== 'manual')
    if (!hit) fail(`${id} 在${f.src}是「列错位需人工」行 → 先修列，再迁移`)
    const [r, li] = hit
    if (r.fields.kind !== 'TD') fail(`${id} 不是 TD 行 → move 仅支持 TD`)
    if (idNum(r.fields.id) === Number(to)) fail(`${id} 已在区 ${to}，无需迁移`)
    // 取号 + 区域名：与 cmdAdd 逐字同口径（主表 ∪ 归档；主表有「列错位需人工」行即拒，防撞号）
    const allTd = loadAll().filter((x) => x.fields.kind === 'TD')
    const same = allTd.filter((x) => x.fields.id.match(/^TD-(\d+)-/)?.[1] === to)
    if (same.some((x) => x.src === 'main' && x.mode === 'manual'))
      fail(`目标区 ${to} 主表存在「列错位需人工」的行 → 先修，否则新 ID 可能撞号`)
    const maxN = same.reduce((mx, x) => Math.max(mx, idSeq(x.fields.id)), 0)
    const newId = `TD-${to}-${maxN + 1}`
    const dup = allTd.find((x) => x.fields.id === newId)
    if (dup)
      fail(
        `取号自检失败：${newId} 已存在于${dup.src === 'archive' ? '归档' : '主表'} → 拒写（撞号会被 loadAll 静默遮蔽）`,
      )
    const areaRaw = (same.find((x) => x.src === 'main') ?? same[0])?.fields.area ?? ''
    const areaText = areaRaw.replace(/（@见[^）]*）/g, '').trim() || `${to}`
    const C = MAP[r.kind]
    const parts = f.lines[li].split('|')
    const oldId = r.fields.id
    const oldArea = r.fields.area
    parts[1 + C.id] = ` ${newId} `
    parts[1 + C.area] = ` ${areaText} `
    f.lines[li] = parts.join('|')
    writeFileSync(f.file, f.lines.join('\n'))
    console.log(`✅ ${oldId} → ${newId}（${f.src}；区域列：${oldArea} → ${areaText}）`)
    console.log(
      '   ↳ 记得同步改区域日志 / index.md 里对该旧 ID 的引用（账本外的叙述不在本脚本管辖内）',
    )
    return
  }
  fail(`主表与归档中均无 ${id}`)
}

/**
 * archive —— 把已完成项从主表移入 `债务-归档.md`，主表只留待办。
 * 幂等：归档按 ID 去重，已存在的用最新行替换。惯例：`resolve` 后顺手跑一次。
 */
function cmdArchive(argv) {
  const dry = argv.includes('--dry')
  const date = today()
  const { lines, rows } = loadLedger()
  const doneRows = rows.filter((r) => DONE_WORDS.includes(statusWord(r.fields.status)))
  const keepRows = rows.filter((r) => !DONE_WORDS.includes(statusWord(r.fields.status)))
  if (!doneRows.length) {
    console.log(`✅ 无需归档：主表已无「已完成」项（现有 ${keepRows.length} 条待办）`)
    return
  }
  const archText = existsSync(ARCHIVE) ? readFileSync(ARCHIVE, 'utf8') : ''
  const byId = new Map()
  for (const l of [
    ...archText.split(/\r?\n/).filter((x) => TABLE_ROW.test(x)),
    ...doneRows.map((r) => r.line),
  ]) {
    const id = l.match(/\|\s*\*{0,2}((?:TD|MD)-\d+-\d+)/)?.[1]
    if (id) byId.set(id, l)
  }
  const ent = [...byId.entries()]
  const tdA = ent
    .filter(([id]) => id.startsWith('TD'))
    .sort((a, b) => idKey(a[0]) - idKey(b[0]))
    .map(([, l]) => l)
  const mdA = ent.filter(([id]) => id.startsWith('MD')).map(([, l]) => l)
  const outArch = [
    '# 债务账本 · 归档（已解决 / 已裁定 / 已退役 / 不做）',
    '',
    '> **由 `node scripts/debt.mjs archive` 自动维护**：把 `债务.md` 里的已完成项移入本文件，主表只留待办。',
    '> 读法：`list --all` / `area <NN>` / `search <关键词>` / `show <TD-ID>`（**均已打通归档，不必手读本文件**）。',
    '> 格式与读写规范见 [债务.md](./债务.md)；明细真源 = 各区域日志的「探债」段；',
    '> 2026-09-14 重写前的长叙述全文见 [债务-全文归档-2026-09-14.md](./债务-全文归档-2026-09-14.md)。',
    `> 最近更新：${date} ｜ 归档 ${byId.size} 条`,
    '',
    '## 元结构债（机制层，非代码；ID 前缀 `MD-<NN>`）',
    '',
    '| MD-ID | 现象 | 归类 | 状态 | 锚点 |',
    '| --- | --- | --- | --- | --- |',
    ...mdA,
    '',
    '## 已登记债',
    '',
    '| TD-ID | 区域 | 现象摘要 | 归类 | 利息率 | 状态 | 锚点 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...tdA,
    '',
  ].join('\n')
  if (dry) {
    console.log(`（dry-run）将归档 ${doneRows.length} 条 → 主表留 ${keepRows.length} 条`)
    return
  }
  const doneLineSet = new Set(doneRows.map((r) => r.li))
  writeFileSync(ARCHIVE, outArch)
  writeFileSync(LEDGER, lines.filter((_, i) => !doneLineSet.has(i)).join('\n'))
  const by = {}
  for (const r of keepRows) {
    const w = statusWord(r.fields.status) || '?'
    by[w] = (by[w] || 0) + 1
  }
  console.log(`✅ 归档 ${doneRows.length} 条 → daily/架构日志/债务-归档.md（累计 ${byId.size} 条）`)
  console.log(
    `   主表保留 ${keepRows.length} 条待办：${
      Object.entries(by)
        .map(([k, v]) => `${k}=${v}`)
        .join(' · ') || '（无）'
    }`,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// reverify（只读重判 · TD-09-37）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 存量「已解决」的复算：**真跑**每条凭证命令，与它当初声称的数字 / 结论对账。
 *
 * 【为什么必须有】2026-10-25 全量复算：115 条「已解决」里 39 条零凭证、76 条只有散文数字
 *   （19 条假或口径窄）。结账闸只防**新增** —— 存量必须能被重判，否则"假账"只是被封存。
 *
 * 【只读】本命令**不改任何状态**（不写盘、不降级、不改行）。要不要据此改账本由人决定；
 *   无凭证的**只标「无凭证」，不猜**（不替它推断"大概修好了"）。
 *
 * 【清单】
 *   ① 可复用：命令跑出来与声称一致 → 凭证今天仍然成立，谁都能重跑
 *   ② 数字漂移：跑得动但与声称不符 → 附改前（声明）/ 改后（实跑输出里的数字）
 *   ③ 无凭证待补：没有机验凭证的已结债 → 再分「旧台账迁移」/「有结论无命令」/「无结论无命令」
 *   ④ 跑不动：命令现在跑不起来（exit≠0）→ 凭证已失效，等同无凭证
 *   ⑤ 人工担保：`kind=人工`（不可机验，按 `by` 追责）—— 显式降级通道，单列不与机验混算
 */
/**
 * 已结账行的**唯一**判定 —— `reverify` 与 `reopen --from-reverify` 共用这一份。
 * 【为什么必须共用】降级要"直接吃 reverify 的判定结果"（任务单 §4）；两处各写一份分类，
 * 早晚会出现「reverify 说无凭证、reopen 却漏了它」这种口径漂移。
 * 分类口径见 `cmdReverify` 头注释（① 可复用 / ② 漂移 / ④ 跑不动 / ⑤ 人工 / ③ 无凭证三档）。
 */
function analyzeDoneRows(rows) {
  const ok = []
  const drift = []
  const broken = []
  const manual = []
  const none = { legacy: [], prose: [], bare: [] }
  for (const r of rows) {
    const ev = parseEvidenceBlob(r.fields.status)
    // 无凭证 / 凭证残缺（键都拆不开、或连 claim 都没有）→ 一律算「无凭证」，不猜
    if (!ev || ev.bad.length || !ev.fields.claim) {
      const status = String(r.fields.status)
      const body = status.match(/^\*{0,2}\[([^\]]+)\]/)?.[1] ?? status
      const note = body.replace(/\d{4}-\d{2}-\d{2}/g, '')
      if (/旧台账/.test(status)) none.legacy.push(r)
      else if (/\d/.test(note)) none.prose.push(r)
      else none.bare.push(r)
      continue
    }
    if (ev.fields.kind === '人工') {
      manual.push({ r, ev })
      continue
    }
    if (!ev.fields.cmd) {
      none.prose.push(r) // 机验却没了命令 = 凭证残缺，等同无凭证
      continue
    }
    const res = runEvidenceCommand(ev.fields.cmd)
    if (!res.ok) broken.push({ r, ev, res })
    else if (claimMatches(res.output, ev.fields.claim)) ok.push({ r, ev })
    else drift.push({ r, ev, res })
  }
  return { ok, drift, broken, manual, none }
}

function cmdReverify(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  const all = argv.includes('--all')
  if (!id && !all)
    fail('用法：node scripts/debt.mjs reverify <TD-ID> | --all（**只读**：不改任何状态）')
  const pool = loadAll().filter((r) => r.fields.kind === 'TD' && r.src !== 'full')
  const done = pool.filter((r) => DONE_WORDS.includes(statusWord(r.fields.status)))
  let targets
  if (all) targets = done
  else {
    const row = pool.find((r) => r.fields.id === id)
    if (!row) fail(`主表 ∪ 归档 中均无 ${id}`)
    if (!DONE_WORDS.includes(statusWord(row.fields.status))) {
      console.log(
        `✅ ${id} 未结账（[${statusWord(row.fields.status)}]）→ 无需复算（本命令只管已结的账）`,
      )
      return
    }
    targets = [row]
  }
  targets.sort((a, b) => idKey(a.fields.id) - idKey(b.fields.id))

  const { ok, drift, broken, manual, none } = analyzeDoneRows(targets)

  const line = (icon, r, text) => console.log(`   ${icon} ${r.fields.id}${SRC_TAG(r)} ｜ ${text}`)
  const noneCount = none.legacy.length + none.prose.length + none.bare.length
  const withEv = ok.length + drift.length + broken.length + manual.length
  // 按状态词分档（「已解决」是主战场，但「已裁定 / 已退役 / 不做」同样是没人再看的结账标签）
  const byStatus = {}
  for (const r of targets) {
    const w = statusWord(r.fields.status)
    byStatus[w] = (byStatus[w] || 0) + 1
  }
  const statusBreak = Object.entries(byStatus)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')
  console.log(
    `🔁 debt reverify（**只读**：不改任何状态）｜ 已结账 ${targets.length} 条（${statusBreak}）· 带凭证 ${withEv} 条 ｜ 实跑 ${ok.length + drift.length + broken.length} 次`,
  )

  console.log(`\n【① 可复用（命令跑出来对得上）】${ok.length} 条`)
  if (!ok.length) console.log('   （无）')
  for (const { r, ev } of ok) line('✅', r, `声明=${ev.fields.claim} ｜ cmd=${ev.fields.cmd}`)

  console.log(`\n【② 数字漂移（声明 ≠ 实跑）】${drift.length} 条`)
  if (!drift.length) console.log('   （无）')
  for (const { r, ev, res } of drift) {
    const nums = numbersIn(res.output)
    line(
      '⚠️',
      r,
      `改前（声明）=${ev.fields.claim} → 改后（实跑）=${nums.length ? nums.join(' / ') : '（输出里没有数字）'}`,
    )
    console.log(`        cmd=${ev.fields.cmd}`)
    for (const l of outputTail(res.output, 2)) console.log(`        | ${l.slice(0, 140)}`)
  }

  console.log(`\n【③ 无凭证待补】${noneCount} 条`)
  if (!noneCount) console.log('   （无）')
  const idList = (rows) => {
    for (let i = 0; i < rows.length; i += 8)
      console.log(
        '      ' +
          rows
            .slice(i, i + 8)
            .map((x) => x.fields.id)
            .join(' · '),
      )
  }
  for (const [label, rows] of [
    ['旧台账迁移（"旧台账 D-xx 已 done，迁移归档"）', none.legacy],
    ['有结论无命令（状态格里有数字 / 结论，但没有可跑命令）', none.prose],
    ['无结论无命令', none.bare],
  ]) {
    if (!rows.length) continue
    console.log(`   · ${label} —— ${rows.length} 条`)
    idList(rows)
  }
  if (noneCount)
    console.log(
      '   ↳ 补凭证的唯一正当路径：带 `--evidence` 重跑一次 `resolve`（不许手写表格行、不许改成"大概"）',
    )

  console.log(`\n【④ 跑不动（凭证命令现在失败）】${broken.length} 条`)
  if (!broken.length) console.log('   （无）')
  for (const { r, ev, res } of broken) {
    line(
      '⛔',
      r,
      `声明=${ev.fields.claim} ｜ exit=${res.exit}${res.reason ? `（${res.reason}）` : ''}`,
    )
    console.log(`        cmd=${ev.fields.cmd}`)
    for (const l of outputTail(res.output, 2)) console.log(`        | ${l.slice(0, 140)}`)
  }

  console.log(`\n【⑤ 人工担保（不可机验 · 显式降级，按 by 追责）】${manual.length} 条`)
  if (!manual.length) console.log('   （无）')
  for (const { r, ev } of manual)
    line('✍️', r, `by=${ev.fields.by} ｜ claim=${ev.fields.claim} ｜ why=${ev.fields.why}`)

  console.log(
    `\n小结：可复用 ${ok.length} · 漂移 ${drift.length} · 跑不动 ${broken.length} · 无凭证 ${noneCount} · 人工担保 ${manual.length}`,
  )
  console.log('↳ 本命令只报不改：要不要据此降级 / 改账本由人决定（本命令不写盘）')
}

// ─────────────────────────────────────────────────────────────────────────────
// reopen（撤销结账 · TD-09-38）—— `resolve` 的**严格反向**
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 【为什么需要它】`reverify` 判出 121 条已结账**无凭证**（39 旧台账迁移 + 80 有结论无命令 +
 *   2 无结论无命令）。用户定案：无凭证的一律降级回 `待还`。而 `resolve` 的凭证闸是**无条件**的
 *   —— 连 `--status 待还` 也要凭证，语义上错了：**降级不是结账，是撤销结账**，
 *   它的凭证就是 `reverify` 的输出。
 *
 * 【四条纪律】
 *   ① **单向且只降「已解决」**：`已解决` → `待还`。反向（`待还` → `已解决`）走 `resolve`，
 *      且必须过凭证闸。**裁定类（`已裁定非债` / `已裁定` / `不做` / `已退役`）不许降** ——
 *      那是**人的判断**（"我核过，这不是债" / "做它不划算"），不是"我说它修好了"，
 *      降级它们 = 把自己的裁定翻掉、复活明确判过的东西。要翻裁定走 `edit --field solution`。
 *   ② **不要求 `--evidence`，但必须有 `--why`**（单条模式必填；`--from-reverify` 按分组派生三档）——
 *      撤销也得留理由，否则等于无声抹账。
 *   ③ **状态格统一前缀** `[待还 <date> · 凭证缺失 · <why> · 原记「<原结账句>」]` ⇒
 *      `debt search 凭证缺失` 一次拉全；**原结账句逐字保留、不截断**（降级是为说真话，
 *      不是为了销毁历史 —— "原文在 git 历史里可查"不算留存，账本里搜不到就等于没有了）。
 *   ④ **有凭证的债不许 reopen**：状态格里出现 `evidence:v1{…}` 就是可复算的真账，
 *      降级它 = 把真账删掉。命中即整批拒改并列出 ID（不部分执行，不留半态）。
 *
 *   ⑤ **降级必须搬回主表**（2026-10-25 用户定案）：归档行降完仍是归档行 ⇒ `debt list` 默认看不见
 *      = **假降级**（账本说它待还，而没人看得见）。故归档行**整行搬回主表**（`archive` 的反向），
 *      并把归档头的「归档 N 条」跟着减（否则归档头说的是假数）。
 */
const REOPEN_TO = '待还'
/** **只许从「已解决」降**：裁定类（已裁定* / 不做 / 已退役）是人的判断，不是"我说它修好了" */
const REOPEN_FROM = '已解决'
const RULING_WORDS = ['已裁定非债', '已裁定', '不做', '已退役']
const REOPEN_MARK = '凭证缺失'
const EVIDENCE_ANY_RE = /evidence:v1\s*\{/
/** 分组名与 `analyzeDoneRows().none` 的键一一对应（分组名同时进状态格，故是"真源"） */
const REOPEN_GROUPS = [
  ['旧台账迁移', 'legacy'],
  ['有结论无命令', 'prose'],
  ['无结论无命令', 'bare'],
]
const reopenWhy = (group) => `reverify: 无凭证（${group}）`

/**
 * 原结账句 —— **逐字保留**，只剥开头的状态词与日期。
 *
 * 【为什么必须保留】降级是为了说真话，不是为了销毁历史。"原文在 git 历史里可查"**不算留存**：
 *   账本里搜不到就等于没有了（下一个人不会去翻 commit）。所以降级把原句整段搬进 `原记「…」`，
 *   **不截断、不改写** —— 仓里已经有 350 字的状态格，长了不是新问题，**丢了才是新问题**。
 *   注：`]` 不撑破表格（列分隔是 `|`），内嵌 ASCII 方括号与〔〕标注一律原样保留。
 */
function originalSettlement(statusCell) {
  const cell = String(statusCell ?? '')
    .trim()
    .replace(/^\*{0,2}\[/, '')
    .replace(/\]\s*$/, '')
  return cell
    .replace(/^\s*(?:已裁定非债|已解决|已裁定|待用户拍板|待翻新|已退役|待还|不做)\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*/, '')
    .replace(/^[·：:]\s*/, '')
    .trim()
}

/**
 * 状态格里已登记的 `原记「…」` —— **逐字取出**（含内嵌 ASCII 方括号 / 〔〕标注）。
 *
 * 【为什么 resolve 也要它】降级（`reopen`）把原结账句搬进 `原记「…」`；随后补凭证要重新
 * `resolve`。若 resolve 写全新状态格，就把刚救回来的历史又冲掉了 —— **一边修销毁口、
 * 一边用另一个命令销毁同一批历史**。故 resolve 默认**保留**，要丢必须 `--drop-original`。
 */
function originalMarker(cell) {
  return (String(cell ?? '').match(/原记「[\s\S]*」(?=\s*(?:\]|$))/) ?? [])[0] ?? ''
}

/**
 * 状态格里"不该被 `edit` 碰"的尾巴 —— `evidence:v1{…}` 与 `原记「…」`，**逐字原样**。
 *
 * 【为什么】改一个字段不许把历史抹了：`edit --field solution` 只该替换"解法"那一段。
 * 从**最早出现的**那一个标记切到尾，顺序与原文一致（不重排、不改写）。
 */
function settlementTail(cell) {
  const s = String(cell ?? '')
  const marks = [s.search(/evidence:v1\s*\{/), s.search(/原记「/)].filter((i) => i >= 0)
  if (!marks.length) return ''
  return s
    .slice(Math.min(...marks))
    .replace(/\]\s*$/, '')
    .trim()
}

/** `edit --field solution` 的新值与已登记的 `原记` 是否冲突（不猜：冲突就要求显式销毁） */
function editConflict(value, tail) {
  const v = String(value ?? '')
  if (/原记「|」/.test(v)) return '新解法里带了 `原记「…」` / `」`（像是要自己重写整格）'
  if (/evidence:v1\s*\{/.test(v))
    return '新解法里带了 `evidence:v1{…}`（凭证只能由 `resolve` 写，不许手写）'
  const body = (String(tail ?? '').match(/原记「([\s\S]*)」\s*$/) ?? [])[1] ?? ''
  if (!body) return ''
  // 反向包含也要拦：新值抄了原文一大段（≥20 字）= 重写整句，留着会两句话打架
  if (v.includes(body) || (v.length >= 20 && body.includes(v)))
    return '新解法已包含 / 抄了旧的 `原记` 原文（像是重写整句，留着会重复）'
  return ''
}

/** 被排除的裁定类：**列出 ID**，不猜、不改（要翻裁定走 `edit`） */
function printExcludedRulings(excluded) {
  if (!excluded.length) return
  console.log(
    `\n⚠️ 排除 ${excluded.length} 条**裁定类**（不降级）：\`已裁定非债\` / \`不做\` 是你的判断，不是"我说它修好了"`,
  )
  const ids = excluded.map((r) => r.fields.id)
  for (let i = 0; i < ids.length; i += 8) console.log('   ' + ids.slice(i, i + 8).join(' · '))
  console.log('   ↳ 要翻裁定请走 `edit --field solution` 改判，不要用 reopen')
}

function cmdReopen(argv) {
  const id = argv.find((a) => /^TD-\d+-\d+|^MD-\d+-\d+/.test(a))
  const fromReverify = argv.includes('--from-reverify')
  const dry = argv.includes('--dry')
  const why = argVal(argv, '--why').trim()
  const date = argVal(argv, '--date') || today()
  if (!id && !fromReverify)
    fail(
      `用法：reopen <TD-ID> --why "…" [--dry] ｜ reopen --from-reverify [--dry]（撤销结账：**${REOPEN_FROM}** → ${REOPEN_TO}，不要求凭证）`,
    )

  // 闸 ①：单条模式必须给理由（批量模式由分组派生，见下）
  if (!fromReverify && !why) {
    console.error(
      '❌ reopen 被拒：**缺 `--why`**（降级不是结账，是**撤销结账**；撤销也得留理由，否则等于无声抹账）',
    )
    console.error('')
    console.error('   把理由写清楚，原样进状态格：')
    console.error(
      '     node scripts/debt.mjs reopen TD-xx-1 --why "reverify: 无凭证（旧台账迁移）"',
    )
    console.error('')
    console.error('   典型值（`--from-reverify` 会按分组自动派生这三档）：')
    for (const [label] of REOPEN_GROUPS) console.error(`     ${reopenWhy(label)}`)
    console.error('')
    console.error(
      `   ↳ 判定口径：\`node scripts/debt.mjs reverify <ID>\`（只读）；本命令只做 ${REOPEN_FROM} → ${REOPEN_TO}`,
    )
    process.exit(1)
  }
  if (why && /[|｜\]{}]/.test(why)) {
    fail('`--why` 含 `|` / `]` / `{` / `}` → 会撑破表格列 / 截断状态格；改用「」或删掉')
  }

  // 选行：单条 / 直接吃 reverify 的判定（同一份 analyzeDoneRows，防两处口径漂移）
  const plans = []
  const excluded = [] // 裁定类：**不降级**，只列出
  if (fromReverify) {
    const done = loadAll().filter(
      (r) =>
        r.fields.kind === 'TD' &&
        r.src !== 'full' &&
        DONE_WORDS.includes(statusWord(r.fields.status)),
    )
    const { none } = analyzeDoneRows(done)
    for (const [label, key] of REOPEN_GROUPS)
      for (const r of none[key]) {
        // 只降「已解决」；`已裁定非债 / 不做 / 已退役` 是**人的裁定**，不是"我说它修好了"
        if (statusWord(r.fields.status) === REOPEN_FROM)
          plans.push({ r, why: reopenWhy(label), group: label })
        else excluded.push(r)
      }
    if (!plans.length) {
      console.log(
        `✅ 无需降级：reverify 的「无凭证」里没有 **${REOPEN_FROM}** 的行（只剩裁定类或为空）`,
      )
      printExcludedRulings(excluded)
      return
    }
  } else {
    const hit = loadAll().filter((r) => r.fields.id === id && r.src !== 'full')
    if (!hit.length) fail(`主表 ∪ 归档 中均无 ${id}`)
    if (hit.length > 1) fail(`${id} 出现 ${hit.length} 次（重复 ID）→ 先处理重复`)
    plans.push({ r: hit[0], why, group: '' })
  }
  plans.sort((a, b) => idKey(a.r.fields.id) - idKey(b.r.fields.id))

  // 闸 ②③④：有凭证不许降级；裁定类不许降级；只能单向。**任一不过 = 整批不执行**
  const problems = []
  for (const { r } of plans) {
    const status = String(r.fields.status)
    const word = statusWord(status)
    if (EVIDENCE_ANY_RE.test(status))
      problems.push(
        `${r.fields.id}：状态格里已有凭证 → **有凭证的债不许降级**（它可复算，降级等于把真账删掉）`,
      )
    else if (RULING_WORDS.includes(word))
      problems.push(
        `${r.fields.id}：当前 [${word}] 是**裁定类**（你的判断，不是"我说它修好了"）→ 不许用 reopen 降级；要翻裁定请走 \`edit --field solution\` 改判`,
      )
    else if (word !== REOPEN_FROM)
      problems.push(
        `${r.fields.id}：当前 [${word || '?'}] → reopen 只做 **${REOPEN_FROM} → ${REOPEN_TO}**（反向请走 \`resolve\`，且必须过凭证闸）`,
      )
  }
  if (problems.length) {
    console.error(`❌ reopen 被拒（**账本未写入**）：${problems.length} 条不合格`)
    for (const p of problems) console.error('   · ' + p)
    console.error('   ↳ 不部分执行、不留半态：修掉上面这些再重跑。')
    process.exit(1)
  }

  // 落笔：主表就地改状态格；归档行**整行搬回主表**（`archive` 的反向），否则 = 假降级
  const files = [{ file: LEDGER, label: '主表', lines: loadLedger().lines }]
  if (existsSync(ARCHIVE))
    files.push({
      file: ARCHIVE,
      label: '归档',
      lines: readFileSync(ARCHIVE, 'utf8').split(/\r?\n/),
    })
  const removed = new Set()
  const moved = []
  const preview = []
  let touchedMain = false
  for (const p of plans) {
    const r = p.r
    if (r.mode === 'manual') fail(`${r.fields.id} 是「列错位需人工」行 → 先修列，再撤销结账`)
    const f = files.find((x) => (r.src === 'main' ? x.file === LEDGER : x.file === ARCHIVE))
    if (!f) fail(`${r.fields.id} 的来源 ${r.src} 无法定位（内部错误）`)
    const C = MAP[r.kind]
    const oldCell = String(f.lines[r.li].split('|')[1 + C.status] || '').trim()
    // 原结账句逐字搬进 `原记「…」`：降级不许销毁历史（否则"账本里搜不到"= 没有了）
    const orig = originalSettlement(oldCell)
    const newCell = `[${REOPEN_TO} ${date} · ${REOPEN_MARK} · ${p.why}${
      orig ? ` · 原记「${orig}」` : ''
    }]`
    const parts = f.lines[r.li].split('|')
    parts[1 + C.status] = ` ${newCell} `
    const newRow = parts.join('|')
    const backToMain = r.src === 'archive'
    if (backToMain) {
      removed.add(r.li)
      moved.push(newRow)
    } else {
      f.lines[r.li] = newRow
      touchedMain = true
    }
    preview.push({ id: r.fields.id, tag: SRC_TAG(r), oldCell, newCell, group: p.group, backToMain })
  }

  console.log(
    `🔄 debt reopen（撤销结账：**${REOPEN_FROM}** → ${REOPEN_TO}，不要求凭证）｜ 选中 ${preview.length} 条${dry ? ' ｜ --dry 预览（**不落盘**）' : ''}`,
  )
  const groups = fromReverify ? REOPEN_GROUPS.map(([label]) => label) : ['']
  for (const g of groups) {
    const rows = preview.filter((x) => x.group === g)
    if (!rows.length) continue
    if (g) console.log(`\n【${g}】${rows.length} 条`)
    for (const x of rows)
      console.log(
        `   ${x.id}${x.backToMain ? '（归档→主表）' : x.tag} ｜ 改前 ${x.oldCell} → 改后 ${x.newCell}`,
      )
  }

  if (!dry) {
    const mainFile = files.find((x) => x.file === LEDGER)
    if (touchedMain || moved.length) {
      const mainText = mainFile.lines.join('\n').replace(/\s*$/, '')
      writeFileSync(LEDGER, moved.length ? `${mainText}\n${moved.join('\n')}\n` : `${mainText}\n`)
    }
    const archFile = files.find((x) => x.file === ARCHIVE)
    if (archFile && removed.size) {
      const kept = archFile.lines.filter((_, i) => !removed.has(i))
      const remaining = kept.filter((l) => TABLE_ROW.test(l)).length
      // 归档计数跟着减（否则归档头说的是假数）
      const text = kept
        .join('\n')
        .replace(/^(> 最近更新：\S+ ｜ 归档 )\d+( 条)$/m, `$1${remaining}$2`)
      writeFileSync(ARCHIVE, text)
    }
    console.log(
      `\n✅ 已降级 ${preview.length} 条（就地改状态格，未新增行）${
        moved.length ? `；其中 ${moved.length} 条已从归档**搬回主表**` : ''
      }`,
    )
  } else {
    console.log(`\n（dry·未写盘）真降请去掉 --dry；共 ${preview.length} 条会被降级`)
  }
  if (moved.length || preview.some((x) => x.backToMain))
    console.log(
      `   ↳ ${preview.filter((x) => x.backToMain).length} 条会从归档**搬回主表**（不搬 = 假降级：账本说待还，而 \`debt list\` 看不见）`,
    )
  printExcludedRulings(excluded)
  console.log('   ↳ 复核：`node scripts/debt.mjs search 凭证缺失 --all`')
}

// ─────────────────────────────────────────────────────────────────────────────
// audit（只读报告 · 不是闸）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 落点存在性巡检（`audit --liveness` · 2026-09-15 · 用户授权）。
 *
 * 【为什么需要】原先 `audit` 只校验**锚点**（区域日志）在不在 —— 债**描述里点名的代码文件**
 * 无人校验。实证：`TD-22-13`~`TD-22-16` 的落点（`composite.ts` / `routeClip.ts` /
 * `PlaybackSink.tsx` …）随 `_legacy` 清理与路线更替**全部消失**，账本却一无所知，
 * 直到有人去偿债才发现「无处可还」⇒ 债烂在表里空吃利息。
 *
 * 【判据】只认 `现象/摘要` 列里**反引号包裹、带代码扩展名**的 token（`composite.ts:108`
 * 这类带行号的同样命中，行号后缀忽略）。**在仓库里按 basename 找**：只要存在**任何一个**
 * 同名文件就放过 —— 债描述里的路径常是省略前缀的写法，按全路径匹配会大面积误报。
 *
 * 【刻意只报告、不改状态】落点消失有两种成因：① 真随重构/计划改道消失（该结清）；
 * ② 描述里是笔误（该改描述）。两者处置不同 ⇒ 必须人判，工具不猜。
 *
 * 【范围】主表 + 归档都扫（归档里的历史债同样是"重审时的线索"，落点失效会导致误判"这债还在"）。
 */
const LIVENESS_FILE_RE = /`([A-Za-z0-9_][\w./-]*\.(?:tsx?|jsx?|mjs|cjs))(?::[\d\-–、]+)?`/g
const LIVENESS_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.vite',
  'release',
])

/** 收集仓库内所有文件名（basename 集合，跳过大目录）—— 一次遍历，供全部债行复用。 */
function collectRepoFileNames() {
  const names = new Set()
  const walk = (dir) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return // 权限/竞态：跳过即可（只读巡检，不因单目录失败而中断）
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!LIVENESS_SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name))
      } else {
        names.add(entry.name)
      }
    }
  }
  walk(ROOT)
  return names
}

/** 扫一份账本文本，返回"落点疑似失效"问题项。 */
function livenessIssues({ srcLabel, lines, repoNames }) {
  const out = []
  lines.forEach((line, li) => {
    const r = readRow(line)
    if (!r || r.broken || r.mode === 'manual') return
    const text = String(r.fields.summary ?? '')
    const seen = new Set()
    for (const m of text.matchAll(LIVENESS_FILE_RE)) {
      const raw = m[1]
      const base = raw.split('/').pop()
      if (seen.has(base)) continue // 同一行重复点名只报一次
      seen.add(base)
      if (!repoNames.has(base)) {
        out.push({
          at: `${srcLabel}第 ${li + 1} 行`,
          kind: '落点疑似失效',
          detail: `${r.fields.id}：\`${raw}\` —— 全仓无此文件（可能已随重构 / 清理 / 计划改道消失；偿债前先确认它还在不在）`,
        })
      }
    }
  })
  return out
}

const AUTO_KINDS = ['列错位·可自动修', '归类非规范', '利息率非规范', '状态非规范', '多余表头']

/**
 * 锚点连通性：债行指向的区域日志里**必须真的出现该 TD-ID**。
 *
 * 【为什么必须有（A10 工具债 · 2026-09-16 当场修）】本轮实证：主表有 TD-02-38 行，`show` 也照常
 *   打印「↳ 下一跳：该区域日志的「探债」段…（搜 `TD-02-38`）」—— 但那个锚点文件里**全篇 0 处**
 *   出现 `TD-02-38`（写者把同一条登成了别的号）⇒ 读者会以为"有证据可查"，实际是**断链**。
 *   同轮还暴露「同一写点被登 2~3 次」（36/38/39 同一处），读命令无法提示这类重复 —— 但
 *   **"锚点里没有这个号"是可以机器判定的**，就让巡检把它列出来（宁漏不猜，不做语义判重）。
 * 【成本】只读被引用的锚点文件（集合很小），故**不藏在 `--liveness` 后面**（那是全仓遍历才需要开关）。
 * 【与 `anchorProblem()` 的分工】那条判命名 / 存在；本函数判**内容连通性**（存在 ≠ 有关）。
 */
function anchorIdIssues({ srcLabel, lines }) {
  const out = []
  const textCache = new Map() // 锚点文件名 -> 文本 | null（不存在）
  lines.forEach((line, li) => {
    const r = readRow(line)
    if (!r || r.broken || r.mode === 'manual') return
    const id = r.fields.id
    const m = String(r.fields.anchor ?? '').match(/^\**\[([^\]]+)\]\([^)]*\)/)
    if (!m) return // 非标准锚点形状（`—` / 手抄）→ 另有类别管，不在此重复报
    const file = m[1]
    if (!REGION_ANCHOR_RE.test(file)) return // 命名 / 存在性由 anchorProblem 管
    if (!textCache.has(file)) {
      const p = join(LOG_DIR, file)
      textCache.set(file, existsSync(p) ? readFileSync(p, 'utf8') : null)
    }
    const text = textCache.get(file)
    if (text && !text.includes(id)) {
      out.push({
        at: `${srcLabel}第 ${li + 1} 行`,
        kind: '锚点断链',
        detail: `${id}：锚点 ${file} 内没有该债号（\`show\` 会给出「有证据可查」的假象）`,
      })
    }
  })
  return out
}
function cmdAudit(argv = []) {
  const liveness = argv.includes('--liveness')
  const repoNames = liveness ? collectRepoFileNames() : null
  const issues = []
  for (const [file, src] of [
    [LEDGER, '主表'],
    [ARCHIVE, '归档'],
  ]) {
    if (!existsSync(file)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const seen = new Map()
    const headerLines = []
    lines.forEach((line, li) => {
      if (/^\|\s*TD-ID\s*\|/.test(line)) headerLines.push(li)
      const r = readRow(line)
      if (!r) return
      const at = `${src}第 ${li + 1} 行`
      if (r.broken) {
        issues.push({ at, kind: '断行', detail: '缺少首/尾竖线' })
        return
      }
      const f = r.fields
      if (seen.has(f.id))
        issues.push({ at, kind: '重复 ID', detail: `${f.id}（首次在第 ${seen.get(f.id) + 1} 行）` })
      else seen.set(f.id, li)
      if (r.mode === 'A')
        issues.push({ at, kind: '列错位·可自动修', detail: `${f.id}：尾部多余段（同锚点贴两次）` })
      if (r.mode === 'B')
        issues.push({
          at,
          kind: '列错位·可自动修',
          detail: `${f.id}：描述含裸 \`|\`（段数 ${r.inner.length}）`,
        })
      if (r.mode === 'C')
        issues.push({
          at,
          kind: '列错位·可自动修',
          detail: `${f.id}：状态含裸 \`|\`（段数 ${r.inner.length}）`,
        })
      if (r.mode === 'manual')
        issues.push({
          at,
          kind: '列错位·需人工',
          detail: `${f.id}：段数 ${r.inner.length}，四级校验均不通过 → 不猜`,
        })
      if (r.mode !== 'manual' && !isAnchorish(f.anchor))
        issues.push({
          at,
          kind: '锚点异常',
          detail: `${f.id}：\`${String(f.anchor).slice(0, 48)}\``,
        })
      // 锚点**目标**巡检（2026-09-14 · TD-22-17）：形状对 ≠ 位置对 —— `../docs/…` 形状合法却逃出架构日志。
      // 判据与写入口**共用** `anchorProblem()`（同一份，防两处漂移）。
      if (r.mode !== 'manual' && isAnchorish(f.anchor)) {
        const target = (String(f.anchor).match(/^\*{0,2}\[[^\]]*\]\(([^)]*)\)/)?.[1] ?? '').replace(
          /^\.\//,
          '',
        )
        const p = target ? anchorProblem(target) : ''
        if (p) issues.push({ at, kind: '锚点非区域文件', detail: `${f.id}：${p}` })
      }
      const c = normClass(f.class)
      if (c.unknown) issues.push({ at, kind: '归类未知', detail: `${f.id}：\`${f.class}\`` })
      else if (c.from)
        issues.push({ at, kind: '归类非规范', detail: `${f.id}：\`${c.from}\` → \`${c.value}\`` })
      if (r.fields.kind === 'TD') {
        const rt = normRate(f.rate)
        if (rt.unknown) issues.push({ at, kind: '利息率未知', detail: `${f.id}：\`${f.rate}\`` })
        else if (rt.from)
          issues.push({
            at,
            kind: '利息率非规范',
            detail: `${f.id}：\`${rt.from}\` → \`${rt.value}\``,
          })
      }
      const s = normStatus(f.status)
      if (s.unknown) issues.push({ at, kind: '状态未知', detail: `${f.id}：\`${f.status}\`` })
      else if (s.from)
        issues.push({ at, kind: '状态非规范', detail: `${f.id}：\`${s.from}\` → \`${s.value}\`` })
    })
    if (headerLines.length > 1)
      for (const li of headerLines.slice(1))
        issues.push({ at: `${src}第 ${li + 1} 行`, kind: '多余表头', detail: '追加时误贴的表头行' })
    if (liveness) issues.push(...livenessIssues({ srcLabel: src, lines, repoNames }))
    // 锚点连通性：常开（只读被引用的锚点文件，代价极小）；实证见 anchorIdIssues 注释
    issues.push(...anchorIdIssues({ srcLabel: src, lines }))
  }
  const main = loadLedger().rows.filter((r) => r.fields.kind === 'TD').length
  const arch = existsSync(ARCHIVE)
    ? parseText(readFileSync(ARCHIVE, 'utf8'), 'a').filter((r) => r.fields.kind === 'TD').length
    : 0
  console.log(
    `🔍 debt audit（只读 · **不是闸**）｜ 主表 ${main} 条 · 归档 ${arch} 条 ｜ 违规 ${issues.length} 项`,
  )
  const byKind = {}
  for (const i of issues) (byKind[i.kind] ||= []).push(i)
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`\n── ${kind}（${list.length}）`)
    for (const i of list.slice(0, 30)) console.log(`   ${i.at}：${i.detail}`)
    if (list.length > 30) console.log(`   … 另 ${list.length - 30} 项`)
  }
  const auto = issues.filter((i) => AUTO_KINDS.includes(i.kind)).length
  console.log(`\n小结：可归一/修复 ${auto} 项 · 需人工 ${issues.length - auto} 项`)
}

/**
 * fix —— 规范化**历史坏行**（即 `audit` 报的「列错位·可自动修」）。
 *
 * 【为什么必须有这条命令】写入口自 2026-09-16 起已拦住**新增**（`resolve --note` 含裸 `|` 直接拒），
 * 但**存量坏行**一直没有修复通道 —— 只能手改账本文件，而文件头明写「禁手写、禁再追一行」。
 * 结果：`audit` 每轮都报同样的 4 项，谁都不许动 ⇒ 告警长鸣 = 等于没有告警。
 *
 * 【为什么能自动修】`readRow` 已经把列错位分成 A/B/C 三类并**算好了 `fixedInner`**
 * （`ok` 不动；`manual` 四级校验都不通过 ⇒ **不猜、不碰**）。
 * 本命令只负责把它拼回表格行写回 —— 判据与 `audit` **同一份**（不另写一套）。
 *
 * 用法：`node scripts/debt.mjs fix [--dry]`（**不带 `--dry` 才写盘**）。
 */
function cmdFix(argv = []) {
  const dry = argv.includes('--dry')
  let total = 0
  for (const [file, label] of [
    [LEDGER, '主表'],
    [ARCHIVE, '归档'],
  ]) {
    if (!existsSync(file)) continue
    const raw = readFileSync(file, 'utf8')
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    let n = 0
    const out = raw.split(/\r?\n/).map((line, li) => {
      const r = readRow(line)
      if (!r || !['A', 'B', 'C'].includes(r.mode)) return line
      n += 1
      console.log(
        `   ${label}第 ${li + 1} 行 · ${r.fields.id} · mode ${r.mode}：段数 ${r.inner.length} → ${r.fixedInner.length}`,
      )
      return `| ${r.fixedInner.join(' | ')} |`
    })
    if (n) {
      total += n
      if (!dry) writeFileSync(file, out.join(eol))
      console.log(`${dry ? '（dry·未写盘）' : '✅'} ${label}：${n} 行${dry ? ' 待修' : ' 已修'}`)
    } else {
      console.log(`✅ ${label}：0 行`)
    }
  }
  console.log(
    total
      ? `\n共 ${total} 行${dry ? '（去掉 --dry 生效）' : '已规范化'}`
      : '\n无坏行（列错位 0 项）',
  )
  if (total && !dry) console.log('↳ 收尾请复跑 `node scripts/debt.mjs audit` 确认「可自动修」归零')
}

// ─────────────────────────────────────────────────────────────────────────────
function argVal(argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''
}
function fail(msg) {
  console.error('❌ ' + msg)
  process.exit(1)
}

const [, , cmd, ...rest] = process.argv
switch (cmd) {
  case 'list':
    cmdList(rest)
    break
  case 'area':
    cmdArea(rest)
    break
  case 'search':
    cmdSearch(rest)
    break
  case 'show':
    cmdShow(rest)
    break
  case 'add':
    cmdAdd(rest)
    break
  case 'resolve':
    cmdResolve(rest)
    break
  case 'reanchor':
    cmdReanchor(rest)
    break
  case 'edit':
    cmdEdit(rest)
    break
  case 'move':
    cmdMove(rest)
    break
  case 'archive':
    cmdArchive(rest)
    break
  case 'reverify':
    cmdReverify(rest)
    break
  case 'reopen':
    cmdReopen(rest)
    break
  case 'audit':
    cmdAudit(rest)
    break
  case 'fix':
    cmdFix(rest)
    break
  case 'stats':
    cmdStats()
    break
  default:
    console.log('债务账本读写唯一入口（详见文件头注释）')
    console.log(
      '  读：list [--area NN] [--status X] [--all] | area <NN> | search <关键词> | show <TD-ID>',
    )
    console.log(
      '  写：add --area NN --summary "…" | resolve <TD-ID> --evidence "cmd=…;claim=…;fail=…;cplx=…;impl=…"（**凭证强制**；已有 原记 默认保留，丢要 --drop-original） | edit <TD-ID> --field summary｜solution｜classify｜rate --value "…" | reanchor <TD-ID> --anchor <区域文件> | move <TD-ID> --to <NN>',
    )
    console.log('  维护：archive [--dry] | audit [--liveness] | fix [--dry]（规范化历史列错位行）')
    console.log(
      '  复算：reverify <TD-ID> | --all（**只读**：真跑每条已结债的凭证命令，出「可复用 / 数字漂移 / 无凭证待补」）',
    )
    console.log(
      '  撤销：reopen <TD-ID> --why "…" [--dry] | reopen --from-reverify [--dry]（**已解决** → 待还；裁定类/有凭证的不许降级；归档行搬回主表）',
    )
    console.log('  统计：stats（形态/解法分布 —— 供"找债捷径"与"手法排行"，见两份 SOP）')
    process.exit(cmd ? 1 : 0)
}
