import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * TD-17-13：样式守卫（`scripts/style-guard.mjs`）的三条**结构型**判据：
 * 负 margin（含长写/多值）· transition 裸时长 · 裸类名撞名。
 *
 * 起因：旧版负 margin 只认 `margin:\s*-`，于是 `margin-left:-9px`（盘上真有）与
 * `margin: 0 -8px` 全放行；动效 token 与命名前缀完全没有守卫。
 *
 * 这里跑**真脚本**（`--root=<临时目录>` + 子进程），只断言退出码与规则号；
 * 正例同样要过 —— 守卫不能变成误报机器。
 */

const SCRIPT = resolve(__dirname, '../../scripts/style-guard.mjs')

/** 在临时目录里造 `src/…` 夹具（style-guard 的根可被 `--root` 覆盖，仅为测试用） */
function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'style-guard-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, 'src', rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  return root
}

const vue = (css: string, cls = 'x-box') => `<style scoped>
${css}
</style>

<template>
  <div class="${cls}" />
</template>
`

function run(root: string): { code: number; out: string } {
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

describe('style-guard · 负 margin（长写与多值都要拦）', () => {
  it('长写 `margin-left: -8px` → 非 0，报 neg-margin', () => {
    const result = run(makeRoot({ 'components/A.vue': vue('.x-box {\n  margin-left: -8px;\n}') }))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('neg-margin')
  })

  it('多值 `margin: 4px -8px` → 非 0', () => {
    const result = run(makeRoot({ 'components/A.vue': vue('.x-box {\n  margin: 4px -8px;\n}') }))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('neg-margin')
  })

  it('正向 `margin-left: 8px` → 退出码 0（不误报）', () => {
    const result = run(makeRoot({ 'components/A.vue': vue('.x-box {\n  margin-left: 8px;\n}') }))
    expect(result.code).toBe(0)
  })
})

describe('style-guard · 动效只用 token', () => {
  it('`transition: transform 0.12s` → 非 0，报 motion-raw', () => {
    const result = run(
      makeRoot({ 'components/A.vue': vue('.x-box {\n  transition: transform 0.12s;\n}') }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('motion-raw')
  })

  it('`transition: opacity var(--dur-fast) var(--ease)` → 退出码 0', () => {
    const result = run(
      makeRoot({
        'components/A.vue': vue('.x-box {\n  transition: opacity var(--dur-fast) var(--ease);\n}'),
      }),
    )
    expect(result.code).toBe(0)
  })
})

describe('style-guard · 裸类名撞名', () => {
  it('`.content` 被两个文件定义 → 非 0，报 bare-collision', () => {
    const result = run(
      makeRoot({
        'pages/a/A.vue': vue('.content {\n  padding: 0;\n}', 'content'),
        'pages/b/B.vue': vue('.content {\n  padding: 4px;\n}', 'content'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('bare-collision')
  })

  it('裸类名只出现在一个文件里 → 退出码 0（盘上 35 个裸类名不该被一刀切）', () => {
    const result = run(
      makeRoot({
        'pages/a/A.vue': vue('.content {\n  padding: 0;\n}', 'content'),
        'pages/b/B.vue': vue('.item {\n  padding: 4px;\n}', 'item'),
      }),
    )
    expect(result.code).toBe(0)
  })
})
