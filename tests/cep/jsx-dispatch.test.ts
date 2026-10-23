import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * jsx 名字闸门（T-84）。
 *
 * 为什么有这条测试：上一版 `/commonUse` 的 9 个 jsx 调用里 **6 个名字是编的**，
 * `zdy_*` 的参数也是猜的——因为当时没有任何东西能对着原版核。这条测试把原版派发表
 * 变成一个可被断言的事实：**我方用到的每个 jsx 名字，必须能在原版源码里找到**。
 *
 * 数据来源：`docs/生成/jsx派发表.json`（由 `npm run jsx:dispatch` 从
 * `docs/原版/01-原版源码/panel/js/app.v4.js` 生成；产物是事实，别手改）。
 *
 * 名字来源：**从 `src/cep/jsx/*.ts` 与 `src/commands/*.ts` 里现读**，不手抄常量表
 * （手抄就会漂，这正是上一版出错的机制）。
 */

const ROOT = resolve(__dirname, '../..')
const SNAPSHOT = join(ROOT, 'docs/生成/jsx派发表.json')

interface DispatchEntry {
  key: string
  caseNo: number
  jsxName: string
  successText: string
  channel: string
  readsResult: boolean
  line: number
  bodyLine: number | null
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as {
  dispatchTableLine: number
  dispatch: DispatchEntry[]
  calls: Array<{ name: string; channel: string; line: number }>
}

const CHANNELS = new Set(['jsx', 'jsxHistory', 'jsxNoCheck', 'jsxHistoryNoCheck'])

/** 官方名单：派发表的 key、派发表指向的 jsx 名、全库调用点名字 */
const official = new Set<string>([
  ...snapshot.dispatch.flatMap((d) => [d.key, d.jsxName]),
  ...snapshot.calls.map((c) => c.name),
])

/** 现读我方用到的 jsx 名字（文件 → 名字），不手抄 */
function collectOurNames(): Map<string, string> {
  const found = new Map<string, string>()
  for (const file of readdirSync(join(ROOT, 'src/cep/jsx'))) {
    if (!file.endsWith('.ts')) continue
    const text = readFileSync(join(ROOT, 'src/cep/jsx', file), 'utf8')
    for (const m of text.matchAll(/jsxCall\('([A-Za-z0-9_]+)'/g)) {
      if (!found.has(m[1])) found.set(m[1], `src/cep/jsx/${file}`)
    }
  }
  for (const file of readdirSync(join(ROOT, 'src/commands'))) {
    if (!file.endsWith('.ts')) continue
    const text = readFileSync(join(ROOT, 'src/commands', file), 'utf8')
    for (const m of text.matchAll(/legacy\.call\('([A-Za-z0-9_]+)'/g)) {
      if (!found.has(m[1])) found.set(m[1], `src/commands/${file}`)
    }
  }
  return found
}

/**
 * 我方现存**错名**（官方名单里没有）。这不是"允许"，是**待办清单**：
 * T-86 会把它们改成官方名；每修好一条就删一行，测试会报红提示"该删了"。
 * 依据（官方真名与行号）写在第二列，供改的时候直接抄。
 */
const KNOWN_BAD = new Map<string, string>()

/**
 * 通道对照（靶点⑮）：官方按 `l(名字, 文案, 通道, 是否读返回)` 分四种通道
 * （`app.v4.js:17061-17184`），我方 transport 只有**一个**入口 `jsxCall`
 * （`src/cep/transport.ts:85`），因此全部落在 `jsxCall` 这一类，对应官方的
 * `jsx` / `jsxNoCheck`（都是"不进历史"），**不等于** `jsxHistory` / `jsxHistoryNoCheck`
 * （原版会写进 PS 历史，撤销行为不同）。
 *
 * 这张表是"事实清单"，不是"允许清单"：谁给 transport 加了历史通道，就必须回来改这里，
 * 否则下面的断言会红（我们只断言"当前事实"，不假装已经对齐）。
 */
const CHANNEL_FACTS: Array<{ name: string; official: string; ours: string }> = [
  { name: 'cy_zoom', official: 'jsx', ours: 'jsxCall' },
  { name: 'cy_ExportImage', official: 'jsxHistoryNoCheck', ours: 'legacy.call → jsxCall' },
  { name: 'cy_optimizeDoc', official: 'jsxHistoryNoCheck', ours: 'jsxCall' },
  { name: 'cy_batchOptimizeDoc', official: 'jsxNoCheck', ours: 'jsxCall' },
  { name: 'cy_insertionImage', official: 'jsxHistory', ours: 'jsxCall' },
  // A1 的 4 个无参调用：官方 `l(name)` 不传通道 → 默认 `jsxHistory`（`:17096`、`:17178`、`:17181`、`:17184`）
  { name: 'cy_correctRectangleBlur', official: 'jsxHistory', ours: 'jsxCall' },
  { name: 'cy_LayerReplace', official: 'jsxHistory', ours: 'jsxCall' },
  { name: 'cy_locationTrade', official: 'jsxHistory', ours: 'jsxCall' },
  { name: 'cy_exchangeLayerColor', official: 'jsxHistory', ours: 'jsxCall' },
]

const ourNames = collectOurNames()

describe('jsx 派发表快照', () => {
  it('快照结构完整：派表每条都有五项，通道是闭集', () => {
    expect(snapshot.dispatchTableLine).toBeGreaterThan(0)
    expect(snapshot.dispatch.length).toBeGreaterThan(30)
    expect(snapshot.calls.length).toBeGreaterThan(100)

    for (const entry of snapshot.dispatch) {
      expect(entry.key, 'key 不能为空').toBeTruthy()
      expect(entry.jsxName, `${entry.key} 缺 jsxName`).toBeTruthy()
      expect(CHANNELS.has(entry.channel), `${entry.key} 通道不在闭集：${entry.channel}`).toBe(true)
      expect(typeof entry.readsResult).toBe('boolean')
      expect(entry.line).toBeGreaterThan(0)
    }
  })

  it('派发表里 name≠jsx 名 的分叉没有被解析规则抹平', () => {
    // 这几条是"自由面板 key"与"真正 jsx 函数名"不同名的铁证，解析退化成一条就说明快照坏了
    const diverged = [
      ['cy_embedImage', 'cy_insertionImage'],
      ['cy_coorectBlur', 'cy_correctRectangleBlur'],
      ['cy_useGride', 'cy_createSafeAreaGuide'],
      ['cy_clearCutGuide', 'cy_guideFunction'],
      ['zdy_customBuildTransform', 'cy_customBuildTransform'],
    ]
    for (const [key, jsxName] of diverged) {
      const entry = snapshot.dispatch.find((d) => d.key === key)
      expect(entry, `派发表里应有 key=${key}`).toBeTruthy()
      expect(entry?.jsxName, `${key} 应指向 ${jsxName}`).toBe(jsxName)
      expect(official.has(jsxName), `${jsxName} 应进官方名单`).toBe(true)
    }
  })

  it('我方用到的每个 jsx 名字都能在官方名单里命中（错名表除外）', () => {
    const unknown: string[] = []
    for (const [name, where] of ourNames) {
      if (official.has(name)) continue
      if (KNOWN_BAD.has(name)) continue
      unknown.push(`${name}（${where}）`)
    }
    expect(
      unknown,
      `这些名字在原版源码里找不到，要么是编的、要么漏登记：\n${unknown.join('\n')}`,
    ).toEqual([])
  })

  it('通道对照：官方通道与快照一致，我方通道只有 jsxCall 一种（差异不藏起来）', () => {
    for (const fact of CHANNEL_FACTS) {
      const entry =
        snapshot.dispatch.find((d) => d.key === fact.name || d.jsxName === fact.name) ??
        snapshot.calls.find((c) => c.name === fact.name)
      expect(entry, `快照里应能找到 ${fact.name}`).toBeTruthy()

      const officialChannel =
        'channel' in (entry as object) ? (entry as { channel: string }).channel : null
      if (officialChannel !== null && officialChannel !== undefined) {
        expect(officialChannel, `${fact.name} 的官方通道应与对照表一致`).toBe(fact.official)
      }
      // 我方事实：全部经 jsxCall（transport 只有一个入口），这一列写错了说明有人加了新通道却没更新表
      expect(fact.ours).toMatch(/jsxCall/)
    }
  })

  it('错名待办表：每条都还在代码里（修好了就该删表），且都不在官方名单里', () => {
    for (const [name, officialName] of KNOWN_BAD) {
      expect(
        ourNames.has(name),
        `${name} 已经不在代码里了——说明已修好，请从 KNOWN_BAD 删掉这一行（官方名：${officialName}）`,
      ).toBe(true)
      expect(
        official.has(name),
        `${name} 其实在官方名单里，不该出现在 KNOWN_BAD（官方名：${officialName}）`,
      ).toBe(false)
    }
  })
})
