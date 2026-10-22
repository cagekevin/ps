/** 一次性探测：确认组件变量 → render 函数的挂载关系。跑完即删。 */
import { parse } from '@babel/parser'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const file = join(root, '..', 'reference', '01-原版源码', 'panel', 'js', 'app.v4.js')
const code = readFileSync(file, 'utf8')

const ast = parse(code, {
  sourceType: 'script',
  errorRecovery: true,
  allowReturnOutsideFunction: true,
})

function walk(node, fn, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return
  seen.add(node)
  if (node.type) fn(node)
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue
    const v = node[k]
    if (Array.isArray(v)) v.forEach((x) => walk(x, fn, seen))
    else if (v && typeof v === 'object') walk(v, fn, seen)
  }
}

const targets = new Set(['Action', 'Rename', 'CommonUse', 'Style', 'Set', 'Custom'])
const varToComp = new Map()

walk(ast, (node) => {
  if (node.type !== 'VariableDeclarator') return
  if (node.id.type !== 'Identifier' || !node.init) return
  if (node.init.type !== 'ObjectExpression') return
  const nameProp = node.init.properties.find(
    (p) => p.key?.name === 'name' && p.value.type === 'StringLiteral',
  )
  if (nameProp && targets.has(nameProp.value.value)) {
    varToComp.set(node.id.name, nameProp.value.value)
  }
})

for (const [v, c] of varToComp) console.log(`var ${v} => ${c}`)

walk(ast, (node) => {
  if (node.type !== 'CallExpression' || node.callee.type !== 'CallExpression') return
  const [first, second] = node.arguments
  if (!first || first.type !== 'Identifier' || !varToComp.has(first.name)) return
  console.log(
    `mount ${varToComp.get(first.name)} var=${first.name} render=${second?.type}:${second?.name ?? 'inline'} @${node.loc.start.line}`,
  )
})
