/**
 * 按页面聚合 spec，生成对照清单骨架。不解析源码、不手抄。
 *
 *   node scripts/page-list.mjs            全部页面
 *   node scripts/page-list.mjs Action     单页
 *
 * 数据源（全部是 tools/ 已有的产物）：
 *   - 结构：08-模板/*.md，**按 jsx 块首个 class 匹配**（文件名整体错位）
 *   - 方法 / 文案 / 子组件：02-组件/<组件>.md
 *   - CSS：原版 app.bf68b505.css，按 class 查
 *   - 事件：交互清单.md，按 class 相关过滤
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const REF = join(root, '..', 'reference', '02-组件文档')
const TPL_DIR = join(REF, '08-模板')
const COMP_DIR = join(REF, '02-组件')
const CSS_FILE = join(
  root,
  '..',
  'reference',
  '03-原版安装包',
  '04-CEP资源包',
  'CEP001-设计助理',
  'css',
  'app.bf68b505.css',
)
const OUT_DIR = join(root, 'docs', '页面')

/** 页面 → 根 class + 组件文档名 + 输出文件 */
const PAGES = [
  { page: '字体管理', root: 'font-manage', doc: 'font-manage', out: '01-字体管理.md', skip: true },
  { page: '字体面板', root: 'FontSet', doc: 'anon_56d7_L34996', out: '02-字体面板.md' },
  { page: '动作', root: 'Action', doc: 'Action', out: '03-动作.md' },
  { page: '样式', root: 'Style-wrap', doc: 'Style', out: '04-样式.md' },
  { page: '重命名', root: 'Rename', doc: 'Rename', out: '05-重命名.md' },
  { page: '自定义', root: 'Custom', doc: 'Custom', out: '06-自定义.md' },
  { page: '常用', root: 'CommonUse', doc: 'CommonUse', out: '07-常用.md' },
  { page: '设置', root: 'Set', doc: 'Set_2', out: '08-设置.md' },
]

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const css = read(CSS_FILE)

/** 按根 class 找模板（文件名不可信） */
function findTemplate(rootClass) {
  for (const name of readdirSync(TPL_DIR)) {
    if (!name.endsWith('.md')) continue
    const text = read(join(TPL_DIR, name))
    const block = text.match(/```jsx\n([\s\S]*?)```/)?.[1]
    if (!block) continue
    const first = block.match(/class="([^"]*)"/)?.[1] ?? ''
    if (first.split(/\s+/)[0] === rootClass) return { name, block }
  }
  return null
}

/** 结构树 → 行（层级 / 标签 / class / 事件） */
function parseTree(block) {
  const rows = []
  for (const raw of block.split(/\r?\n/)) {
    const m = raw.match(/^(\s*)<([a-zA-Z][\w-]*)([^>]*)>/)
    if (!m) continue
    const depth = Math.floor(m[1].length / 2)
    const attrs = m[3]
    const cls = attrs.match(/class="([^"]*)"/)?.[1] ?? ''
    const events = [...attrs.matchAll(/@([\w-]+)/g)].map((x) => x[1])
    rows.push({ depth, tag: m[2], cls, events })
  }
  return rows
}

/** 从组件文档取小节 */
function section(text, title) {
  const re = new RegExp(`^## ${title}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm')
  return text.match(re)?.[1]?.trim() ?? ''
}

function cssRule(cls) {
  if (!cls) return ''
  const m = css.match(new RegExp(`\\.${cls.replace(/[-_]/g, '\\$&')}[^{]*\\{([^}]*)\\}`))
  return m ? m[1].trim() : ''
}

const only = process.argv[2]
let written = 0

for (const p of PAGES) {
  if (p.skip) continue
  if (only && !p.page.includes(only) && p.root !== only) continue

  const tpl = findTemplate(p.root)
  const doc = read(join(COMP_DIR, `${p.doc}.md`))
  if (!tpl && !doc) {
    console.log(`[list] ${p.page}：既无模板也无组件文档，跳过`)
    continue
  }

  const rows = tpl ? parseTree(tpl.block) : []
  const subs = section(doc, '子组件')
  const methods = section(doc, 'methods')
  const copy = section(doc, '文案')

  const lines = [
    `# ${p.page}页 · 对照清单`,
    '',
    '> 由 `npm run list` 从 spec 聚合，**不要手改**（改脚本或改 spec）。',
    `> 结构：\`${tpl?.name ?? '无模板'}\`（按根 class \`${p.root}\` 匹配，文件名不可信）`,
    `> 方法 / 文案 / 子组件：\`02-组件/${p.doc}.md\``,
    `> CSS：\`app.bf68b505.css\` 按 class 实测`,
    '> 状态：✅ 已实现 / ☐ 未做 / ➖ 有意合并。**“我方”列手填**。',
    '',
    '## 一、结构树',
    '',
  ]

  if (rows.length) {
    lines.push('| 层级 | 标签 | class | 事件 | 我方 | 状态 |', '|---|---|---|---|---|---|')
    for (const r of rows) {
      const indent = '　'.repeat(r.depth)
      lines.push(
        `| ${r.depth} | ${indent}\`${r.tag}\` | ${r.cls || '—'} | ${r.events.join(' / ') || '—'} | | ☐ |`,
      )
    }
    lines.push(
      '',
      `> 共 ${rows.length} 个节点。模板不展开 \`_l()\` 循环体与 \`if\` 分支，写的时候要补。`,
    )
  } else {
    lines.push('**无模板**，结构需从 render 源码补。')
  }

  lines.push('', '## 二、子组件（`02-组件` 的「子组件」）', '')
  lines.push(subs ? subs.replace(/^`|`$/g, '') : '（组件文档里没有子组件）')

  lines.push('', '## 三、methods（`02-组件` 原样，行号未核）', '')
  lines.push(methods ? methods.replace(/\n+/g, ' ') : '（无）')

  lines.push('', '## 四、文案', '')
  lines.push(copy ? copy.replace(/\n+/g, ' ') : '（无）')

  const cssClasses = [...new Set(rows.map((r) => r.cls.split(/\s+/)[0]).filter(Boolean))]
  const cssRows = cssClasses.map((c) => [c, cssRule(c)]).filter(([, rule]) => rule)

  lines.push('', '## 五、CSS 规格（实测）', '')
  if (cssRows.length) {
    lines.push('| class | 规则 |', '|---|---|')
    for (const [c, rule] of cssRows) lines.push(`| \`.${c}\` | ${rule} |`)
  } else {
    lines.push('（结构树里的 class 在 CSS 里都没有独立规则，靠 utility）')
  }

  lines.push(
    '',
    '## 六、未补齐（写到这里必须先补清单）',
    '',
    '> **门禁**：以下任一项没补齐，不许写对应代码。',
    '',
    '| 未补齐 | 说明 |',
    '|---|---|',
    '| 子组件内部结构 | 「子组件」只列了名字，内部未展开 |',
    '| 方法行号与语义 | methods 是名单，没有行号和实现依据 |',
    '| 循环 / 条件分支内部 | 模板不展开 `_l()` 和 `if`，这些节点只能从 render 补 |',
    '| data 字段 | 未提取 |',
    '',
  )

  writeFileSync(join(OUT_DIR, p.out), lines.join('\n'), 'utf8')
  written++
  console.log(`[list] ${p.page}：${rows.length} 节点，${cssRows.length} 条 CSS`)
}

console.log(`[list] 生成 ${written} 份`)
