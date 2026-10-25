// 是什么：从原版 `app.v4.js` 抽出 jsx 派发表 + 全库 jsx 调用名，产出 `docs/生成/jsx派发表.json`
// 替代了什么：手工维护的「jsx 名字清单」（上一版 9 个 cy_* 里 6 个是编的，就因为没有这道闸）
// 谁在用：`tests/cep/jsx-dispatch.test.ts`（断言我方用到的每个名字都能在产物里命中）
// 禁止：手改产物。名字对不上时改的是**代码**或**本脚本的解析规则**，不是改 json。
//
// 什么时候要重跑：① `docs/原版/01-原版源码/panel/js/app.v4.js` 换成新版本时
// ② 本脚本解析规则改了 ③ 有人新增/改名 jsx 调用而测试报红时（先跑 `npm run jsx:dispatch` 确认产物是否过期）
//
// 用法：
//   node scripts/jsx-dispatch.mjs            # 生成/覆盖产物
//   node scripts/jsx-dispatch.mjs --check    # 只校验产物是否与源码一致（不一致退出码 1）
//
// 数据来源（两个，都在同一个文件里，都带行号）：
//   1. **派发表**：`app.v4.js` 里 `n.next = n.t0 === "名字" ? case号 : …` 那一行长链
//      （美化版 `:17058`），配套 `:17061-17184` 的 `l(名字, 成功文案, 通道, 是否读返回)`
//      —— 这是"自由面板项 → jsx 调用"的分派表。
//   2. **全库调用**：`.jsx("名字"` / `.jsxHistory(` / `.jsxNoCheck(` / `.jsxHistoryNoCheck(`
//      的第一参 —— 覆盖不经过派发表、被页面直接调用的函数（如 `cy_insertionImage`、`cy_batchOptimizeDoc`）。
//
// 口径（写清楚，免得下次靠猜）：`channel` 只有四个值 jsx / jsxHistory / jsxNoCheck / jsxHistoryNoCheck；
// `readsResult` 取 `l()` 的第 4 个实参，**没写就是 false**（原版默认 false，见 `:17061` 的形参默认值）。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'docs/原版/01-原版源码/panel/js/app.v4.js')
const OUT = resolve(ROOT, 'docs/生成/jsx派发表.json')
/** 名字联合类型（代码侧唯一真相）：`jsxCall` 的形参类型就是它 */
const NAMES = resolve(ROOT, 'src/cep/jsx/names.ts')

const source = readFileSync(SRC, 'utf8')
const lines = source.split('\n')

/** 找到「派发表那一行」（`n.next = n.t0 === "…" ? N : …` 长链） */
function findDispatchTable() {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('n.t0 === "') && lines[i].includes('n.next =')) {
      return { line: i + 1, text: lines[i] }
    }
  }
  return null
}

/** 派发表里每个 `case 号` 块里第一个 `l(...)` 调用（成功文案 / 通道 / 是否读返回） */
function collectCaseBodies(fromLine) {
  const bodies = new Map()
  for (let i = fromLine; i < Math.min(fromLine + 260, lines.length); i++) {
    const caseMatch = /^\s*case (\d+):\s*$/.exec(lines[i])
    if (!caseMatch) continue
    const caseNo = Number(caseMatch[1])
    // 在这个 case 内往后找第一个 l(…)
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      if (/^\s*case \d+:/.test(lines[j])) break
      const call = /\bl\("([^"]+)"(?:,\s*"([^"]*)")?(?:,\s*"([^"]*)")?(?:,\s*(true|false))?\)/.exec(
        lines[j],
      )
      if (call) {
        bodies.set(caseNo, {
          name: call[1],
          successText: call[2] ?? '',
          channel: call[3] ?? 'jsxHistory',
          readsResult: call[4] === 'true',
          line: j + 1,
        })
        break
      }
    }
  }
  return bodies
}

const table = findDispatchTable()
if (!table) {
  console.error(
    '[jsx-dispatch] 找不到派发表那一行（`n.t0 === "…" ? N`）——源码结构可能变了，先修本脚本的解析规则',
  )
  process.exit(2)
}
const bodies = collectCaseBodies(table.line)

const dispatch = []
for (const m of table.text.matchAll(/n\.t0 === "([^"]+)" \? (\d+)/g)) {
  const key = m[1]
  const caseNo = Number(m[2])
  const body = bodies.get(caseNo) ?? null
  dispatch.push({
    key,
    caseNo,
    jsxName: body?.name ?? key,
    successText: body?.successText ?? '',
    channel: body?.channel ?? 'jsxHistory',
    readsResult: body?.readsResult ?? false,
    line: table.line,
    bodyLine: body?.line ?? null,
  })
}

/** 全库调用点：页面/组件直接调 jsx 时用的名字（覆盖不经派发表的那些） */
const calls = []
// 名字字符集含 `.`：官方里有带点的 jsx 名（`app.v4.js:42096`
// `t.$cep.jsxNoCheck("AppPreferences.typeUnits", [])`）。只认 `[A-Za-z0-9_]+` 时它永远进不了名单，
// 于是我方同名的调用被判成"编的名字"——名字其实是对的，只是含点（假阴性）。
const NAME = '[A-Za-z0-9_.]+'
const callRe = new RegExp(
  `\\.(jsx|jsxHistory|jsxNoCheck|jsxHistoryNoCheck)\\("(${NAME})"|evalScript\\("(${NAME})\\(`,
  'g',
)
for (let i = 0; i < lines.length; i++) {
  for (const m of lines[i].matchAll(callRe)) {
    calls.push({ name: m[2] ?? m[3], channel: m[1] ?? 'evalScript', line: i + 1 })
  }
}
const callsByName = new Map()
for (const c of calls) {
  const prev = callsByName.get(c.name)
  if (!prev || c.line < prev.line) callsByName.set(c.name, c)
}
const callList = [...callsByName.values()].sort((a, b) => a.name.localeCompare(b.name))

const snapshot = {
  generatedFrom: 'docs/原版/01-原版源码/panel/js/app.v4.js',
  sourceLineCount: lines.length,
  dispatchTableLine: table.line,
  dispatchCount: dispatch.length,
  callCount: callList.length,
  dispatch: dispatch.sort((a, b) => a.key.localeCompare(b.key)),
  calls: callList,
}

const text = JSON.stringify(snapshot, null, 2) + '\n'

/**
 * 名字联合类型（`src/cep/jsx/names.ts`）。
 *
 * **这就是 `jsx:dispatch:check` 那道闸的结构替代物**：名字不再靠"扫源码比对"来守，
 * 而是 `jsxCall(fn: JsxName, …)` 只收这个联合类型 —— 写错一个字母，`vue-tsc` 当场报错，
 * 不需要任何额外步骤。生成物与源码同步由"下次新增名字时编译失败"自然暴露（响的，不是静默的）。
 *
 * 口径：派发表的 `key` 与 `jsxName` **两个都合法**——同一函数的两个入口。
 * 现成的例子：`font.ts:113` 用 `zt_changeTextBranchMerge`（key）、`:114` 用 `zt_textBranchMerge`
 * （jsxName），是同一个函数的两个名字，不是错。
 */
const allNames = [
  ...new Set([
    ...snapshot.dispatch.flatMap((d) => [d.key, d.jsxName]),
    ...snapshot.calls.map((c) => c.name),
  ]),
].sort((a, b) => a.localeCompare(b))

const namesFile = `// 是什么｜替代了什么｜谁在用
// 是什么：jsx 调用名的唯一真相（**生成物，别手改**）。
// 替代了什么：\`npm run jsx:dispatch:check\` 那道"扫源码比对名字"的闸 —— 现在名字由**类型**保证：
//   \`jsxCall(fn: JsxName, …)\` 只收下面这个联合类型，写错一个字母 \`vue-tsc\` 就红。
// 谁在用：\`src/cep/transport.ts\` 的 \`jsxCall\` 签名（域实现 \`src/cep/jsx/*.ts\` 经它调用）。
//
// 生成：\`npm run jsx:dispatch\`（源 = docs/原版/01-原版源码/panel/js/app.v4.js 的派发表 + 全库调用点）
// 口径：派发表的 \`key\` 与 \`jsxName\` 两个都合法（同一函数的两个入口，例：\`zt_changeTextBranchMerge\` /
//   \`zt_textBranchMerge\`，font.ts:113/114 各用一个）。要新增一个名字，先回原版源码核对，再重跑生成。
//
// 派表 ${snapshot.dispatchCount} 条 · 全库调用名 ${snapshot.callCount} 个 · 去重后 ${allNames.length} 个

export type JsxName =
${allNames.map((n) => `  | '${n.replace(/'/g, "\\'")}'`).join('\n')}
`

const check = process.argv.includes('--check')

if (check) {
  if (!existsSync(OUT)) {
    console.error(`[jsx-dispatch] 产物不存在：${OUT}，先跑 npm run jsx:dispatch`)
    process.exit(1)
  }
  const old = readFileSync(OUT, 'utf8')
  const oldNames = existsSync(NAMES) ? readFileSync(NAMES, 'utf8') : null
  if (old !== text || oldNames !== namesFile) {
    console.error(
      '[jsx-dispatch] 产物已过期：与源码重新生成的结果不一致（派发表或 names.ts），跑 npm run jsx:dispatch',
    )
    process.exit(1)
  }
  console.log(
    `[jsx-dispatch] 通过：产物与源码一致（派表 ${snapshot.dispatchCount} 条 / 调用名 ${snapshot.callCount} 个）`,
  )
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, text)
  mkdirSync(dirname(NAMES), { recursive: true })
  writeFileSync(NAMES, namesFile)
  console.log(
    `[jsx-dispatch] 已生成 ${OUT}：派表 ${snapshot.dispatchCount} 条（表在 :${snapshot.dispatchTableLine}）/ 调用名 ${snapshot.callCount} 个`,
  )
  console.log(`[jsx-dispatch] 已生成 ${NAMES}：JsxName 共 ${allNames.length} 个`)
}
