import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * T-95：模板守卫（`scripts/vue-template-guard.mjs`）。
 *
 * 起因：真机整页崩溃——`<UseGridItem>` 标签里混进一行只含 `` `n `` 的游离文本。
 * `@vue/compiler-sfc` 把它编译成属性 `"\`n": ""`（0 错误），jsdom 挂载也不抛，
 * 真机 Chromium 执行 `setAttribute('`n','')` 抛 InvalidCharacterError → 整页挂载失败。
 *
 * 这里跑**真脚本**，只断言两件：干净文件过、非法属性名红（带行号 + 规则号）。
 */

const SCRIPT = resolve(__dirname, '../../scripts/vue-template-guard.mjs')

function invoke(file: string): { code: number; out: string } {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }) }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

function writeVue(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'vue-guard-'))
  const file = join(dir, 'x.vue')
  writeFileSync(file, content, 'utf8')
  return file
}

const CLEAN = `<script setup lang="ts">
const a = 1
</script>

<template>
  <div class="x" :data-i="a" @click="a++">
    <span v-if="a">ok</span>
  </div>
</template>
`

const STRAY = `<script setup lang="ts">
const a = 1
</script>

<template>
  <div
    class="x"
    \`n
    @click="a++"
  />
</template>
`

describe('Vue 模板守卫', () => {
  it('干净文件 → 退出码 0', () => {
    const result = invoke(writeVue(CLEAN))
    expect(result.code).toBe(0)
    expect(result.out).toContain('通过')
  })

  it('游离反引号 token → 非 0，报行号 + R2', () => {
    const result = invoke(writeVue(STRAY))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('R2')
    expect(result.out).toMatch(/:\d+/)
    expect(result.out).toContain('属性名含非法字符')
  })

  it('解析不了的 SFC → 非 0，报 R3', () => {
    const result = invoke(writeVue('<template><div></template>'))
    expect(result.code).not.toBe(0)
    expect(result.out).toMatch(/R2|R3/)
  })
})
