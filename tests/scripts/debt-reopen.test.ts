import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-38：`debt.mjs reopen` —— **撤销结账**（`resolve` 的严格反向）。
 *
 * 为什么需要它：`reverify` 判出 121 条已结账**无凭证**（39 旧台账迁移 + 80 有结论无命令 +
 * 2 无结论无命令），用户已定案「无凭证的一律降级回 `待还`」。但 `resolve` 的凭证闸是
 * **无条件**的 —— 连 `--status 待还` 也要凭证，语义上错了：**降级不是结账，是撤销结账**，
 * 它的凭证就是 `reverify` 的输出。
 *
 * 测试点（写码前先列）：
 *  1. 缺 `--why` → 拒（exit 1），账本零改动（P0：降级必须有理由，否则等于无声抹账）
 *  2. **带凭证的已解决债不许 reopen** → 拒 + 列出 ID，账本零改动（有凭证 = 可复算，降它就是删真账）
 *  3. **单向**：对 `待还` 行 reopen → 拒，并指路「反向走 resolve（要凭证）」
 *  4. 正常降级：状态格变 `[待还 <date> · 凭证缺失 · <why>]`，`debt search 凭证缺失` 能一次拉全
 *  5. `--dry` 只预览不落盘（字节不变），且打出改前 / 改后
 *  6. `--from-reverify` 直接吃 reverify 的判定：只选无凭证那批（按 旧台账迁移 / 有结论无命令 分组），
 *     带凭证的行**不在**里面、也不会被改
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

function fixture(rows: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-reopen-'))
  mkdirSync(join(root, 'daily', '架构日志'), { recursive: true })
  writeFileSync(
    join(root, 'daily', '架构日志', '债务.md'),
    [...HEADER, ...rows, ''].join('\n'),
    'utf8',
  )
  writeFileSync(join(root, 'count.txt'), 'x\nx\nx\n', 'utf8')
  return root
}

const readLedger = (root: string): string =>
  readFileSync(join(root, 'daily', '架构日志', '债务.md'), 'utf8')

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
})
