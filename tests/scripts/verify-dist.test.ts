import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TD-17-14：产物守卫（`scripts/verify-dist.mjs`）的 `<script>` 属性判据。
 *
 * 起因：旧版用 `/<script[^>]*\bdefer\b/` 在整份 HTML 上找**子串**，于是
 * `<script data-note="defer" src="…">`（根本没有 defer 属性）也报「有 defer」；
 * 反向也错：`data-type="module"` 会被误判成 `type="module"`。
 *
 * 这里跑**真脚本**（子进程 + 真产物目录 + 环境变量 PSZ_EXT_DIR），
 * 只断言"退出码 + 文案里的判据"，不 import 内部函数——否则测的是自己，不是门禁。
 */

const SCRIPT = resolve(__dirname, '../../scripts/verify-dist.mjs')
const TAG = '<script defer src="./assets/index.js"></script>'

/** 造一个最小产物目录：index.html + 体积过关的 jsxbin（<300KB 会被单独报错，干扰断言） */
function makeDist(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'verify-dist-'))
  mkdirSync(join(dir, 'lib'), { recursive: true })
  writeFileSync(join(dir, 'index.html'), html, 'utf8')
  writeFileSync(join(dir, 'lib', 'all.decrypted.js'), Buffer.alloc(350_000))
  return dir
}

const page = (head: string) =>
  `<!doctype html>\n<html><head>${head}</head><body><div id="app"></div></body></html>\n`

function invoke(dist: string): { code: number; out: string } {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        env: { ...process.env, PSZ_EXT_DIR: dist },
      }),
    }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

describe('verify-dist · script 属性判据', () => {
  it('真 defer + src → 退出码 0', () => {
    const result = invoke(makeDist(page(TAG)))
    expect(result.code).toBe(0)
    expect(result.out).toContain('有 defer+src')
  })

  it('`data-note="defer"` 冒充 defer → 非 0（子串判定会放过这里）', () => {
    const result = invoke(
      makeDist(page('<script data-note="defer" src="./assets/index.js"></script>')),
    )
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('没有任何带 defer')
  })

  it('`data-type="module"` 不算 type="module" → 退出码 0（旧版会误杀）', () => {
    const result = invoke(
      makeDist(page('<script defer src="./assets/index.js" data-type="module"></script>')),
    )
    expect(result.code).toBe(0)
  })

  it('真 `type="module"` → 非 0，报 file:// 白屏', () => {
    const result = invoke(makeDist(page('<script type="module" src="./assets/index.js"></script>')))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('type="module"')
  })

  it('有 defer 却没有 src → 非 0', () => {
    const result = invoke(makeDist(page('<script defer></script>')))
    expect(result.code).not.toBe(0)
    expect(result.out).toContain('没有 src')
  })
})
