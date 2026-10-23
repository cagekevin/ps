import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * T-97-1：常用页**每个按钮都必须有 `@click`**（或明确禁用）——真机上「转链接智能对象」点了没反应
 * 就是这类：按钮在、样式在、`@click` 没有，所有静态门禁都绿。
 *
 * 判据：本页 `src/pages/commonUse/**` 下每个 `<GButton>` 标签里必须出现 `@click`；
 * 少数"故意不可点"的按钮必须显式写 `disabled`，不许留空白。
 */

const PAGE_DIR = resolve(__dirname, '../../src/pages/commonUse')

/** 找出所有缺 `@click` 的 `<GButton>`（返回 `文件:行` 列表） */
export function findButtonsWithoutClick(text: string, label = 'x.vue'): string[] {
  const out: string[] = []
  const re = /<GButton\b([\s\S]*?)\/?>/g
  let match
  while ((match = re.exec(text)) !== null) {
    const body = match[1]
    if (/@click\s*=/.test(body) || /\bdisabled\b/.test(body)) continue
    const line = text.slice(0, match.index).split('\n').length
    const tag = body.replace(/\s+/g, ' ').trim().slice(0, 40)
    out.push(`${label}:${line}  ${tag}`)
  }
  return out
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/**
 * 已知未接的按钮（白名单）。**只允许变短**：
 * 刀 2（comembed 两个按钮 + 两个新 jsx 包装）落地时把这两条删掉——留着就说明没接。
 * 判据：白名单里的每条都必须真实存在，否则报"过期条目"（防止删了代码忘删白名单）。
 */
const KNOWN_DEAD: string[] = []

describe('常用页：按钮必须有 @click', () => {
  it('全页扫一遍，缺 @click 的按钮只剩白名单里那几条', () => {
    const offenders: string[] = []
    for (const file of walk(PAGE_DIR)) {
      offenders.push(
        ...findButtonsWithoutClick(readFileSync(file, 'utf8'), relative(PAGE_DIR, file)),
      )
    }
    // Windows 上 relative 返回反斜杠，白名单统一用正斜杠
    const keys = offenders.map((line) => line.split(' ')[0].replace(/\\/g, '/'))
    const unexpected = offenders.filter((_, index) => !KNOWN_DEAD.includes(keys[index]))
    expect(unexpected, `这些按钮点了没反应（且不在白名单里）：\n${unexpected.join('\n')}`).toEqual(
      [],
    )
    const stale = KNOWN_DEAD.filter((key) => !keys.includes(key))
    expect(stale, `白名单里的这些按钮已经不存在了，删掉它们：${stale.join('、')}`).toEqual([])
  })

  it('检查器本身能红：给一个没有 @click 的按钮必须报出来', () => {
    const broken = `<template>\n  <GButton width="half">转链接智能对象</GButton>\n</template>\n`
    expect(findButtonsWithoutClick(broken, 'broken.vue')).toHaveLength(1)
  })

  it('有 @click 或显式 disabled 的不算违规', () => {
    const ok = `<template>\n  <GButton @click="run">A</GButton>\n  <GButton disabled>B</GButton>\n</template>\n`
    expect(findButtonsWithoutClick(ok, 'ok.vue')).toEqual([])
  })
})
