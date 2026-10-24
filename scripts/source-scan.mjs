// 是什么：三个守卫共用的「源码结构」扫描器——import 的真实形状、跨行语句、注释遮蔽。
// 替代了什么：page-boundary / layer-boundary / assertion-guard 各自一份的逐行正则
//   （`IMPORT_RE` 只认同行、`margin` 式逐行 test、`as unknown as` 按行 matchAll）。
// 谁在用：`scripts/page-boundary.mjs`、`scripts/layer-boundary.mjs`、`scripts/assertion-guard.mjs`
// 禁止：这里不许出现任何「哪个模块 / 哪个导出 / 哪个符号算违规」的业务名单。
//   策略（白名单、规则表、基线）留在各自守卫里；本模块只回答「源码里有哪些结构」。
//   一旦这里长出一份名单，它就是第四份要维护的清单 —— 那正是 A4 要消灭的东西。

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 递归收集源码文件；默认 .ts / .vue（`.d.ts` 也在内，调用方自己筛） */
export function walkSources(dir, exts = ['.ts', '.vue']) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out // 目录不存在 = 没有违规源，不是错误
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkSources(abs, exts))
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(abs)
  }
  return out
}

/**
 * 把注释替换成空格，**长度与换行保持不变**。
 *
 * 为什么要遮蔽而不是"跳过注释行"：`as unknown as` 可能和它的理由注释在同一行，
 * 按行跳过会把整行当注释丢掉，从而漏判；而带偏移量的扫描必须能接受注释不参与匹配。
 */
export function maskComments(text) {
  const out = text.split('')
  const blank = (i) => {
    if (out[i] !== '\n') out[i] = ' '
  }
  let i = 0
  let state = 'code' // code | line | block | str | tpl
  let quote = ''
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line'
        blank(i)
        blank(i + 1)
        i += 2
        continue
      }
      if (ch === '/' && next === '*') {
        state = 'block'
        blank(i)
        blank(i + 1)
        i += 2
        continue
      }
      if (ch === '"' || ch === "'") {
        state = 'str'
        quote = ch
      } else if (ch === '`') {
        state = 'tpl'
      }
      i += 1
      continue
    }
    if (state === 'line') {
      if (ch === '\n') state = 'code'
      else blank(i)
      i += 1
      continue
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        blank(i)
        blank(i + 1)
        state = 'code'
        i += 2
        continue
      }
      blank(i)
      i += 1
      continue
    }
    // 字符串 / 模板串：原样保留（import 的模块名就在里面），只处理转义与结束符
    if (ch === '\\') {
      i += 2
      continue
    }
    if ((state === 'str' && ch === quote) || (state === 'tpl' && ch === '`')) state = 'code'
    i += 1
  }
  return out.join('')
}

/** 1 基行号 */
export function lineOf(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1
  return line
}

/** 原文里的注释行（供"理由注释"这类判断使用）；保留原始文本 */
export function commentLines(text) {
  const out = []
  text.split('\n').forEach((line, index) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'))
      out.push({ line: index + 1, text: t })
  })
  return out
}

function skipSpace(text, i) {
  let j = i
  while (j < text.length && /\s/.test(text[j])) j += 1
  return j
}

function readString(text, i) {
  const quote = text[i]
  let j = i + 1
  let value = ''
  while (j < text.length) {
    const ch = text[j]
    if (ch === '\\') {
      value += text.slice(j, j + 2)
      j += 2
      continue
    }
    if (ch === quote) return { value, end: j + 1 }
    value += ch
    j += 1
  }
  return null
}

/** 拆 `{ a, b as c, type D }`；返回具名绑定（含 `type` 标记与别名） */
function parseNamedBindings(clause) {
  const names = []
  for (const part of clause.split(',')) {
    const item = part.trim()
    if (!item) continue
    const typeOnly = /^type\s/.test(item)
    const bare = item.replace(/^type\s+/, '')
    const [imported, local] = bare.split(/\s+as\s+/)
    names.push({
      name: (imported ?? '').trim(),
      alias: (local ?? '').trim() || null,
      typeOnly,
    })
  }
  return names
}

/**
 * 解析文件里的**全部** import，产出结构化记录。
 *
 * 手搓顺序解析而不是一条正则：正则版的病就是「只认同行 / 只认单引号」，
 * 而这两件事都不是"规则"，是"语法没读完"。这里把语法读完，规则才可能只看 spec。
 *
 * 记录形状：
 *   { kind: 'static' | 'side-effect' | 'dynamic', spec, line, text,
 *     typeOnly, namespace, defaultName, names: [{name, alias, typeOnly}] }
 */
export function scanImports(text) {
  const masked = maskComments(text)
  const records = []
  const re = /\bimport\b/g
  for (const match of masked.matchAll(re)) {
    const start = match.index
    // `import` 必须是词的开头（`reimport` 之类不算）——\b 已保证
    let i = skipSpace(masked, start + 'import'.length)
    let typeOnly = false

    // 1. 动态 import(...)：`await import('x')`
    if (masked[i] === '(') {
      const j = skipSpace(masked, i + 1)
      if (masked[j] !== '"' && masked[j] !== "'") continue
      const str = readString(masked, j)
      if (!str) continue
      records.push({
        kind: 'dynamic',
        spec: str.value,
        line: lineOf(masked, start),
        text: masked.slice(start, str.end).replace(/\s+/g, ' ').trim(),
        typeOnly: false,
        namespace: false,
        defaultName: null,
        names: [],
      })
      continue
    }

    // 2. 副作用 import：`import 'x'`
    if (masked[i] === '"' || masked[i] === "'") {
      const str = readString(masked, i)
      if (!str) continue
      records.push({
        kind: 'side-effect',
        spec: str.value,
        line: lineOf(masked, start),
        text: masked.slice(start, str.end).replace(/\s+/g, ' ').trim(),
        typeOnly: false,
        namespace: false,
        defaultName: null,
        names: [],
      })
      continue
    }

    // 3. 静态 import：`import [type] <子句> from 'x'`
    if (/^type\b/.test(masked.slice(i, i + 5))) {
      typeOnly = true
      i = skipSpace(masked, i + 4)
    }
    const clauseStart = i
    let depth = 0
    let fromAt = -1
    let j = i
    while (j < masked.length) {
      const ch = masked[j]
      if (ch === '{') depth += 1
      else if (ch === '}') depth -= 1
      else if (depth === 0 && ch === ';') break
      else if (depth === 0 && ch === 'f' && /^from\b/.test(masked.slice(j, j + 5))) {
        fromAt = j
        break
      }
      j += 1
    }
    if (fromAt < 0) continue // 不是静态 import（例如 `import.meta`）
    const specAt = skipSpace(masked, fromAt + 4)
    if (masked[specAt] !== '"' && masked[specAt] !== "'") continue
    const str = readString(masked, specAt)
    if (!str) continue

    const clause = masked.slice(clauseStart, fromAt).trim()
    const brace = clause.match(/\{([\s\S]*)\}/)
    const head = clause.split('{')[0].trim()
    records.push({
      kind: 'static',
      spec: str.value,
      line: lineOf(masked, start),
      text: masked.slice(start, str.end).replace(/\s+/g, ' ').trim(),
      typeOnly,
      namespace: head.startsWith('*'),
      defaultName: head && !head.startsWith('*') ? head : null,
      names: brace ? parseNamedBindings(brace[1]) : [],
    })
  }
  return records
}

/**
 * 命中点所在的**语句**文本（不含 `import` 这类跨行块）。
 *
 * 用途：判断一次转型作用在什么表达式上。按 `;` `{` `}` 与空行切，够了 ——
 * TS 里没有别的语句分隔符，而这里要的是"同一条语句"，不是精确 AST。
 */
export function statementAt(text, index) {
  let start = index
  while (start > 0 && !/[;{}]/.test(text[start - 1])) start -= 1
  let end = index
  while (end < text.length && !/[;{}]/.test(text[end])) end += 1
  return { start, end, text: text.slice(start, end) }
}

/** 在遮蔽注释后的全文里跑正则，返回 {line, text, index} —— 跨行形态天然命中 */
export function findMatches(maskedText, pattern) {
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
  )
  const out = []
  for (const match of maskedText.matchAll(re)) {
    out.push({ index: match.index, line: lineOf(maskedText, match.index), match })
  }
  return out
}

/** 逐文件跑一遍：返回 [{file, text, masked}]（供各守卫自己套规则） */
export function loadSources(dir, exts) {
  return walkSources(dir, exts).map((file) => {
    const text = readFileSync(file, 'utf8')
    return { file, text, masked: maskComments(text) }
  })
}
