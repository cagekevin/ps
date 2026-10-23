#!/usr/bin/env node
// 是什么：页面层边界守卫——`src/pages/**` 不许值导入命令层 / PS 出口
// 为什么：光靠"记得别拿"没用。`pages/commonUse/index.vue` 就拿过 `@/commands/commonUse` 的常量
//         （T-88a 被抓），所以把边界做成会红的检查。
// 判据来源：`docs/架构/dataflow.md` §8 的两条 grep + `docs/架构/目标架构.md` 4.7。
// 例外：`src/pages/_probe/**`（内部探针页，故意直连 jsx 验证返回结构）。

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const PAGES = join(ROOT, 'src', 'pages')

/** 一律禁止（值导入与 `import type` 都不行：这些是"做事的层"，类型也在这里长） */
const FORBIDDEN_ANY = [
  /^@\/cep\/jsx(\/|$)/,
  /^@\/cep\/data(\/|$)/,
  /^@\/cep\/events(\/|$)/,
  /^@\/cep\/transport(\/|$)/,
]

/** 只禁止值导入：`import type { X } from '@/commands/...'` 是允许的（payload 类型） */
const FORBIDDEN_VALUE_ONLY = [/^@\/commands(\/|$)/]

/** 裸宿主调用（`src/cep/**` 之外一律不许） */
const FORBIDDEN_CALLS = /\b(evalScript|__adobe_cep__)\b/

const SKIP_DIRS = new Set(['_probe'])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...walk(join(dir, entry.name)))
    } else if (/\.(vue|ts)$/.test(entry.name)) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

const IMPORT_RE = /^\s*import\s+(type\s+)?(?:[\s\S]*?)\s+from\s+'([^']+)'/gm

function scan(file) {
  const text = readFileSync(file, 'utf8')
  const problems = []

  for (const match of text.matchAll(IMPORT_RE)) {
    const [, typeKeyword, spec] = match
    const isTypeOnly = Boolean(typeKeyword)
    const line = text.slice(0, match.index).split('\n').length

    if (FORBIDDEN_ANY.some((re) => re.test(spec))) {
      problems.push({
        line,
        spec,
        why: '页面不许 import PS 出口层（jsx / data / events / transport），连类型也不行',
        fix: '要数据走 `useCommand` + store 只读投影；要类型请放到 `domain/`',
      })
      continue
    }
    if (!isTypeOnly && FORBIDDEN_VALUE_ONLY.some((re) => re.test(spec))) {
      problems.push({
        line,
        spec,
        why: '页面不许**值导入**命令层（常量、表、函数都不行）',
        fix: '常量/表请放 `domain/`（例如 `domain/common-use.ts`），页面从 domain 引；类型用 `import type`',
      })
    }
  }

  text.split('\n').forEach((line, index) => {
    if (FORBIDDEN_CALLS.test(line)) {
      problems.push({
        line: index + 1,
        spec: '（裸宿主调用）',
        why: '页面出现 `evalScript` / `__adobe_cep__`',
        fix: '走 `cep/transport` → `commands/**`；页面只调 `useCommand`',
      })
    }
  })

  return problems
}

const violations = []
for (const file of walk(PAGES)) {
  for (const problem of scan(file)) violations.push({ file: relative(ROOT, file), ...problem })
}

if (violations.length === 0) {
  console.log('[boundary] 通过：src/pages 没有越界 import / 裸宿主调用')
  process.exit(0)
}

console.error(`[boundary] 失败：src/pages 有 ${violations.length} 处越界\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`)
  console.error(`    导入/写法：${v.spec}`)
  console.error(`    为什么不行：${v.why}`)
  console.error(`    怎么改：${v.fix}\n`)
}
console.error('规则：页面只经 `useCommand` 调命令；数据只读 store 投影；常量放 domain。')
console.error('（`src/pages/_probe/**` 是内部探针页，已豁免。）')
process.exit(1)
