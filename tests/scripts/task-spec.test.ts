import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * T-93：任务书格式守卫（`scripts/task-spec.mjs`）。
 *
 * 判据：① 格式正确的示例 → 退出码 0；② 故意造违规 → 非 0 且报出**行号 + 违反哪条**。
 * 这里跑的是**真脚本**（spawn `node`），不是复制一份逻辑到测试里——否则测的就不是门禁本身。
 */

const SCRIPT = resolve(__dirname, '../../scripts/task-spec.mjs')
const TEMPLATE = resolve(__dirname, '../../docs/规范/任务书模板.md')

function run(file: string): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' })
    return { code: 0, out }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

function writeSpec(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'task-spec-'))
  const file = join(dir, 'spec.md')
  writeFileSync(file, content, 'utf8')
  return file
}

const GOOD = `# 标题

## 甲区【可执行】
1. **目标**：做一件事
2. **判据**：能核对

## 乙区【参考】
1. 一条参考

## 丙区【问题】
1. 一个问题
`

describe('任务书格式守卫', () => {
  it('仓库里的模板本身合规（退出码 0）', () => {
    const result = run(TEMPLATE)
    expect(result.out).toContain('通过')
    expect(result.code).toBe(0)
  })

  it('格式正确的示例 → 退出码 0', () => {
    const result = run(writeSpec(GOOD))
    expect(result.code).toBe(0)
  })

  it('甲区不在前 5 行 → 非 0，报行号 + 违反 R1', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n前言一\n\n前言二\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 乙区【参考】\n1. z\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R1')
    expect(result.out).toMatch(/:\d+/)
  })

  it('乙区条目没编号 → 非 0，报行号 + 违反 R5', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 乙区【参考】\n这条没编号\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R5')
  })

  it('甲区之前散着写正文 → 非 0，报行号 + 违反 R3', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n这里写了一段不在三区里的正文\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 乙区【参考】\n1. z\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R3')
  })

  it('甲区缺「判据」→ 非 0，报违反 R4', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n## 甲区【可执行】\n1. **目标**：x\n\n## 乙区【参考】\n1. z\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R4')
  })

  it('缺丙区 → 非 0，报违反 R2', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 乙区【参考】\n1. z\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R2')
  })

  /**
   * R3 后半：丙区是最后一区（TD-17-12）。
   *
   * 旧版只扫甲区**之前**，头注释却承诺"丙区之后不许有内容" —— 于是
   * `## 丁区` + 散装正文返回 `[]`（等于没判）。这两条把"第四区"钉住：
   * 判据是**丙区之后不许再出现任何标题**（H2/H1 都算），而不是"丙区里不许写正文"。
   */
  it('丙区之后出现 `## 丁区` → 非 0，报 R3 且指出是第 4 节', () => {
    const result = run(writeSpec(`${GOOD}\n## 丁区【第四区】\n散装正文，不该存在。\n再一行。\n`))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R3')
    expect(result.out).toContain('第 4 节')
    expect(result.out).toContain('丁区')
  })

  it('丙区之后出现 `# 附录`（H1 也算） → 非 0，报 R3', () => {
    const result = run(writeSpec(`${GOOD}\n# 附录\n这里也是第四区。\n`))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R3')
    expect(result.out).toContain('附录')
  })

  it('合规任务书（丙区写多行正文与多条问题）→ 退出码 0，零违规', () => {
    const result = run(
      writeSpec(
        [
          '# 标题',
          '',
          '## 甲区【可执行】',
          '1. **目标**：做一件事',
          '2. **判据**：能核对',
          '',
          '## 乙区【参考】',
          '1. 一条参考',
          '',
          '## 丙区【问题】',
          '1. 第一个问题',
          '2. 第二个问题',
          '   缩进写的补充说明也属于丙区正文。',
          '',
          '丙区一直写到文末，这里再加一段散正文仍然是丙区。',
          '',
        ].join('\n'),
      ),
    )
    expect(result.code).toBe(0)
    expect(result.out).toContain('通过')
    expect(result.out).not.toContain('违反')
  })
})
