import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * TD-17-7：层间守卫（`scripts/layer-boundary.mjs`）补齐 L5 / L6。
 *
 * 起因：脚本头部注释自认「domain 用 Vue / utils 依赖 stores 这两条不在本脚本拦截」，
 * 等于已知方向违规放行。补成规则后，存量进基线（`docs/生成/层边界基线.json`）、
 * **增量必须红**。
 *
 * 这里跑真脚本：只断言 exit code 与规则号。
 */

const SCRIPT = resolve(__dirname, '../../scripts/layer-boundary.mjs')
const LAYERS = ['stores', 'commands', 'cep', 'domain', 'utils']

function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'layer-boundary-'))
  for (const layer of LAYERS) mkdirSync(join(root, 'src', layer), { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, 'src', rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  return root
}

function run(root: string, ...args: string[]): { code: number; out: string } {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [SCRIPT, `--root=${root}`, ...args], {
        encoding: 'utf8',
      }),
    }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

describe('layer-boundary · L5 / L6 规则', () => {
  it('干净分层直接过', () => {
    const root = makeRoot({
      'domain/a.ts': `export const a = 1\n`,
      'utils/b.ts': `import { join } from 'node:path'\nexport const b = join('x')\n`,
    })
    const r = run(root)
    expect(r.code).toBe(0)
  })

  it('L5：domain 引 vue 直接红', () => {
    const root = makeRoot({
      'domain/font-missing.ts': `import { ref } from 'vue'\nexport const s = ref(0)\n`,
    })
    const r = run(root)
    expect(r.code).toBe(1)
    expect(r.out).toContain('L5')
  })

  it('L6：utils 依赖 stores 直接红', () => {
    const root = makeRoot({
      'utils/error-handler.ts': `import { useFeedbackStore } from '@/stores/feedback'\nexport const f = useFeedbackStore\n`,
    })
    const r = run(root)
    expect(r.code).toBe(1)
    expect(r.out).toContain('L6')
  })

  it('L4 回归：domain 反向依赖 @/cep 仍被拦', () => {
    const root = makeRoot({
      'domain/x.ts': `import type { FontTag } from '@/cep/types'\nexport type X = FontTag\n`,
    })
    const r = run(root)
    expect(r.code).toBe(1)
    expect(r.out).toContain('L4')
  })

  it('基线只放存量：登记 1 处后，同文件新增第 2 处仍红', () => {
    const root = makeRoot({
      'domain/font-missing.ts': `import { ref } from 'vue'\nexport const s = ref(0)\n`,
    })
    expect(run(root, '--update').code).toBe(0)
    expect(run(root).code).toBe(0)

    // 同文件再加一处 vue 导入：基线是 1，第 2 处必须红
    writeFileSync(
      join(root, 'src/domain/font-missing.ts'),
      `import { ref } from 'vue'\nimport { computed } from 'vue'\nexport const s = computed(() => ref(0))\n`,
      'utf8',
    )
    const r = run(root)
    expect(r.code).toBe(1)
    expect(r.out).toContain('L5')
  })

  it('多行 + 双引号 import 同样命中（TD-17-10：逐行字面判定会整条漏判）', () => {
    const root = makeRoot({
      'domain/f.ts': `import {\n  ref,\n} from "vue"\nexport const s = ref(0)\n`,
    })
    const r = run(root)
    expect(r.code).toBe(1)
    expect(r.out).toContain('L5')
  })
})
