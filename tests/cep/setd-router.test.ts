import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifySetd, SETD_ROUTES, type PhotoshopEventPayload } from '@/cep/events'

/**
 * T-87 靶点⑯：`setd` 路由**不是自证**。
 *
 * 我方这张表（`cep/events.ts` 的 `SETD_ROUTES`）的价值全在"和官方一致"，
 * 所以期望值**不从我们的代码来**——每次跑测试都回原版源码
 * （`docs/原版/01-原版源码/panel/js/app.v4.js` 的 `case 1936028772:` 段）重算一遍。
 * 官方加了新分支而我没跟上，这条会红；我自己编一个官方没有的分支，这条也会红。
 */

const SOURCE = resolve(process.cwd(), 'docs/原版/01-原版源码/panel/js/app.v4.js')

/** 官方 `setd`（1936028772）分支里出现的判据对，按源码顺序 */
function officialSetdRoutes(): Array<{ field: string; value: string }> {
  const lines = readFileSync(SOURCE, 'utf8').split('\n')
  const start = lines.findIndex((line) => line.trim().startsWith('case 1936028772:'))
  expect(start, '原版源码里应能找到 case 1936028772（setd）').toBeGreaterThan(0)

  const block: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s{12}case \d+:/.test(lines[i])) break
    block.push(lines[i])
  }
  const text = block.join('\n')

  const routes: Array<{ field: string; value: string }> = []
  // 只认 `== "字面量"` / `=== "字面量"`；`!= "undefined"` 这类类型判空不算分支
  const pattern = /(null\._property|to\._obj)\s*={2,3}\s*"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    routes.push({ field: match[1], value: match[2] })
  }
  return routes
}

describe('setd 路由与官方源码一致', () => {
  it('我方 SETD_ROUTES 与 app.v4.js:69412-69423 的分支逐条一一对应（含顺序）', () => {
    expect(SETD_ROUTES.map((route) => ({ ...route }))).toEqual(officialSetdRoutes())
  })
})

describe('classifySetd', () => {
  const payload = (eventData: PhotoshopEventPayload['eventData']): PhotoshopEventPayload => ({
    eventID: 1936028772,
    eventData,
  })

  it.each([
    ['foregroundColor', { null: { _property: 'foregroundColor' } }],
    ['backgroundColor', { null: { _property: 'backgroundColor' } }],
    ['textStyle', { to: { _obj: 'textStyle' } }],
    ['singleRow', { to: { _obj: 'singleRow' } }],
    ['singleColumn', { to: { _obj: 'singleColumn' } }],
  ])('认得出 %s', (expected, eventData) => {
    expect(classifySetd(payload(eventData))).toBe(expected)
  })

  it('未登记类型不许被当成某一支（返回 null，官方那支就是什么都不做）', () => {
    expect(classifySetd(payload({ null: { _property: 'layerSection' } }))).toBeNull()
    expect(classifySetd(payload({ to: { _obj: 'gradientLayer' } }))).toBeNull()
    expect(classifySetd(payload({}))).toBeNull()
    expect(classifySetd(undefined)).toBeNull()
  })

  it('同时带两个判据时按官方顺序先判 null._property', () => {
    expect(
      classifySetd(payload({ null: { _property: 'backgroundColor' }, to: { _obj: 'textStyle' } })),
    ).toBe('backgroundColor')
  })
})
