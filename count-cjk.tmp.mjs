// 一次性统计脚本：数「页面/组件层」含中文的行（区分注释 / <style> / 模板 / 脚本字面量）
// 只读，不写任何业务文件。用完即删。文件清单由外部 git ls-files 写入 filelist.txt。
import { readFileSync } from 'node:fs'

const files = readFileSync('filelist.txt', 'utf8').split(/\r?\n/).filter(Boolean)

const CJK = /[\u4e00-\u9fff]/
const results = []

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  let inStyle = false
  let inScriptComment = false
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (f.endsWith('.vue')) {
      if (/^<style[\s>]/.test(t)) inStyle = true
      if (inStyle) {
        if (/^<\/style>/.test(t)) inStyle = false
        continue
      }
      if (/^<template[\s>]/.test(t) || /^<\/template>/.test(t) || /^<script[\s>]/.test(t) || /^<\/script>/.test(t)) continue
    }
    if (inScriptComment) {
      if (/\*\//.test(t)) inScriptComment = false
      continue
    }
    if (/^\/\*/.test(t) && !/\*\/\s*$/.test(t)) { inScriptComment = true; continue }
    if (/^\/\//.test(t)) continue
    if (/^\*/.test(t)) continue
    if (/^\{\/\*/.test(t)) continue
    if (!CJK.test(t)) continue
    hits.push(`${f}:${i + 1}: ${t}`)
  }
  if (hits.length) results.push({ file: f, count: hits.length, hits })
}

results.sort((a, b) => b.count - a.count)
const total = results.reduce((s, r) => s + r.count, 0)
console.log('FILES_WITH_CJK_CODE_LINES', results.length)
console.log('TOTAL_CJK_CODE_LINES', total)
console.log('--- per file ---')
for (const r of results) console.log(String(r.count).padStart(4), r.file)
console.log('--- all hits ---')
for (const r of results) for (const h of r.hits) console.log(h)
