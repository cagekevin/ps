#!/usr/bin/env node
// 是什么：页面层边界守卫——`src/pages/**` 只许经 `useCommand` + store 投影取数据
// 替代了什么：原「全拦 cep/*（连 import type 也拦）+ 只点名 4 个出口」的两档版。
//   那个版本两头都漏：值导入 `@/cep/fs` 的 `writeTextFile` 直接放行（页面能自己写用户文件），
//   `import type` 又被无差别拦下（零运行时收益的摩擦）。
// 谁在用：`npm run check` 第 5 步；判据真源 = `docs/架构/目标架构.md` §4.7 +
//   `daily/架构日志/12-跨区-地基三层与门禁-2026-10-24.md` §E「边界规则 R」（TD-17-6）
// 【判据形态：判「import 边」，不判「行」】
//   旧版用一条 `IMPORT_RE` 判：`from` 必须和 `import` 在同一行，于是 prettier 把长导入折成多行
//   之后整条静默漏拦（`/tmp` 实测：多行 `writeTextFile` 导入 exit 0，eslint 也 exit 0）。
//   现在语法解析只在 `scripts/source-scan.mjs` 里写一次，这里只判「来源 + 导出名」。
// 例外：`src/pages/_probe/**`（内部探针页，故意直连 jsx 验证返回结构）。

import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { maskComments, scanImports, walkSources } from './source-scan.mjs'

/** `--root=<dir>` 只给测试用（在临时目录里造页面文件）；生产不传 = 仓库根 */
const ROOT = process.argv.find((a) => a.startsWith('--root='))?.slice(7) ?? process.cwd()
const PAGES = join(ROOT, 'src', 'pages')

/**
 * 档 1 · PS 出口层：值导入一律拦，报错文案点明"这不是数据层"。
 * （真正拦不拦由档 3 决定；这里只负责给出准确的"为什么"）
 */
const PS_OUTLET = /^@\/cep\/(jsx|data|events|transport|ps|mock|cloud)(\/|$)/

/**
 * 档 2 · 写出口：导出名硬黑名单。**永不进白名单**，哪怕有人误登记。
 * 依据：`src/cep/fs.ts` 的写函数（`daily/架构日志/12-跨区-…` §A.2 逐项归类）。
 */
const WRITE_EXPORTS = new Set([
  'writeTextFile',
  'writeTextFileAtomic',
  'writeBase64File',
  'saveExportedText',
  'removeFile',
])

/**
 * 档 3 · 只读白名单：来源模块 → 允许页面值导入的导出名。
 * 判据是「无副作用、不碰 PS、不写盘」；不在表里的 cep 导出 = 未登记 = 拦。
 *
 * 为什么 `@/cep/http` 与 `@/cep/dialog` **不在**这里：`jsonp` 是网络出口（`http.ts:2`
 * 明写「页面、组件、store 一律不许直接发请求」），`openFile/saveFile` 弹系统框属于用户交互，
 * 都应走命令层。`psScriptsDir`（`fs.ts:380`）虽只返回路径，但内部调 `evalScriptRaw`，也不登记。
 */
const READONLY_EXPORTS = {
  '@/cep/fs': new Set([
    'hasNode',
    'extensionDir',
    'userDir',
    'readTextSync',
    'readBase64Outcome',
    'b64ToUtf8',
    'utf8ToB64',
    'dirUsage',
    'combineReads',
    'readTextOutcome',
  ]),
  '@/cep/env': new Set(['PS_ENV', 'USER_DIR', 'DATA_FILES']),
  '@/cep/open-url': new Set(['openUrl', 'openUrlInDefaultBrowser']),
  /** 纯类型模块：`import { FontTag }` 不带 type 也会被 TS 擦除，按全量放行 */
  '@/cep/types': '*',
}

/** 页面不许**值导入**命令层（常量、表、函数都不行） */
const FORBIDDEN_VALUE_ONLY = [/^@\/commands(\/|$)/]

/** 裸宿主调用（`src/cep/**` 之外一律不许） */
const FORBIDDEN_CALLS = /\b(evalScript|__adobe_cep__)\b/

const SKIP_DIRS = new Set(['_probe'])

/**
 * 判一份页面文件。语法只解析一次（`scanImports`），判定按档往下走：
 * 档 0 语法形状（命名空间 / 副作用 / 动态）→ 档 2 写出口 → 档 3 PS 出口层与只读白名单。
 */
function scan(file) {
  const text = readFileSync(file, 'utf8')
  const problems = []

  for (const record of scanImports(text)) {
    const { spec, line } = record

    // 档 0 · 命名空间导入：白名单按具名绑定判定，`* as` 之后什么都核对不到
    if (record.namespace) {
      problems.push({
        line,
        spec,
        why: '命名空间导入（`import * as`）绕过了具名白名单判定',
        fix: '改成 `import { X } from …` 逐项引入',
      })
      continue
    }

    // 档 0 · 副作用导入：页面引 cep 模块即越界（模块顶层可能注册事件 / 定实现）
    if (record.kind === 'side-effect') {
      if (spec.startsWith('@/cep')) {
        problems.push({
          line,
          spec,
          why: '页面副作用导入了 cep 模块（模块顶层可能注册事件或定实现）',
          fix: '经命令层 / store 间接使用',
        })
      }
      continue
    }

    // 档 0 · 动态导入：拿不到具名绑定，白名单无从核对
    if (record.kind === 'dynamic') {
      if (!spec.startsWith('@/cep')) continue
      problems.push({
        line,
        spec,
        why: '页面用动态 import 引 cep 模块，静态白名单无法核对',
        fix: '经命令层 / store 间接使用',
      })
      continue
    }

    const isCep = spec.startsWith('@/cep')
    const valueNames = record.names.filter((n) => !n.typeOnly).map((n) => n.name)
    /** 整个 import 都是类型（`import type` 或全部具名带 `type`）= 编译期擦除 */
    const allTypeOnly = record.typeOnly || (record.names.length > 0 && valueNames.length === 0)

    // 档 0 · type-only 一律放行（无具名也无默认名 = 纯副作用，下面按 cep 判）
    if (allTypeOnly && (record.names.length > 0 || record.defaultName)) continue

    // 档 2 · 写出口：任何来源的写函数都不许页面直接拿
    const writeHits = valueNames.filter((name) => WRITE_EXPORTS.has(name))
    if (writeHits.length) {
      problems.push({
        line,
        spec,
        why: `页面值导入了写出口 \`${writeHits.join(', ')}\``,
        fix: '把写操作包成命令（`commands/**` 里调 `ctx.data.<repo>` 或 `cep/fs` 的写函数）',
      })
      continue
    }

    // 档 3 · PS 出口层：值导入一律拦
    if (isCep && PS_OUTLET.test(spec)) {
      problems.push({
        line,
        spec,
        why: '页面不许 import PS 出口层（jsx / data / events / transport / ps / mock / cloud）',
        fix: '要数据走 `useCommand` + store 只读投影；要类型请放到 `domain/`（`import type` 本守卫放行）',
      })
      continue
    }

    // 档 3 · 未登记的 cep 导出：默认拒绝
    if (isCep) {
      const allowed = READONLY_EXPORTS[spec]
      if (allowed === '*') continue
      if (record.defaultName) {
        problems.push({
          line,
          spec,
          why: '页面以默认导入方式引 cep 模块，白名单按具名绑定判定，无法核对',
          fix: '改成具名引入（`import { X } from …`），或先在本守卫登记该来源的只读导出',
        })
        continue
      }
      const unregistered = valueNames.filter((name) => !allowed?.has(name))
      if (!allowed || unregistered.length) {
        problems.push({
          line,
          spec,
          why: unregistered.length
            ? `页面值导入了未登记为只读的 cep 导出：\`${unregistered.join(', ')}\``
            : `页面不允许值导入 \`${spec}\``,
          fix: '走命令层；确属只读查询的，先在 scripts/page-boundary.mjs 的 READONLY_EXPORTS 登记（写函数永不登记）',
        })
      }
      continue
    }

    // 非 cep：命令层只禁值导入
    if (!allTypeOnly && FORBIDDEN_VALUE_ONLY.some((re) => re.test(spec))) {
      problems.push({
        line,
        spec,
        why: '页面不许**值导入**命令层（常量、表、函数都不行）',
        fix: '常量/表请放 `domain/`（例如 `domain/common-use.ts`），页面从 domain 引；类型用 `import type`',
      })
    }
  }

  // 裸宿主调用：在遮蔽注释的文本上判，注释里提到不算
  maskComments(text)
    .split('\n')
    .forEach((line, index) => {
      if (!FORBIDDEN_CALLS.test(line)) return
      problems.push({
        line: index + 1,
        spec: '（裸宿主调用）',
        why: '页面出现 `evalScript` / `__adobe_cep__`',
        fix: '走 `cep/transport` → `commands/**`；页面只调 `useCommand`',
      })
    })

  return problems
}

const violations = []
for (const file of walkSources(PAGES, ['.vue', '.ts'])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  // `src/pages/<页>/…` —— 第二段是 `_probe` 等内部页时豁免
  if (SKIP_DIRS.has(rel.split('/')[2])) continue
  for (const problem of scan(file)) violations.push({ file: rel, ...problem })
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
