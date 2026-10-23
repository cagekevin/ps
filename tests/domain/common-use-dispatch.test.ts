import { describe, expect, it } from 'vitest'
import snapshot from '../../docs/生成/常用页-左键分派.json'
import { LEFT_CLICK_BY_NAME, TARGET_ACTIONS, leftClickOf } from '@/domain/common-use-dispatch'
import { get } from '@/commands/registry'

// 命令注册发生在模块加载时（@/commands 的副作用），不 import 就是空注册表
await import('@/commands')

/**
 * T-97-1：左键分派表 ↔ 官方快照（**外部预言机**）。
 *
 * 快照由 `scripts/common-use-dispatch.mjs` 从 `app.v4.js:37894` 的分派链生成，
 * 这里只比对，不复制解析逻辑——否则又是"测试自己证明自己"。
 */

describe('左键分派表与官方快照一致', () => {
  it('快照本身：来自 :37894，14 条', () => {
    expect(snapshot.chainLine).toBe(37894)
    expect(snapshot.entries).toHaveLength(14)
  })

  it('逐格一致：官方 target → 我方动作（方向一：快照里的每一格我们都有）', () => {
    const mismatched: string[] = []
    for (const entry of snapshot.entries) {
      const ours = LEFT_CLICK_BY_NAME[entry.name]
      const expected = TARGET_ACTIONS[entry.target]
      if (!ours) {
        mismatched.push(`${entry.name}：我方表里没有`)
        continue
      }
      if (!expected) {
        mismatched.push(`${entry.name}：官方 target「${entry.target}」没有对应动作`)
        continue
      }
      if (JSON.stringify(ours) !== JSON.stringify(expected)) {
        mismatched.push(
          `${entry.name}：我方 ${JSON.stringify(ours)} ≠ 官方 ${JSON.stringify(expected)}`,
        )
      }
    }
    expect(mismatched, `与官方分派表不一致：\n${mismatched.join('\n')}`).toEqual([])
  })

  it('方向二：我方表里不许有快照里没有的名字（新增格子必须先更新快照）', () => {
    const officialNames = new Set(snapshot.entries.map((e) => e.name))
    const extra = Object.keys(LEFT_CLICK_BY_NAME).filter((name) => !officialNames.has(name))
    expect(extra, `这些名字在官方分派链里没有：${extra.join('、')}`).toEqual([])
  })

  it('表里的命令 id 全部真实注册过（不是编的）', () => {
    const missing: string[] = []
    for (const [name, action] of Object.entries(LEFT_CLICK_BY_NAME)) {
      if (action.kind !== 'command') continue
      if (!get(action.command)) missing.push(`${name} → ${action.command}`)
    }
    expect(missing, `这些命令 id 没注册：\n${missing.join('\n')}`).toEqual([])
  })

  it('未知名字 = 官方默认分支（什么都不做）', () => {
    expect(leftClickOf('不存在的格子')).toEqual({ kind: 'none' })
  })

  it('官方只有 3 格左键=展开（防止再退回"有子面板就展开"）', () => {
    const expands = snapshot.entries.filter((e) => e.kind === 'expand').map((e) => e.name)
    expect(expands).toEqual(['自定义变换', '参考线工具', '按间距分布'])
  })
})
