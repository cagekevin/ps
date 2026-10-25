import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 「日志」这个能力的**对外形状**是机器判据，不是靠人记。
 *
 * 判据（照七步法「唯一入口」= 外面看不见里面）：
 * ① `utils/logger.ts` **只导出 `log` 一个东西**；`log` 上只有 **4 个记录 + 1 个读**，
 *    **没有"装配"方法**（装配不是 API）；
 * ② 落盘口是**普通形状**（没有品牌）：因为没有"装 sink"的 API 给人调，也无从伪造；
 * ③ 装配**不是一个动作**：`utils/logger.ts` 在自己模块顶层 import 落盘实现并装上，
 *    `main.ts` 与业务层**不参与**（也没有任何 API 可参与）。
 *
 * 这是**扫描型测试**（扫全仓、查不变量），按七步法 Step 7.2 的补充说明不属自证式断言：
 * 注入违规（多一个 export / log 上多一个方法 / 业务层碰装配）**会红**。
 */
const ROOT = join(import.meta.dirname, '..', '..')
const SRC = join(ROOT, 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.ts') || p.endsWith('.vue')) out.push(p)
  }
  return out
}

describe('日志 · 对外形状（唯一入口）', () => {
  it('① logger.ts 只导出 log 一个东西（深模块 = 外面只看得见一个）', () => {
    const text = readFileSync(join(SRC, 'utils/logger.ts'), 'utf8')
    const runtime = [...text.matchAll(/^export (?:function|const|class) (\w+)/gm)].map((m) => m[1])
    const types = [...text.matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1])

    // 运行时出口：**只有一个** —— log
    expect(runtime).toEqual(['log'])
    // 类型出口：**一个都没有**（落盘口的形状住在落盘实现那边）
    expect(types).toEqual([])
  })

  it('①b log 上只有 4 个记录 + 1 个读（没有装配方法）', () => {
    const text = readFileSync(join(SRC, 'utils/logger.ts'), 'utf8')
    const start = text.indexOf('export const log = {')
    const end = text.indexOf('\n}', start)
    const block = text.slice(start, end)
    const members = [...block.matchAll(/^ {2}(\w+)/gm)].map((m) => m[1])
    expect(members.sort()).toEqual(['debug', 'dump', 'error', 'info', 'warn'])
  })

  it('② 落盘口是普通形状（没有品牌）—— 因为没有"装 sink"的 API 给人调', () => {
    const text = readFileSync(join(SRC, 'cep/log-file.ts'), 'utf8')
    const sinkType = text.slice(text.indexOf('export interface DiskLogSink {'))
    expect(sinkType.slice(0, 200)).not.toContain('unique symbol')
    expect(sinkType.slice(0, 200)).not.toMatch(/\[DISK/)
  })

  it('③ 装配不是一个动作：main.ts 不参与', () => {
    const main = readFileSync(join(SRC, 'main.ts'), 'utf8')
    expect(main).not.toContain('installLogSink')
    expect(main).not.toContain('createLogFileSink')
    expect(main).not.toContain('attachDiskSink')
    expect(main).not.toMatch(/from ['"](?:@\/|\.\/)cep\/log-file['"]/)
  })

  it('③b 业务层没有任何 API 可以参与装配', () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/')
      if (rel === 'src/utils/logger.ts' || rel === 'src/cep/log-file.ts') continue
      const text = readFileSync(file, 'utf8')
      if (/attachDiskSink|installDiskSink|createLogFileSink/.test(text)) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })

  it('③c 落盘实现只提供实现，不 import logger（否则成环）', () => {
    const text = readFileSync(join(SRC, 'cep/log-file.ts'), 'utf8')
    expect(text).not.toMatch(/import .*from '@\/utils\/logger'/)
    const runtime = [...text.matchAll(/^export (?:function|const|class) (\w+)/gm)].map((m) => m[1])
    expect(runtime).toEqual(['createLogFileSink'])
  })

  it('③d logger 在自己模块顶层 import 落盘实现并装上（import 即装）', () => {
    const text = readFileSync(join(SRC, 'utils/logger.ts'), 'utf8')
    // 值导入（不是 import type）⇒ 它真的把落盘实现拉进来
    expect(text).toMatch(/import \{ createLogFileSink[^}]*\} from '@\/cep\/log-file'/)
    // 装配不能在某个导出的函数里（否则就成了"谁去调"的动作）
    expect(text).not.toMatch(/^export function installDiskSink/m)
  })

  // 跑一次完整 vue-tsc（要几秒；并行跑全量测试时更慢 ⇒ 给足超时）
  it('③e 业务代码就算写出来也接不上（编译期就红）', { timeout: 120_000 }, () => {
    // 探针：业务代码试图自己造一个落盘口挂上去 —— 现在**没有任何 API 可挂** ⇒ 编译期就红
    const probe = join(SRC, '__forgery_probe__.ts')
    const probeCode = [
      "import { log } from '@/utils/logger'",
      'log.attachDiskSink({ load: () => [], append: () => {} })',
      '',
    ].join('\n')
    writeFileSync(probe, probeCode, 'utf8')
    try {
      let output = ''
      let code = 0
      try {
        execFileSync('npx', ['vue-tsc', '--noEmit'], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (e) {
        const err = e as { status?: number; stdout?: string; stderr?: string }
        code = err.status ?? 1
        output = `${err.stdout ?? ''}${err.stderr ?? ''}`
      }
      // 必须红（log 上没有 attachDiskSink 这个方法了）
      expect(code).not.toBe(0)
      expect(output).toContain('__forgery_probe__')
      expect(output).toContain('attachDiskSink')
    } finally {
      rmSync(probe, { force: true })
    }
  })
})
