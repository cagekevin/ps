import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-37：`debt.mjs reverify` —— 存量「已解决」的**只读**重判。
 *
 * 为什么需要它：账本里 115 条「已解决」从没被复算过 —— 有凭证的没人跑，
 * 没凭证的也没人指出「你没凭证」。本命令把这件事变成一条随时可重跑的命令，
 * 并且**只报不改**（改不改账本由人决定）。
 *
 * 测试点：
 *  1. 有凭证且声称对得上 → 进「可复用」
 *  2. 有凭证但声称与实跑不符 → 进「数字漂移」，且**改前改后都打出来**（声明 9 / 实跑 3）
 *  3. 无凭证的两类要分开点名：`旧台账迁移` 与 `有结论无命令`（不猜，只标）
 *  4. `--all` 跑完账本**一个字节都不许变**（P0：只读命令真只读）
 *  5. 人工担保（`kind=人工`）不与机验混在一起，单列且带 `by`
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

const GOOD =
  '[已解决 2026-10-25 · 收口 · evidence:v1{cmd=grep -c x count.txt;claim=3;fail=日志;cplx=3→1;impl=真实现}]'
const DRIFT =
  '[已解决 2026-10-25 · 口径窄 · evidence:v1{cmd=grep -c x count.txt;claim=9;fail=日志;cplx=3→1;impl=真实现}]'
const LEGACY = '[已解决 2026-10-25 · 旧台账 D-07 已 done，迁移归档]'
const PROSE = '[已解决 2026-10-25 · 页面链(7ba1d87)：三态分开，4 处已改]'
const MANUAL =
  '[已解决 2026-10-25 · 删冗余 · evidence:v1{kind=人工;by=kevin;why=删掉冗余实现没有可跑命令;claim=删了 3 处;fail=无失败路径（删的是死代码）;cplx=重复份数 3→0;impl=真实现：删前跑过该模块用例}]'

function fixture(rows: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-reverify-'))
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

const ALL_ROWS = [
  row('TD-01-1', GOOD),
  row('TD-01-2', DRIFT),
  row('TD-01-3', LEGACY),
  row('TD-01-4', PROSE),
  row('TD-01-5', MANUAL),
]

describe('debt reverify 存量重判（TD-09-37）', () => {
  it('声称对得上 → 「可复用」', () => {
    const root = fixture([row('TD-01-1', GOOD)])
    const r = run(root, ['reverify', 'TD-01-1'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('可复用')
    expect(r.out).toMatch(/TD-01-1/)
    expect(r.out).toContain('【② 数字漂移（声明 ≠ 实跑）】0 条')
  })

  it('声称与实跑不符 → 「数字漂移」，改前（声明 9）改后（实跑 3）都打出来', () => {
    const root = fixture([row('TD-01-1', DRIFT)])
    const r = run(root, ['reverify', 'TD-01-1'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('数字漂移')
    expect(r.out).toContain('9')
    expect(r.out).toContain('3')
  })

  it('无凭证两类分开点名：旧台账迁移 / 有结论无命令', () => {
    const root = fixture([row('TD-01-3', LEGACY), row('TD-01-4', PROSE)])
    const r = run(root, ['reverify', '--all'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('无凭证待补')
    expect(r.out).toContain('旧台账迁移')
    expect(r.out).toContain('有结论无命令')
    expect(r.out).toContain('TD-01-3')
    expect(r.out).toContain('TD-01-4')
  })

  it('--all 只读：账本字节不变', () => {
    const root = fixture(ALL_ROWS)
    const before = readLedger(root)
    const r = run(root, ['reverify', '--all'])
    expect(r.code).toBe(0)
    expect(readLedger(root)).toBe(before)
  })

  it('人工担保单列且带 by，不与机验混算', () => {
    const root = fixture([row('TD-01-1', GOOD), row('TD-01-5', MANUAL)])
    const r = run(root, ['reverify', '--all'])
    expect(r.out).toContain('人工担保')
    expect(r.out).toContain('kevin')
    expect(r.out).toContain('可复用（')
  })
})
