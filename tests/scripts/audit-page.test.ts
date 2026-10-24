import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

/**
 * TD-17-4 / TD-17-14：`audit-page.mjs` 从「孤岛脚本」变成**被钉住的工具**。
 *
 * 判据只有两条，正好对应它此前的两个毛病：
 *   ① 数据在库时要真能跑（不是"写了没人跑"）；
 *   ② 外部数据缺席时要**说清缺什么**（退出码 2 + `[缺数据]` 提示），
 *      而不是把 ENOENT 堆栈糊出来、也不是假装成功。
 *
 * 跑**真脚本**子进程：`audit-page` 读的是仓库里 74k 行的原版源码，
 * 不 import 内部函数、不改它的任何实现。
 */

const SCRIPT = resolve(__dirname, '../../scripts/audit-page.mjs')

function run(args: string[]): { code: number; out: string } {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }),
    }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

describe('audit-page · 接线与缺数据行为', () => {
  it('数据在库时能跑：Action 页解析出 render 与组件树（退出码 0）', () => {
    const result = run(['Action'])
    expect(result.code).toBe(0)
    expect(result.out).toContain('# Action')
    expect(result.out).toContain('render=')
  })

  it('外部数据缺席时退出码 2 且说清缺什么（不是 ENOENT 堆栈）', () => {
    const result = run(['Action', '--src=56d7'])
    expect(result.code).toBe(2)
    expect(result.out).toContain('[缺数据]')
    expect(result.out).toContain('需要')
    expect(result.out).not.toContain('ENOENT')
  })
})
