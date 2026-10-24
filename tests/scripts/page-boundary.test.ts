import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-17-6：页面边界守卫（`scripts/page-boundary.mjs`）三档判据。
 *
 * 起因：旧版只点名 `jsx/data/events/transport` 四个出口，于是
 *   · 页面 `import { writeTextFile } from '@/cep/fs'` **静默放行**（能自己写用户文件）；
 *   · `import type { EventId } from '@/cep/events'` 被无差别拦下（零运行时收益的摩擦）。
 *
 * 这里跑**真脚本**，只断言 exit code 与报错语义：拦得住写出口、放得行只读与 type-only。
 */

const SCRIPT = resolve(__dirname, '../../scripts/page-boundary.mjs')

function run(sources: Record<string, string>): { code: number; out: string } {
  const root = mkdtempSync(join(tmpdir(), 'page-boundary-'))
  const pages = join(root, 'src', 'pages', 'demo')
  mkdirSync(pages, { recursive: true })
  for (const [name, content] of Object.entries(sources)) {
    writeFileSync(join(pages, name), content, 'utf8')
  }
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [SCRIPT, `--root=${root}`], { encoding: 'utf8' }),
    }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

const page = (imports: string) => `<script setup lang="ts">
${imports}
</script>

<template><div /></template>
`

describe('page-boundary · 三档判据', () => {
  it('拦写出口：@/cep/fs 的 writeTextFile 即使用具名导入也红', () => {
    const r = run({ 'A.vue': page(`import { writeTextFile } from '@/cep/fs'`) })
    expect(r.code).toBe(1)
    expect(r.out).toContain('写出口')
    expect(r.out).toContain('writeTextFile')
  })

  it('放行只读白名单：@/cep/fs 的 userDir / dirUsage', () => {
    const r = run({ 'A.vue': page(`import { userDir, dirUsage } from '@/cep/fs'`) })
    expect(r.code).toBe(0)
  })

  it('放行 type-only：import type 一律不拦（含 events）', () => {
    const r = run({
      'A.vue': page(
        `import type { EventId } from '@/cep/events'\nimport type { FontTag } from '@/cep/types'`,
      ),
    })
    expect(r.code).toBe(0)
  })

  it('拦 PS 出口层值导入：@/cep/jsx', () => {
    const r = run({ 'A.vue': page(`import { jsx } from '@/cep/jsx'`) })
    expect(r.code).toBe(1)
    expect(r.out).toContain('PS 出口层')
  })

  it('拦未登记的只读来源：@/cep/ps 的 getFontList（默认拒绝）', () => {
    const r = run({ 'A.vue': page(`import { getFontList } from '@/cep/ps'`) })
    expect(r.code).toBe(1)
  })

  it('拦命名空间导入（白名单无法核对具名绑定）', () => {
    const r = run({ 'A.vue': page(`import * as fs from '@/cep/fs'`) })
    expect(r.code).toBe(1)
    expect(r.out).toContain('命名空间')
  })

  it('多行具名 import 不放过（TD-17-9：只认同行会整条漏拦）', () => {
    const r = run({ 'A.vue': page(`import {\n  userDir,\n  writeTextFile,\n} from '@/cep/fs'`) })
    expect(r.code).toBe(1)
    expect(r.out).toContain('写出口')
  })

  it('拦动态 import cep 模块（静态白名单核对不到）', () => {
    const r = run({ 'A.ts': `export const load = () => import('@/cep/jsx')\n` })
    expect(r.code).toBe(1)
    expect(r.out).toContain('动态 import')
  })
})
