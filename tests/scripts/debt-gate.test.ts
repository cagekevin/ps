import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `debt.mjs` 的真闸 —— **先红后绿**钉住（账本工具**只留这一个**测试文件）。
 *
 * 测试点（写码前先列，见 `docs/规范/测试规范.md`）：
 *  1. `resolve` 无 `--cmd`/`--claim` → exit 1、报错带可复制填空模板、**账本零改动**（P0：假结账）
 *  2. 命令跑得动但 **claim 对不上** → exit 1、账本零改动（P0：口径窄 / 恒真命令）
 *  3. 完整凭证 → exit 0、状态格落 `验：<cmd> → <claim> · 验法：<how>`、该行搬进归档（P0：分区）
 *  4. `show` / `list` 把凭证显示成「cmd → claim」（不甩原始状态格给人看）
 *  5. `check` 的 6 条各注入一处违规 → exit 1（P0：分区完整性 / 格式）
 *
 * 断言**可观察结果**（退出码 / 报错文案 / 账本字节），跑真脚本 + `--root=<夹具>`。
 */

const SCRIPT = resolve(__dirname, '../../scripts/debt.mjs')
const ANCHOR = '01-字体管理页-2026-10-24.md'
const HEADER = [
  '# 债务账本（夹具）',
  '',
  '| TD-ID | 区域 | 现象摘要 | 归类 | 利息率 | 状态 | 锚点 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
]
const row = (id: string, status: string, rate = '中'): string =>
  `| ${id} | 01 测试区 | 夹具债 | 增债 | ${rate} | ${status} | [${ANCHOR}](./${ANCHOR}) |`

/** 夹具根：账本 + 区域日志（锚点真存在）+ 一个 `grep -c` 能数出 3 的文件 */
function fixture(mainRows: string[] = [row('TD-01-1', '[待还]')], archRows: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), 'debt-gate-'))
  mkdirSync(join(root, 'daily', '架构日志'), { recursive: true })
  const write = (f: string, rows: string[]) =>
    writeFileSync(join(root, 'daily', '架构日志', f), [...HEADER, ...rows, ''].join('\n'), 'utf8')
  write('债务.md', mainRows)
  write('债务-归档.md', archRows)
  writeFileSync(join(root, 'daily', '架构日志', ANCHOR), '# 区域日志（夹具）\n', 'utf8')
  writeFileSync(join(root, 'count.txt'), 'x\nx\nx\n', 'utf8')
  return root
}

const path = (root: string, f: string) => join(root, 'daily', '架构日志', f)
const read = (root: string, f: string) => readFileSync(path(root, f), 'utf8')

function invoke(root: string, args: string[]): { code: number; out: string } {
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

describe('debt resolve 结账闸', () => {
  it('没有凭证 → 拒写，报错给出可复制填空的写法，账本零改动', () => {
    const root = fixture()
    const before = read(root, '债务.md')
    const r = invoke(root, ['resolve', 'TD-01-1', '--note', '改好了'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('缺 `--cmd`')
    expect(r.out).toContain('缺 `--claim`')
    // 模板必须能直接抄：断用例名 + 两条反例
    expect(r.out).toContain('--reporter=verbose')
    expect(r.out).toContain('N passed')
    expect(read(root, '债务.md')).toBe(before)
  })

  it('命令跑得出、但 claim 对不上 → 拒写，账本零改动', () => {
    const root = fixture()
    const before = read(root, '债务.md')
    const r = invoke(root, ['resolve', 'TD-01-1', '--cmd', 'grep -c x count.txt', '--claim', '99'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('claim 对不上')
    expect(r.out).toContain('99')
    expect(read(root, '债务.md')).toBe(before)
  })

  it('凭证命令是写命令（rm -）→ 拒写（凭证不许带写副作用）', () => {
    const root = fixture()
    const before = read(root, '债务.md')
    const r = invoke(root, ['resolve', 'TD-01-1', '--cmd', 'rm -rf count.txt', '--claim', '0'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('只读')
    expect(read(root, '债务.md')).toBe(before)
  })

  it('完整凭证 → 落账「验：<cmd> → <claim> · 验法：<how>」，且该行搬进归档', () => {
    const root = fixture()
    const r = invoke(root, [
      'resolve',
      'TD-01-1',
      '--note',
      '收口到唯一实现',
      '--cmd',
      'grep -c x count.txt',
      '--claim',
      '3',
      '--how',
      '跑只读命令看输出',
    ])
    expect(r.code).toBe(0)
    expect(read(root, '债务.md')).not.toContain('TD-01-1')
    const arch = read(root, '债务-归档.md')
    expect(arch).toContain('[已解决')
    expect(arch).toContain('验：grep -c x count.txt → 3')
    expect(arch).toContain('验法：跑只读命令看输出')
    expect(invoke(root, ['check']).code).toBe(0)
  })
})

describe('debt show / list 读凭证', () => {
  const solvedRow = row(
    'TD-01-9',
    '[已解决 2026-10-25 · 收口 · 验：grep -c x count.txt → 3 · 验法：跑只读命令]',
  )

  it('show：凭证显示成「cmd → claim」+ 验法，不是原始状态格', () => {
    const r = invoke(fixture([], [solvedRow]), ['show', 'TD-01-9'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('验     : grep -c x count.txt → 3')
    expect(r.out).toContain('验法   : 跑只读命令')
  })

  it('list --all：凭证单独一行，不塞进注记', () => {
    const r = invoke(fixture([row('TD-01-1', '[待还]')], [solvedRow]), ['list', '--all'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('验：grep -c x count.txt → 3')
  })
})

describe('debt check 六条', () => {
  it('干净夹具 → 通过', () => {
    const r = invoke(fixture([row('TD-01-1', '[待还]')], [row('TD-01-2', '[已解决]')]), ['check'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('主表 1 条')
  })

  const cases: [string, string[], string[], string[]][] = [
    ['① ID 重复', [row('TD-01-1', '[待还]'), row('TD-01-1', '[待还]')], [], ['① ID 重复']],
    ['② 状态词不在白名单', [row('TD-01-1', '[待翻新]')], [], ['② 状态词不在白名单']],
    ['③ 列数不对', [row('TD-01-1', '[待还]').replace('夹具债', '夹具债 | 多段')], [], ['③ 列错位']],
    ['④ 锚点不存在', [row('TD-01-1', '[待还]').replace(ANCHOR, '99-不存在.md')], [], ['④ ']],
    [
      '⑤ 两边都有',
      [row('TD-01-1', '[待还]')],
      [row('TD-01-1', '[已解决]')],
      ['⑤ 同一 ID 两边都有'],
    ],
    [
      '⑥ 分区错位',
      [row('TD-01-1', '[已解决]')],
      [row('TD-01-2', '[待还]')],
      ['⑥ 已结行留在主表', '⑥ 待办行掉进归档'],
    ],
  ]
  for (const [name, main, arch, wants] of cases) {
    it(`${name} → 红`, () => {
      const r = invoke(fixture(main, arch), ['check'])
      expect(r.code).toBe(1)
      for (const w of wants) expect(r.out).toContain(w)
    })
  }
})
