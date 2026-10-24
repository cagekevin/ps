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

  /**
   * TD-17-17：旧 R1 是"甲区必须在前 5 行以内"。
   * 先写 `## 摘要`（常见且合法）再写甲区的任务书会被这条行数上限判死，
   * 而"甲区之前不许倒散装正文"本来就该由 R3 判 —— 所以行数上限换成"只出现一次"。
   */
  it('先 `## 摘要` 再 `## 甲区` → 退出码 0（甲区不再受前 5 行限制）', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n## 摘要\n\n一句话说清要干什么。\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 乙区【参考】\n1. z\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).toBe(0)
    expect(result.out).toContain('通过')
  })

  it('甲区标题出现两次 → 非 0，报违反 R1', () => {
    const result = run(
      writeSpec(
        `# 标题\n\n## 甲区【可执行】\n1. **目标**：x\n2. **判据**：y\n\n## 甲区【又一份】\n1. z\n\n## 乙区【参考】\n1. z\n\n## 丙区【问题】\n1. w\n`,
      ),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R1')
    expect(result.out).toContain('2 次')
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

/**
 * TD-17-17：**发现模式**（`--root`，等价于 `npm run spec:check`）不再静默漏审。
 *
 * 旧判据是"文件里**第一个**二级标题是 `## 甲区`"：先写 `## 摘要` 再写甲区的任务书
 * 被判成"不是任务书" —— 不报错、也不进覆盖清单，违规（丙区之后有 `## 丁区`）大摇大摆过去。
 * 这里钉两条：① 这类任务书必须被发现并审（覆盖清单如实计数）；② 代码块里的示例不算任务书。
 */

const FENCE = '```'

function makeBookDir(books: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'task-spec-root-'))
  for (const [name, content] of Object.entries(books)) {
    writeFileSync(join(dir, name), content, 'utf8')
  }
  return dir
}

function runRoot(dir: string): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, `--root=${dir}`], { encoding: 'utf8' })
    return { code: 0, out }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

/** 先摘要、后三区：甲区不在第一段，旧判据会整份漏掉 */
const SUMMARY_FIRST = [
  '# T-99 先摘要后甲区',
  '',
  '## 摘要',
  '',
  '一句话说清这份任务书要干什么。',
  '',
  '## 甲区【可执行】',
  '1. **目标**：x',
  '2. **判据**：y',
  '',
  '## 乙区【参考】',
  '1. z',
  '',
  '## 丙区【问题】',
  '1. w',
  '',
].join('\n')

describe('task-spec · 发现模式（TD-17-17：先摘要后甲区不许漏审）', () => {
  it('先 `## 摘要` 再 `## 甲区`（无丁区）→ 被发现且合规：退出码 0 + 「覆盖：1 份」', () => {
    const result = runRoot(makeBookDir({ 'book.md': SUMMARY_FIRST }))
    expect(result.code).toBe(0)
    expect(result.out).toContain('覆盖：1 份')
    expect(result.out).toContain('book.md')
  })

  it('同上但丙区后有 `## 丁区` → 被发现并判红：非 0，报 R3', () => {
    const result = runRoot(
      makeBookDir({ 'book.md': `${SUMMARY_FIRST}\n## 丁区【第四区】\n散装正文。\n` }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R3')
    expect(result.out).toContain('丁区')
    expect(result.out).toContain('覆盖：1 份')
  })

  it('代码块里的 `## 甲区` 是示例不是任务书 → 退出码 1，点明没发现任务书', () => {
    const example = [
      '# 工序文档',
      '',
      '示例：',
      '',
      FENCE + 'md',
      '## 甲区【可执行】',
      '1. **目标**：x',
      '2. **判据**：y',
      '## 乙区【参考】',
      '1. z',
      '## 丙区【问题】',
      '1. w',
      FENCE,
      '',
    ].join('\n')
    const result = runRoot(makeBookDir({ 'howto.md': example }))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('没有发现任何任务书')
  })

  it('`# 标题` 之下直接倒正文（没有具名小节）→ 非 0，报 R3（散装内容仍然不许）', () => {
    const result = runRoot(
      makeBookDir({
        'book.md': ['# 标题', '', '前言一', '', '前言二', '', SUMMARY_FIRST].join('\n'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R3')
  })
})
