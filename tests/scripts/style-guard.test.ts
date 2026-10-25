import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * 样式守卫（`scripts/style-guard.mjs`）的三条**结构型**判据：
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

function invoke(root: string): { code: number; out: string } {
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
    const result = invoke(
      makeRoot({ 'components/A.vue': vue('.x-box {\n  margin-left: -8px;\n}') }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('neg-margin')
  })

  it('多值 `margin: 4px -8px` → 非 0', () => {
    const result = invoke(makeRoot({ 'components/A.vue': vue('.x-box {\n  margin: 4px -8px;\n}') }))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('neg-margin')
  })

  it('正向 `margin-left: 8px` → 退出码 0（不误报）', () => {
    const result = invoke(makeRoot({ 'components/A.vue': vue('.x-box {\n  margin-left: 8px;\n}') }))
    expect(result.code).toBe(0)
  })
})

describe('style-guard · 动效只用 token', () => {
  it('`transition: transform 0.12s` → 非 0，报 motion-raw', () => {
    const result = invoke(
      makeRoot({ 'components/A.vue': vue('.x-box {\n  transition: transform 0.12s;\n}') }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('motion-raw')
  })

  it('`transition: opacity var(--dur-fast) var(--ease)` → 退出码 0', () => {
    const result = invoke(
      makeRoot({
        'components/A.vue': vue('.x-box {\n  transition: opacity var(--dur-fast) var(--ease);\n}'),
      }),
    )
    expect(result.code).toBe(0)
  })
})

describe('style-guard · 裸类名撞名', () => {
  it('`.content` 被两个文件定义 → 非 0，报 bare-collision', () => {
    const result = invoke(
      makeRoot({
        'pages/a/A.vue': vue('.content {\n  padding: 0;\n}', 'content'),
        'pages/b/B.vue': vue('.content {\n  padding: 4px;\n}', 'content'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('bare-collision')
  })

  it('裸类名只出现在一个文件里 → 退出码 0（盘上 35 个裸类名不该被一刀切）', () => {
    const result = invoke(
      makeRoot({
        'pages/a/A.vue': vue('.content {\n  padding: 0;\n}', 'content'),
        'pages/b/B.vue': vue('.item {\n  padding: 4px;\n}', 'item'),
      }),
    )
    expect(result.code).toBe(0)
  })
})

/**
 * 静默失败检查的判据从"文本里出现这个名字"改成"名字作为**代码**被用上"。
 *
 * 旧判据是 `vueText.includes(名字)`：`.vue` 里写一行 `// TODO: tagsError` 就算"已渲染" ——
 * 注释骗过守卫。这里同时钉住两件事：
 *   ① 反例：注释 / 字符串字面量 / 模板纯文本里的名字**不算**渲染（四条）；
 *   ② 正例：模板表达式、指令属性值、脚本里 computed 中转都算（防过度收严）。
 * 顺带钉住 store 侧真的被扫到（旧版 `walk()` 只收 .vue/.css，扫 `src/stores/*.ts` 恒绿 = 空转）。
 */

const storeFile = (name: string) => `import { ref } from 'vue'\n\nexport const ${name} = ref('')\n`

const pageWith = (template: string, script = '') =>
  `<template>\n${template}\n</template>\n${script ? `\n<script setup lang="ts">\n${script}\n</script>\n` : ''}`

describe('style-guard · 静默失败（TD-17-16：只认可执行代码）', () => {
  it('模板里只有 `<!-- TODO: tagsError -->`（没真用）→ 非 0，文案点出「当成代码使用」', () => {
    const result = invoke(
      makeRoot({
        'stores/silent.ts': storeFile('tagsError'),
        'pages/a/A.vue': pageWith('  <!-- TODO: tagsError 待接 -->\n  <p>空</p>'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('静默失败')
    expect(result.out).toContain('当成代码使用')
  })

  it('只在脚本注释里提 `// TODO: tagsError` → 非 0（注释不算渲染）', () => {
    const result = invoke(
      makeRoot({
        'stores/silent.ts': storeFile('tagsError'),
        'pages/a/A.vue': pageWith('  <p>空</p>', '// TODO: tagsError 待接'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('静默失败')
  })

  it('只在字符串字面量里出现（`:title="\'tagsError\'"` 与模板纯文本）→ 非 0', () => {
    const result = invoke(
      makeRoot({
        'stores/silent.ts': storeFile('tagsError'),
        'pages/a/A.vue': pageWith('  <p :title="\'tagsError\'">tagsError</p>'),
      }),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('静默失败')
  })

  it('模板表达式 `v-if="tagsError"` 真用上 → 退出码 0（正例，不误报）', () => {
    const result = invoke(
      makeRoot({
        'stores/silent.ts': storeFile('tagsError'),
        'pages/a/A.vue': pageWith('  <p v-if="tagsError">{{ tagsError }}</p>'),
      }),
    )
    expect(result.code).toBe(0)
  })

  it('脚本里 computed 中转（模板渲染的是 showErr）→ 退出码 0（合法写法不许判死）', () => {
    const result = invoke(
      makeRoot({
        'stores/silent.ts': storeFile('tagsError'),
        'pages/a/A.vue': pageWith(
          '  <p v-if="showErr">{{ showErr }}</p>',
          "import { computed } from 'vue'\nimport { tagsError } from '@/stores/silent'\n\nconst showErr = computed(() => tagsError.value)",
        ),
      }),
    )
    expect(result.code).toBe(0)
  })
})
