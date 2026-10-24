import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-09-37：`debt.mjs resolve` 的**结账闸** —— 没有凭证 / 凭证跑不出声称 ⇒ 拒写。
 *
 * 为什么需要它（2026-10-25 全量复算）：账本 115 条「已解决」里 39 条零凭证、
 * 76 条只有散文数字（19 条假或口径窄）。根因不是有人算错，是**「结账」这个动作没有门槛**
 * —— 写进去就永久有效，从没人复算。这里把门槛钉住：
 *
 * 测试点（写码前先列，见 `docs/规范/测试规范.md`）：
 *  1. 无 `--evidence` 的 resolve → exit 1、报错带**可直接填空的模板**、账本**一个字节都不许变**（P0：假结账）
 *  2. 凭证命令跑得动但**跑不出声称的数字** → exit 1、账本不变（P0：口径窄/假数字）
 *  3. 凭证只给一半（缺三问里的 `fail`）→ exit 1（P0：三问不许空着）
 *  4. 凭证命令是**写命令**（`rm -`）→ exit 1（凭证要被反复复算，不许带写副作用）
 *  5. 完整凭证 → exit 0、状态格里落下 `evidence:v1{…}`，且 `reverify` 能把它复算成「可复用」
 *  6. 人工降级：`kind=人工` 缺 `by` → exit 1；给了 `by` + `why` → 落账，且 `reverify` **单列**在「人工担保」
 *
 * 断言的是**可观察结果**（退出码 / 报错文案 / 账本字节），不是内部实现：
 * 跑真脚本、给 `--root=<夹具>`（与 `stats.mjs` / `layer-boundary.mjs` 同款口径）。
 */

const SCRIPT = resolve(__dirname, '../../scripts/debt.mjs')

const HEADER = [
  '# 债务账本（夹具）',
  '',
  '| TD-ID | 区域 | 现象摘要 | 归类 | 利息率 | 状态 | 锚点 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
]

const PENDING = '| TD-01-1 | 01 测试区 | 夹具债：待还 | 增债 | 中 | [待还] | — |'

/** 夹具根：账本 + 一个 `grep -c` 能数出 3 的文件（凭证命令的已知答案） */
function fixture(rows: string[] = [PENDING]): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-gate-'))
  mkdirSync(join(root, 'daily', '架构日志'), { recursive: true })
  writeFileSync(
    join(root, 'daily', '架构日志', '债务.md'),
    [...HEADER, ...rows, ''].join('\n'),
    'utf8',
  )
  writeFileSync(join(root, 'count.txt'), 'x\nx\nx\n', 'utf8')
  return root
}

const ledgerPath = (root: string): string => join(root, 'daily', '架构日志', '债务.md')
const readLedger = (root: string): string => readFileSync(ledgerPath(root), 'utf8')

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

/** 一条完整的机验凭证（`grep -c x count.txt` 实跑 = 3） */
const GOOD =
  'cmd=grep -c x count.txt;claim=3;fail=页面 error 内联 + 日志;cplx=重复份数 3→1;impl=真实现'

describe('debt resolve 结账闸（TD-09-37）', () => {
  it('没有凭证 → 拒写，报错给出可复制填空的模板，账本零改动', () => {
    const root = fixture()
    const before = readLedger(root)
    const r = run(root, ['resolve', 'TD-01-1', '--note', '改好了'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('没有凭证')
    // 模板必须能直接抄：五个键 + 一条完整的示例命令
    expect(r.out).toContain('cmd=')
    expect(r.out).toContain('claim=')
    expect(r.out).toContain('cplx=')
    expect(r.out).toContain('--evidence "cmd=')
    expect(readLedger(root)).toBe(before)
  })

  it('凭证命令跑得出、但跑不出声称的数字 → 拒写，账本零改动', () => {
    const root = fixture()
    const before = readLedger(root)
    const r = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'cmd=grep -c x count.txt;claim=99;fail=页面 error 内联;cplx=重复份数 3→1;impl=真实现',
    ])
    expect(r.code).toBe(1)
    expect(r.out).toContain('对不上')
    expect(r.out).toContain('99')
    expect(readLedger(root)).toBe(before)
  })

  it('三问缺项（没有 fail）→ 拒写', () => {
    const root = fixture()
    const before = readLedger(root)
    const r = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'cmd=grep -c x count.txt;claim=3;cplx=重复份数 3→1;impl=真实现',
    ])
    expect(r.code).toBe(1)
    expect(r.out).toContain('fail')
    expect(readLedger(root)).toBe(before)
  })

  it('凭证命令是写命令（rm -）→ 拒写（凭证要被反复复算，不许带写副作用）', () => {
    const root = fixture()
    const before = readLedger(root)
    const r = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'cmd=rm -rf count.txt;claim=0;fail=页面 error 内联;cplx=重复份数 3→1;impl=真实现',
    ])
    expect(r.code).toBe(1)
    expect(r.out).toContain('只读')
    expect(r.out).not.toContain('太短')
    expect(readLedger(root)).toBe(before)
  })

  it('完整凭证 → 落账，状态格带 evidence:v1{…}，reverify 能复算成「可复用」', () => {
    const root = fixture()
    const r = run(root, ['resolve', 'TD-01-1', '--note', '收口到唯一实现', '--evidence', GOOD])
    expect(r.code).toBe(0)
    const after = readLedger(root)
    expect(after).toContain('evidence:v1{')
    expect(after).toContain('[已解决')
    expect(after).toContain('claim=3')

    const rv = run(root, ['reverify', 'TD-01-1'])
    expect(rv.code).toBe(0)
    expect(rv.out).toContain('可复用')
    expect(rv.out).toContain('TD-01-1')
  })

  it('人工降级必须有名有姓：缺 by 拒写，给了 by+why 才落账并单列', () => {
    const root = fixture()
    const before = readLedger(root)
    const noBy = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'kind=人工;why=删掉冗余实现，没有可跑命令;claim=删了 3 处;fail=无失败路径（删的是死代码）;cplx=重复份数 3→0;impl=真实现：删前跑过该模块用例',
    ])
    expect(noBy.code).toBe(1)
    expect(noBy.out).toContain('by')
    expect(readLedger(root)).toBe(before)

    const ok = run(root, [
      'resolve',
      'TD-01-1',
      '--evidence',
      'kind=人工;by=kevin;why=删掉冗余实现，没有可跑命令;claim=删了 3 处;fail=无失败路径（删的是死代码）;cplx=重复份数 3→0;impl=真实现：删前跑过该模块用例',
    ])
    expect(ok.code).toBe(0)
    expect(readLedger(root)).toContain('kind=人工')

    const rv = run(root, ['reverify', 'TD-01-1'])
    expect(rv.out).toContain('人工担保')
    expect(rv.out).toContain('kevin')
  })
})
