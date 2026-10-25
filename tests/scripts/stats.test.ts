import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * `stats.mjs` 的**计数口径**自检。
 *
 * 为什么需要它：`stats:check` 只比对「文档值 == 脚本算值」——`compute()` 自己算错时
 * **两边一致、照样绿**。所以口径必须用「已知答案的夹具」钉住，而不是靠文档与脚本互相背书。
 *
 * 这里跑**真脚本**（`--json` + `--root=<夹具>`），断言的是夹具里故意埋的几种写法：
 * `.test(` 真方法调用、`it.each` 不展开、变量拼出来的 `id`、`_` 前缀内部页、非域文件。
 * 每条都对应 compute() 头部注释里写明的口径，不是"我看代码觉得应该是 2"。
 */

const SCRIPT = resolve(__dirname, '../../scripts/stats.mjs')

function w(root: string, rel: string, content: string): void {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

/** 已知答案的夹具：每处数字都写死在图里，改动任何一处都要同时改下面的断言 */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'stats-'))

  // 命令：3 条字面量 id（含 legacy 域）；registry 属非域文件；模板串拼的 id 不计
  w(
    root,
    'src/commands/alpha.ts',
    [
      "export const a = defineCommand({ id: 'alpha.one', invoke() {} })",
      "export const b = defineCommand({ id: 'alpha.two', invoke() {} })",
      "export const c = defineCommand({ id: 'legacy.keep', invoke() {} })",
      'export const d = defineCommand({ id: `${kind}.dyn`, invoke() {} })',
      '',
    ].join('\n'),
  )
  w(root, 'src/commands/registry.ts', "export const r = defineCommand({ id: 'nope.counted' })\n")

  // 用例：it( + test( = 2；`it.each` 按 1 处 eachSites、不进 cases；`/x/.test(` 不算用例
  w(
    root,
    'tests/demo/sample.test.ts',
    [
      "import { describe, expect, it, test } from 'vitest'",
      "describe('x', () => {",
      "  it('a', () => {",
      "    expect(/size/.test('size=12')).toBe(true)",
      '  })',
      "  test('b', () => {})",
      "  it.each([1, 2])('c %s', () => {})",
      '})',
      '',
    ].join('\n'),
  )
  // 非 .test.ts 文件里的 it( 不参与用例数
  w(root, 'tests/demo/helper.ts', "export const fake = it('not-a-file-case')\n")

  // 页面：`_` 前缀内部页排除；没有 index.vue 的目录不算页
  w(root, 'src/pages/alpha/index.vue', '<template><div /></template>\n')
  w(root, 'src/pages/_probe/index.vue', '<template><div /></template>\n')
  w(root, 'src/pages/_atoms/index.vue', '<template><div /></template>\n')
  w(root, 'src/pages/notAPage/other.vue', '<template><div /></template>\n')

  // 宿主事件：EVENT_IDS 记录 3 条
  w(
    root,
    'src/cep/events.ts',
    ['const EVENT_IDS = {', "  a: 'foo',", "  b: 'bar',", "  c: 'baz',", '} as const', ''].join(
      '\n',
    ),
  )

  // 组件只数顶层 .vue；子目录不算
  w(root, 'src/components/A.vue', '<template><div /></template>\n')
  w(root, 'src/components/B.vue', '<template><div /></template>\n')
  w(root, 'src/components/sub/C.vue', '<template><div /></template>\n')

  w(root, 'src/assets/icons-sprite.svg', '<svg><symbol id="a"/><symbol id="b"/></svg>\n')
  return root
}

type Metrics = {
  commands: { total: number; byDomain: Record<string, number> }
  tests: { files: number; cases: number; eachSites: number }
  components: number
  icons: number
  pages: number
  hostEvents: number
}

function metrics(root: string): Metrics {
  const out = execFileSync(process.execPath, [SCRIPT, '--json', `--root=${root}`], {
    encoding: 'utf8',
  })
  return JSON.parse(out)
}

describe('stats · compute() 口径自检', () => {
  it('.test( 真方法调用不算用例；it.each 不展开（cases=2，eachSites=1）', () => {
    const m = metrics(fixture())
    expect(m.tests.cases).toBe(2)
    expect(m.tests.eachSites).toBe(1)
  })

  it('只数 .test.ts：非测试文件里的 it( 不计；文件数按 .test.ts 算', () => {
    const m = metrics(fixture())
    expect(m.tests.files).toBe(1)
  })

  it('命令按单引号字面量 id 计数、含 legacy 域、非域文件不计、模板串不计', () => {
    const m = metrics(fixture())
    expect(m.commands.total).toBe(3)
    expect(m.commands.byDomain).toEqual({ alpha: 2, legacy: 1 })
  })

  it('页面数排除 `_` 前缀内部目录，且必须有 index.vue', () => {
    const m = metrics(fixture())
    expect(m.pages).toBe(1)
  })

  it('宿主事件数按 EVENT_IDS 记录条目', () => {
    const m = metrics(fixture())
    expect(m.hostEvents).toBe(3)
  })

  it('组件数只数 src/components 顶层 .vue；图标数按 <symbol>', () => {
    const m = metrics(fixture())
    expect(m.components).toBe(2)
    expect(m.icons).toBe(2)
  })
})
