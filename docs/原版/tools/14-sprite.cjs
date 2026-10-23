/**
 * 14-sprite.cjs —— 从原面板 JS 里抽图标 sprite
 *
 * 原面板的图标不是字体也不是散图，而是内嵌在 app.*.js 里的一段 SVG sprite：
 *   <symbol id="iconchuangjian" viewBox="0 0 1024 1024"><path d="..."/></symbol>
 * 模板里用 <use xlink:href="#iconchuangjian"/> 引用。
 *
 * 输出：
 *   12-新面板/src/assets/icons-sprite.svg   完整 sprite
 *   12-新面板/src/components/icon/names.ts  图标名清单（给类型和演示页用）
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(
  __dirname,
  '..',
  '05-官方资源',
  '04-CEP资源包',
  'CEP001-设计助理',
  'js',
  'app.8565afb8.js',
)
const PANEL = path.join(__dirname, '..', '12-新面板')
const OUT_SVG = path.join(PANEL, 'src', 'assets', 'icons-sprite.svg')
const OUT_NAMES = path.join(PANEL, 'src', 'components', 'icon', 'names.ts')

const text = fs.readFileSync(SRC, 'utf8')

const symbols = []
const seen = new Set()
const re = /<symbol\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/symbol>/g

let m
while ((m = re.exec(text)) !== null) {
  const id = m[1]
  // fol-icon-test* 是原面板开发时的测试图标，没被任何模板引用
  if (id.startsWith('fol-icon-test')) continue
  if (seen.has(id)) continue
  seen.add(id)
  symbols.push({ id, markup: m[0] })
}

if (!symbols.length) {
  console.error('没抽到 symbol，检查源文件是否变了')
  process.exit(1)
}

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
  'aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">\n' +
  symbols.map((s) => '  ' + s.markup).join('\n') +
  '\n</svg>\n'

fs.mkdirSync(path.dirname(OUT_SVG), { recursive: true })
fs.writeFileSync(OUT_SVG, svg, 'utf8')

const names = symbols.map((s) => s.id).sort()
const ts =
  '/**\n' +
  ' * 图标名清单，由 10-逆向流水线/14-sprite.cjs 从原面板 app.js 抽出，别手改。\n' +
  ` * 共 ${names.length} 个。\n` +
  ' */\n' +
  'export const ICON_NAMES = [\n' +
  names.map((n) => `  '${n}',`).join('\n') +
  '\n] as const\n\n' +
  'export type IconName = (typeof ICON_NAMES)[number]\n\n' +
  'const ICON_SET = new Set<string>(ICON_NAMES)\n\n' +
  'export function hasIcon(name: string): boolean {\n' +
  '  return ICON_SET.has(name.replace(/^#/, \'\'))\n' +
  '}\n'

fs.mkdirSync(path.dirname(OUT_NAMES), { recursive: true })
fs.writeFileSync(OUT_NAMES, ts, 'utf8')

console.log(`抽出 ${symbols.length} 个图标`)
console.log(`sprite: ${OUT_SVG} (${(svg.length / 1024).toFixed(1)} KB)`)
console.log(`清单:   ${OUT_NAMES}`)
console.log(`包含 iconchuangjian: ${seen.has('iconchuangjian')}`)
console.log('样例: ' + names.slice(0, 12).join(', '))
