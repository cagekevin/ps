import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-40：`edit --field solution` 是**另一个销毁口** —— 改一个字段，把历史抹了。
 *
 * 背景：`reopen` 把原结账句搬进 `原记「…」`（TD-09-38）。但 `edit --field solution` 会把状态格
 * 重写成 `[状态词 · 新解法]`，`原记` 连同整段口径一起被冲掉 —— 与刚修的那个病同一个：
 * **改一个字段，把历史抹了**。
 *
 * 口径：
 *  · `edit --field solution` 只替换"解法"那一段，`原记「…」` 与 `evidence:v1{…}` **逐字保留**；
 *  · 新解法与旧 `原记` 冲突（自带 `原记「`/`」`、自带凭证、或已包含原文）⇒ **不猜、不顺手销毁**，
 *    报错要求显式 `--drop-original`；
 *  · `summary` / `rate` / `classify` 不碰状态格 ⇒ 天然不动 `原记`（回归保护）。
 *
 * 测试点：
 *  1. 改解法后 `原记「…」` **逐字还在**（含长句末尾标记，未截断）
 *  2. 改解法后 `evidence:v1{…}` **还在**（凭证不跟着解法一起被冲掉）
 *  3. 新解法已包含旧原文（= 重写整句）→ 拒写，账本零改动
 *  4. `--drop-original` = 显式销毁：成功、原文消失、且**打印丢掉了什么**
 *  5. `summary` / `rate` 不动状态格（`原记` / 凭证原样）
 *  6. 没有 `原记` 的普通行：改解法行为与改前一致（零炸）
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

/** reopen 产出的形状：`原记` 里带长句 + 末尾标记 */
const WITH_ORIG = `[待还 2026-10-25 · 凭证缺失 · reverify: 无凭证（旧台账迁移） · 原记「已修：page-boundary.mjs 由两档改三档——写出口硬黑名单、只读白名单按来源+导出名，未登记即拦；补 6 例。末尾锚点 TAIL_MARK_42」]`
/** 结账形状：带机验凭证 */
const WITH_EV =
  '[已解决 2026-10-25 · 收口 · evidence:v1{cmd=grep -c x count.txt;claim=3;fail=日志;cplx=3→1;impl=真实现}]'
const PLAIN = '[已解决 2026-10-25 · 收口到唯一实现]'

function fixture(rows: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-edit-'))
  const dir = join(root, 'daily', '架构日志')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '债务.md'), [...HEADER, ...rows, ''].join('\n'), 'utf8')
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

const editSolution = (root: string, id: string, value: string, ...extra: string[]) =>
  run(root, ['edit', id, '--field', 'solution', '--value', value, ...extra])

describe('debt edit 不许抹掉原记（TD-09-40）', () => {
  it('改解法后 `原记「…」` 逐字还在（长句不截断）', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const r = editSolution(root, 'TD-01-1', '新的解法：收口到唯一实现')
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('新的解法：收口到唯一实现')
    expect(after).toContain('原记「已修：page-boundary.mjs 由两档改三档')
    expect(after).toContain('末尾锚点 TAIL_MARK_42')
  })

  it('改解法后 `evidence:v1{…}` 还在', () => {
    const root = fixture([row('TD-01-2', WITH_EV)])
    const r = editSolution(root, 'TD-01-2', '换了说法')
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('换了说法')
    expect(after).toContain('evidence:v1{cmd=grep -c x count.txt;claim=3')
  })

  it('新解法已包含旧原文（重写整句）→ 拒写，账本零改动', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const before = readLedger(root)
    const r = editSolution(root, 'TD-01-1', '已修：page-boundary.mjs 由两档改三档——写出口硬黑名单')
    expect(r.code).toBe(1)
    expect(r.out).toContain('--drop-original')
    expect(readLedger(root)).toBe(before)
  })

  it('--drop-original = 显式销毁：成功、原文消失、且打印丢掉了什么', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const r = editSolution(root, 'TD-01-1', '重写整句：已修 page-boundary', '--drop-original')
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('重写整句：已修 page-boundary')
    expect(after).not.toContain('TAIL_MARK_42')
    // 销毁必须喊出来（不是悄悄放行）
    expect(r.out).toContain('TAIL_MARK_42')
    expect(r.out).toContain('drop-original')
  })

  it('summary / rate 不动状态格（原记与凭证原样）', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG), row('TD-01-2', WITH_EV)])
    expect(run(root, ['edit', 'TD-01-1', '--field', 'summary', '--value', '新摘要']).code).toBe(0)
    expect(run(root, ['edit', 'TD-01-2', '--field', 'rate', '--value', '低']).code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('新摘要')
    expect(after).toContain('TAIL_MARK_42')
    expect(after).toContain('evidence:v1{cmd=grep -c x count.txt;claim=3')
  })

  it('没有 `原记` 的普通行：改解法照旧（零炸）', () => {
    const root = fixture([row('TD-01-3', PLAIN)])
    const r = editSolution(root, 'TD-01-3', '收口到唯一实现')
    expect(r.code).toBe(0)
    expect(readLedger(root)).toContain('[已解决 2026-10-25 · 收口到唯一实现]')
  })
})
