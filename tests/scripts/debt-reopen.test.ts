import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-38：`debt.mjs reopen` —— **撤销结账**（`resolve` 的严格反向）。
 *
 * 为什么需要它：`reverify` 判出 121 条已结账**无凭证**（39 旧台账迁移 + 80 有结论无命令 +
 * 2 无结论无命令），用户定案「无凭证的一律降级回 `待还`」。但 `resolve` 的凭证闸是
 * **无条件**的 —— 连 `--status 待还` 也要凭证，语义上错了：**降级不是结账，是撤销结账**，
 * 它的凭证就是 `reverify` 的输出。
 *
 * 两条口径（2026-10-25 用户定案）：
 *  · **只许降 `已解决`**：`已裁定非债` / `不做` / `已退役` 是**人的裁定**，不是"我说它修好了"，
 *    降级它们 = 把裁定翻掉、复活明确判过的东西。裁定不需要机器凭证 —— 它是判断，不是声明。
 *  · **降级必须搬回主表**：归档行降完仍是归档行 ⇒ `debt list` 默认看不见 = **假降级**
 *    （账本说它待还，而没人看得见）。
 *
 * 测试点（写码前先列）：
 *  1. 缺 `--why` → 拒（exit 1），账本零改动（P0：降级必须有理由，否则等于无声抹账）
 *  2. **带凭证的已解决债不许 reopen** → 拒 + 列出 ID，账本零改动（有凭证 = 可复算，降它就是删真账）
 *  3. **单向**：对 `待还` 行 reopen → 拒，并指路「反向走 resolve（要凭证）」
 *  4. 正常降级：状态格变 `[待还 <date> · 凭证缺失 · <why>]`，`debt search 凭证缺失` 能一次拉全
 *  5. `--dry` 只预览不落盘（字节不变），且打出改前 / 改后
 *  6. `--from-reverify` 直接吃 reverify 的判定：只选无凭证那批（按分组），带凭证的行不在里面
 *  7. **裁定类（已裁定非债 / 不做）不许降级**：`--from-reverify` 排除并列出 ID；显式点名 → 报错指路 edit
 *  8. **归档行降级后出现在主表**（搬回），归档计数跟着减 ⇒ `debt list` 看得见
 */

const SCRIPT = resolve(__dirname, '../../scripts/debt.mjs')

const HEADER = [
  '# 债务账本（夹具）',
  '',
  '| TD-ID | 区域 | 现象摘要 | 归类 | 利息率 | 状态 | 锚点 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
]

const row = (id: string, status: string): string =>
  `| ${id} | 01 测试区 | 夹具债 ${id} | 增债 | 中 | ${status} | — |`

const TODO = '[待还]'
const LEGACY = '[已解决 2026-10-25 · 旧台账 D-07 已 done，迁移归档]'
const PROSE = '[已解决 2026-10-25 · 页面链(7ba1d87)：三态分开，4 处已改]'
const WITH_EV =
  '[已解决 2026-10-25 · 收口 · evidence:v1{cmd=grep -c x count.txt;claim=3;fail=日志;cplx=3→1;impl=真实现}]'
/** 裁定类：**不是"我说它修好了"**，是人的判断 ⇒ 不许被降级 */
const RULING = '[已裁定非债 2026-10-24 · 实码 9 个全在 CepError 枚举内，无枚举外语义码被静默吞]'
const NO_DO = '[不做 2026-10-24 · 撞冻结页，做它不划算]'

const ARCH_HEAD = (n: number): string[] => [
  '# 债务账本 · 归档（已解决 / 已裁定 / 已退役 / 不做）',
  '',
  `> 最近更新：2026-10-24 ｜ 归档 ${n} 条`,
  '',
  '## 已登记债',
  '',
  '| TD-ID | 区域 | 现象摘要 | 归类 | 利息率 | 状态 | 锚点 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
]

function fixture(rows: string[], archRows: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-reopen-'))
  const dir = join(root, 'daily', '架构日志')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '债务.md'), [...HEADER, ...rows, ''].join('\n'), 'utf8')
  if (archRows.length)
    writeFileSync(
      join(dir, '债务-归档.md'),
      [...ARCH_HEAD(archRows.length), ...archRows, ''].join('\n'),
      'utf8',
    )
  writeFileSync(join(root, 'count.txt'), 'x\nx\nx\n', 'utf8')
  return root
}

const readLedger = (root: string): string =>
  readFileSync(join(root, 'daily', '架构日志', '债务.md'), 'utf8')
const readArchive = (root: string): string =>
  readFileSync(join(root, 'daily', '架构日志', '债务-归档.md'), 'utf8')

function run(root: string, args: string[]): { code: number; out: string } {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [SCRIPT, ...args, `--root=${root}`], {
        encoding: 'utf8',
      }),
    }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

const WHY = 'reverify: 无凭证（旧台账迁移）'

describe('debt reopen 撤销结账（TD-09-38）', () => {
  it('缺 --why → 拒，账本零改动', () => {
    const root = fixture([row('TD-01-2', LEGACY)])
    const before = readLedger(root)
    const r = run(root, ['reopen', 'TD-01-2'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('--why')
    expect(readLedger(root)).toBe(before)
  })

  it('带凭证的已结债不许 reopen：拒改并列出 ID', () => {
    const root = fixture([row('TD-01-4', WITH_EV)])
    const before = readLedger(root)
    const r = run(root, ['reopen', 'TD-01-4', '--why', WHY])
    expect(r.code).toBe(1)
    expect(r.out).toContain('TD-01-4')
    expect(r.out).toContain('凭证')
    expect(readLedger(root)).toBe(before)
  })

  it('单向：待还 行不能走 reopen（反向必须走 resolve 且过凭证闸）', () => {
    const root = fixture([row('TD-01-1', TODO)])
    const before = readLedger(root)
    const r = run(root, ['reopen', 'TD-01-1', '--why', WHY])
    expect(r.code).toBe(1)
    expect(r.out).toContain('resolve')
    // 必须命中**单向判据**那条报错，而不是"命令不存在 → 打印帮助"也算通过
    expect(r.out).toContain('只做')
    expect(r.out).not.toContain('债务账本读写唯一入口')
    expect(readLedger(root)).toBe(before)
  })

  it('正常降级：状态格变 [待还 <date> · 凭证缺失 · why]', () => {
    const root = fixture([row('TD-01-2', LEGACY)])
    const r = run(root, ['reopen', 'TD-01-2', '--why', WHY])
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toMatch(/\[待还 \d{4}-\d{2}-\d{2} · 凭证缺失 · reverify: 无凭证（旧台账迁移）\]/)
    // `debt search 凭证缺失` 要能一次拉全
    const s = run(root, ['search', '凭证缺失', '--all'])
    expect(s.out).toContain('TD-01-2')
  })

  it('--dry 只预览不落盘，并打出改前改后', () => {
    const root = fixture([row('TD-01-2', LEGACY)])
    const before = readLedger(root)
    const r = run(root, ['reopen', 'TD-01-2', '--why', WHY, '--dry'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('旧台账')
    expect(r.out).toContain('凭证缺失')
    expect(readLedger(root)).toBe(before)
  })

  it('--from-reverify --dry：只选无凭证那批（分组），带凭证的不动也不落盘', () => {
    const root = fixture([
      row('TD-01-2', LEGACY),
      row('TD-01-3', PROSE),
      row('TD-01-4', WITH_EV),
      row('TD-01-1', TODO),
    ])
    const before = readLedger(root)
    const r = run(root, ['reopen', '--from-reverify', '--dry'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('旧台账迁移')
    expect(r.out).toContain('有结论无命令')
    expect(r.out).toContain('TD-01-2')
    expect(r.out).toContain('TD-01-3')
    expect(r.out).not.toContain('TD-01-4')
    expect(r.out).not.toContain('TD-01-1')
    expect(readLedger(root)).toBe(before)
  })

  it('裁定类不许降级：--from-reverify 排除它们并列出 ID', () => {
    const root = fixture([row('TD-01-2', LEGACY), row('TD-01-5', RULING), row('TD-01-6', NO_DO)])
    const before = readLedger(root)
    const r = run(root, ['reopen', '--from-reverify', '--dry'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('排除')
    expect(r.out).toContain('TD-01-5')
    expect(r.out).toContain('TD-01-6')
    expect(readLedger(root)).toBe(before)

    // 真跑：已解决 那条降级，裁定类**一个字节不动**
    const real = run(root, ['reopen', '--from-reverify'])
    expect(real.code).toBe(0)
    const after = readLedger(root)
    expect(after).toMatch(/TD-01-2[^\n]*\[待还 /)
    expect(after).toContain('夹具债 TD-01-5 | 增债 | 中 | [已裁定非债')
    expect(after).toContain('夹具债 TD-01-6 | 增债 | 中 | [不做')
  })

  it('显式点名一条裁定类 → 报错并指路 edit 改判', () => {
    const root = fixture([row('TD-01-5', RULING)])
    const before = readLedger(root)
    const r = run(root, ['reopen', 'TD-01-5', '--why', WHY])
    expect(r.code).toBe(1)
    expect(r.out).toContain('裁定')
    expect(r.out).toContain('edit')
    expect(readLedger(root)).toBe(before)
  })

  it('归档行降级 → **搬回主表**（假降级 = 看不见的待办）', () => {
    const root = fixture([], [row('TD-01-9', LEGACY)])
    const beforeArch = readArchive(root)
    expect(beforeArch).toContain('TD-01-9')

    const dryRun = run(root, ['reopen', 'TD-01-9', '--why', WHY, '--dry'])
    expect(dryRun.code).toBe(0)
    expect(dryRun.out).toContain('搬回主表')
    expect(readArchive(root)).toBe(beforeArch)

    const r = run(root, ['reopen', 'TD-01-9', '--why', WHY])
    expect(r.code).toBe(0)
    // 主表里有它（`debt list` 默认就能看见）
    expect(readLedger(root)).toMatch(/TD-01-9[^\n]*\[待还 /)
    // 归档里没有它了，且归档计数跟着减
    expect(readArchive(root)).not.toContain('TD-01-9')
    expect(readArchive(root)).toContain('归档 0 条')
    expect(run(root, ['list']).out).toContain('TD-01-9')
  })
})
