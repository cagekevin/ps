import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-41：`resolve` 也要保 `原记` —— 补凭证时不许把刚救回来的历史又冲掉。
 *
 * 背景：降级（`reopen`）把 115 条的原结账句搬进了 `原记「…」`。接下来要给「有结论无命令」
 * 那批**补凭证**（= 重新 `resolve`）。如果 `resolve` 一结账就把 `原记` 冲掉，
 * 等于**一边修销毁口，一边用另一个命令销毁同一批历史**。
 *
 * 原则与 `edit` 完全对称：**不销毁历史是默认，销毁要显式**。
 *  1. 默认保：`[<状态词> <日期> · <新 note> · evidence:v1{…} · 原记「<原文>」]`，原文一字不少
 *  2. 要丢必须 `--drop-original`，成功并**打印被丢掉的原文**
 *  3. 没有 `原记` 的行行为逐字不变
 *  4. 凭证闸一点不松：带 `原记` 也不能免凭证
 *
 * 测试点：
 *  1. resolve 后 `原记「…」` 逐字还在（长句末尾标记仍在）
 *  2. 顺序 = `<note> · evidence:v1{…} · 原记「…」`，且 evidence 仍能被 reverify 认出来
 *  3. `--drop-original`：原文消失，且**打印被丢掉的原文**
 *  4. 没有 `原记` 的行：状态格形状与改前一致（无 `原记`）
 *  5. 带 `原记` 也照样要凭证（缺凭证 / 声称对不上 → 拒写，账本零改动）
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

const ORIG =
  '已修：page-boundary.mjs 由两档改三档——写出口硬黑名单、只读白名单按来源+导出名，未登记即拦；补 6 例。末尾锚点 TAIL_MARK_42'
const WITH_ORIG = `[待还 2026-10-25 · 凭证缺失 · reverify: 无凭证（旧台账迁移） · 原记「${ORIG}」]`
const PLAIN = '[待还]'

const GOOD =
  'cmd=grep -c x count.txt;claim=3;fail=页面 error 内联 + 日志;cplx=重复份数 3→1;impl=真实现'

function fixture(rows: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-resolve-orig-'))
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

const resolveIt = (root: string, id: string, ...extra: string[]) =>
  run(root, ['resolve', id, '--note', '收口到唯一实现', '--evidence', GOOD, ...extra])

describe('debt resolve 保原记（TD-09-41）', () => {
  it('resolve 后 `原记「…」` 逐字还在（长句不截断）', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const r = resolveIt(root, 'TD-01-1')
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('[已解决')
    expect(after).toContain('收口到唯一实现')
    expect(after).toContain('原记「已修：page-boundary.mjs 由两档改三档')
    expect(after).toContain('末尾锚点 TAIL_MARK_42')
  })

  it('顺序是 note → evidence → 原记，且 evidence 仍可复算', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    expect(resolveIt(root, 'TD-01-1').code).toBe(0)
    const after = readLedger(root)
    const iNote = after.indexOf('收口到唯一实现')
    const iEv = after.indexOf('evidence:v1{')
    const iOrig = after.indexOf('原记「')
    expect(iNote).toBeGreaterThan(-1)
    expect(iEv).toBeGreaterThan(iNote)
    expect(iOrig).toBeGreaterThan(iEv)
    // 凭证没被 原记 顶掉：reverify 能跑通并判「可复用」
    const rv = run(root, ['reverify', 'TD-01-1'])
    expect(rv.code).toBe(0)
    expect(rv.out).toContain('可复用')
  })

  it('--drop-original = 显式销毁：原文消失且打印丢掉了什么', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const r = resolveIt(root, 'TD-01-1', '--drop-original')
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).not.toContain('TAIL_MARK_42')
    expect(r.out).toContain('TAIL_MARK_42')
    expect(r.out).toContain('drop-original')
  })

  it('没有 `原记` 的行：状态格形状与改前一致', () => {
    const root = fixture([row('TD-01-2', PLAIN)])
    expect(resolveIt(root, 'TD-01-2').code).toBe(0)
    const after = readLedger(root)
    expect(after).toMatch(/\[已解决 \d{4}-\d{2}-\d{2} · 收口到唯一实现 · evidence:v1\{/)
    expect(after).not.toContain('原记「')
  })

  it('带 `原记` 也照样要凭证（缺凭证 / 声称对不上 → 拒写）', () => {
    const root = fixture([row('TD-01-1', WITH_ORIG)])
    const before = readLedger(root)
    expect(run(root, ['resolve', 'TD-01-1', '--note', 'x']).code).toBe(1)
    const bad = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'cmd=grep -c x count.txt;claim=99;fail=页面 error 内联;cplx=重复份数 3→1;impl=真实现',
    ])
    expect(bad.code).toBe(1)
    expect(bad.out).toContain('对不上')
    expect(readLedger(root)).toBe(before)
  })
})
