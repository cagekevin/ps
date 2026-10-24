#!/usr/bin/env node
// 是什么：层间边界守卫——把「目标架构 §4.7 契约与唯一入口」里只靠"评审 + grep"的判据变成会红的检查。
// 为什么：§4.7 有三行写着"怎么防止绕过 = 评审 + grep 判据"。评审靠自觉，grep 靠人记得跑，
//         两条都不拦人。现已各自有机器守卫的（eslint / page-boundary.mjs）不重复写在这里。
// 判据来源：`docs/架构/目标架构.md` §4.4（层职责）、§4.7（唯一入口表）。
//
// 【申诉口三问】
//   守什么  ：层与层之间的方向性违规（domain 反向依赖适配层、命令层绕过唯一入口、
//              状态层写用户资产、适配层反向依赖文案层）。四条都是**方向**问题，不是风格偏好。
//   什么时候该改它：判据本身被裁定作废时（例如决定让 domain 依赖 cep 的类型）。
//                      改法：先改 `docs/架构/目标架构.md` 对应行，再改这里的规则表，两处一起改。
//   怎么改  ：放宽 = 删掉对应规则条目；加严 = 在 RULES 里加一条，并补上"红了怎么办"文案。
//
// 【已知未覆盖（别当全覆盖）】
//   · `src/domain/**` 是否允许依赖 Vue —— 目前 `domain/font-missing.ts` 用了 `ref`，
//     该判据尚未裁定，已登记为债（见 daily/架构日志/债务.md），故**不在本脚本拦截**。
//   · `src/utils/**` 的"零依赖"—— `utils/error-handler.ts` 事实上依赖 `stores/feedback` 与 `vue`，
//     现状与文档描述不一致，**不在本脚本拦截**。
//
// 例外：`src/pages/**` 的越层由 `scripts/page-boundary.mjs` 负责（页面层另有规则），本脚本不重复。

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

/**
 * 四条规则。`dir` = 被扫目录，`test` = 逐行判据。
 * `why` = 为什么不行（写给撞上它的人看），`fix` = 怎么改。
 */
const RULES = [
  {
    id: 'L1',
    dir: 'src/stores',
    label: '状态层只读投影，不得写用户资产',
    test: (line) => /\.update\(|\.write\(/.test(line),
    why: 'store 是只读投影，写用户资产的唯一入口是 commands 层（ADR-16 / 目标架构 §4.1 M1）',
    fix: '把写操作包成一条命令，命令里调 `ctx.data.<repo>.update(...)`，store 只订阅 `repo.onChange`',
  },
  {
    id: 'L2',
    dir: 'src/commands',
    label: '命令层不得自己取选区',
    test: (line) => /\bgetLayerState\s*\(/.test(line),
    why: '选区快照唯一入口是 `selection/`（`registry.execute` 每次执行刷一次，命令复用父命令的快照）',
    fix: '用 `ctx.selection`；要刷新选区就发一条 `requires: "layer"` 的命令',
  },
  {
    id: 'L3',
    dir: 'src/cep',
    label: '适配层不得依赖错误文案层',
    test: (line) => /\bdescribeCepError\b/.test(line),
    why: '文案归 `utils/error-text.ts`，适配层只抛 `CepError(code)`，不拼人话（目标架构 §4.7「错误文案」）',
    fix: '在适配层抛 `new CepError(code, detail)`，由 registry / useCommand 归一后再出文案',
  },
  {
    id: 'L4',
    dir: 'src/domain',
    label: '领域层不得反向依赖适配层',
    test: (line) => /^\s*import\s[^;]*from\s+'@\/cep/.test(line),
    why: '方向反了：domain 是最底层的纯规则，`@/cep` 是适配层。领域类型放 domain，适配层反向引 domain',
    fix: '把类型下沉到 `src/domain/<概念>.ts`（如 `domain/font-item.ts`），适配层改成 `import type ... from "@/domain/..."`',
  },
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(vue|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** 去掉注释，避免"注释里提到某个符号"被当成违规 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const violations = []

for (const rule of RULES) {
  const dir = join(ROOT, rule.dir)
  let files = []
  try {
    files = walk(dir)
  } catch {
    console.error(`[layer] 规则 ${rule.id} 的目录不存在：${rule.dir}`)
    process.exit(1)
  }

  for (const file of files) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n')
    lines.forEach((line, index) => {
      if (!rule.test(line)) return
      violations.push({
        rule,
        file: relative(ROOT, file),
        line: index + 1,
        text: line.trim(),
      })
    })
  }
}

if (violations.length === 0) {
  console.log(
    `[layer] 通过：${RULES.length} 条层间判据无违规（${RULES.map((r) => r.id).join(' / ')}）`,
  )
  process.exit(0)
}

console.error(`[layer] 失败：层间判据有 ${violations.length} 处违规\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.rule.id}] ${v.rule.label}`)
  console.error(`    代码：${v.text}`)
  console.error(`    为什么不行：${v.rule.why}`)
  console.error(`    怎么改：${v.rule.fix}\n`)
}
console.error(
  '规则：层方向不可逆 —— domain ← cep ← commands ← pages；store 只读；错误文案只在 utils/error-text.ts。',
)
process.exit(1)
