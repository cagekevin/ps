/**
 * `window.cep`（CEP 的 Node 侧 API）—— 文件对话框与外链。
 *
 * **为什么必须单开一个文件**：这两条分支只在"cep 在"时才走，而 jsdom 里 `window.cep` 恒
 * `undefined` ⇒ 不装假 cep 就永远测不到它们。那是"检测母体缺位"：代码怎么写都绿，
 * 因为被测分支从来没进过。
 *
 * 装法走 `host-stub` 的 `installHostCep()`（**注入**，不写 `window`；见 `tests/helpers/host-stub.ts`）。
 *
 * 契约（读自 `src/cep/dialog.ts` / `src/cep/open-url.ts`，不是猜的）：
 * - 没有 cep ⇒ 抛 `CepError('NO_CEP')`，**不是**返回 `null`（`null` 表示"用户取消"，两者不能混）；
 * - `err === 0` 才算成功（CEP 原生口径，与 jsx 的 `err == 1` 判失败**不是同一套**）；
 * - 路径一律把反斜杠归一成正斜杠；
 * - `saveFile` 的扩展名缺失时补 `extensions[0]`，且**大小写不敏感**地判"已经有了"。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { openFile, saveFile } from '@/cep/dialog'
import { getCep, getRequire } from '@/cep/host'
import { openUrlInDefaultBrowser } from '@/cep/open-url'
import {
  installHostCep,
  installHostRequire,
  removeHostCep,
  removeHostRequire,
} from '../helpers/host-stub'

afterEach(() => {
  removeHostCep()
  removeHostRequire()
  // "注入优先于 window"那条会临时往 window 塞值，这里连 window 一起清干净
  Reflect.deleteProperty(window, 'cep')

  // 桩不许留在环境里：卸完必须"没有 cep"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(getCep()).toBeUndefined()
})

describe('host · 注入语义（不是 dialog 的事，但没有别的文件守它）', () => {
  it('注入优先于 window：window.cep 在也不读它', () => {
    Reflect.set(window, 'cep', {
      fs: { showOpenDialogEx: () => ({ err: 0, data: ['/from-window.kup'] }) },
    })
    installHostCep({ fs: { showOpenDialogEx: () => ({ err: 0, data: ['/injected.kup'] }) } })

    expect(openFile('打开样式库', ['kup'])).toBe('/injected.kup')
  })

  it('装 cep 不冲掉已装的 require（`setHostDeps` 是合并语义，不是整体替换）', () => {
    const fakeRequire = (id: string) => ({ id })
    installHostRequire(fakeRequire)

    installHostCep({ util: { openURLInDefaultBrowser: () => {} } })

    expect(getRequire()).toBe(fakeRequire)
  })
})

describe('dialog · 没有 window.cep', () => {
  it('openFile 抛 NO_CEP（不许把"没有 CEP"当成"用户取消"返回 null）', () => {
    expect(() => openFile('打开样式库', ['kup'])).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })

  it('saveFile 同样抛 NO_CEP', () => {
    expect(() => saveFile('导出', ['dzx'], '未命名')).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })
})

describe('dialog · CEP 在 · openFile', () => {
  it('err=0 且挑中文件 → 返回归一化成正斜杠的路径', () => {
    installHostCep({
      fs: { showOpenDialogEx: () => ({ err: 0, data: ['C:\\Users\\x\\库.kup'] }) },
    })

    expect(openFile('打开样式库', ['kup'])).toBe('C:/Users/x/库.kup')
  })

  it('err≠0（用户取消）→ null，不抛', () => {
    installHostCep({ fs: { showOpenDialogEx: () => ({ err: 1, data: [] }) } })

    expect(openFile('打开样式库', ['kup'])).toBeNull()
  })

  it('err=0 但没挑中任何文件 → null（不是拿 "" 当路径交下去）', () => {
    installHostCep({ fs: { showOpenDialogEx: () => ({ err: 0, data: [] }) } })

    expect(openFile('打开样式库', ['kup'])).toBeNull()
  })

  it('把"单文件 + 不选目录 + 后缀表"原样交给宿主（不让宿主弹多选）', () => {
    const calls: unknown[][] = []
    installHostCep({
      fs: {
        showOpenDialogEx: (...args: unknown[]) => {
          calls.push(args)
          return { err: 0, data: ['/a.kup'] }
        },
      },
    })

    openFile('打开样式库', ['kup', 'kux'])

    expect(calls).toEqual([[false, false, '打开样式库', '', ['kup', 'kux']]])
  })

  it('err=0 但挑中的是空串 → null（空串不是路径，不能交给调用方去拼目录）', () => {
    installHostCep({ fs: { showOpenDialogEx: () => ({ err: 0, data: [''] }) } })

    expect(openFile('打开样式库', ['kup'])).toBeNull()
  })

  it('fs 在但缺 showOpenDialogEx（老宿主）→ 抛 CepError(NO_CEP)，不是裸 TypeError', () => {
    installHostCep({ fs: {} })

    expect(() => openFile('打开样式库', ['kup'])).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })
})

describe('dialog · CEP 在 · saveFile', () => {
  it('err=0 → 返回路径，且已带后缀（大小写不同）不重复补', () => {
    installHostCep({ fs: { showSaveDialogEx: () => ({ err: 0, data: 'D:/导出/样式.KUP' }) } })

    expect(saveFile('导出样式库', ['kup'], '样式')).toBe('D:/导出/样式.KUP')
  })

  it('没带后缀 → 自动补 extensions[0]', () => {
    installHostCep({ fs: { showSaveDialogEx: () => ({ err: 0, data: 'D:/导出/样式' }) } })

    expect(saveFile('导出样式库', ['kup'], '样式')).toBe('D:/导出/样式.kup')
  })

  it('后缀表为空 → 一个字符都不补（不许拼出孤零零的 "."）', () => {
    installHostCep({ fs: { showSaveDialogEx: () => ({ err: 0, data: 'D:/导出/样式' }) } })

    expect(saveFile('导出样式库', [], '样式')).toBe('D:/导出/样式')
  })

  it('err≠0（用户取消）→ null，不抛', () => {
    installHostCep({ fs: { showSaveDialogEx: () => ({ err: 1, data: '' }) } })

    expect(saveFile('导出样式库', ['kup'], '样式')).toBeNull()
  })

  it('err=0 但返回空串（取消的另一种形态）→ null', () => {
    installHostCep({ fs: { showSaveDialogEx: () => ({ err: 0, data: '' }) } })

    expect(saveFile('导出样式库', ['kup'], '样式')).toBeNull()
  })

  it('把"标题 + 空初始目录 + 后缀表 + 默认名 + 空友好名"原样交给宿主', () => {
    const calls: unknown[][] = []
    installHostCep({
      fs: {
        showSaveDialogEx: (...args: unknown[]) => {
          calls.push(args)
          return { err: 0, data: '/a.kup' }
        },
      },
    })

    saveFile('导出样式库', ['kup'], '样式')

    expect(calls).toEqual([['导出样式库', '', ['kup'], '样式', '']])
  })

  it('fs 在但缺 showSaveDialogEx（老宿主）→ 抛 CepError(NO_CEP)，不是裸 TypeError', () => {
    installHostCep({ fs: { showOpenDialogEx: () => ({ err: 0, data: [] }) } })

    expect(() => saveFile('导出样式库', ['kup'], '样式')).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })
})

describe('open-url · 系统浏览器', () => {
  it('没有 window.cep → 抛 NO_CEP（不许静默什么都不做）', () => {
    expect(() => openUrlInDefaultBrowser('https://example.com')).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })

  it('cep 在但没有 util → 抛 NO_CEP', () => {
    installHostCep({ fs: {} })

    expect(() => openUrlInDefaultBrowser('https://example.com')).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })

  it('util 在但没有 openURLInDefaultBrowser（老宿主）→ 抛 NO_CEP，不假装打开过', () => {
    installHostCep({ util: {} })

    expect(() => openUrlInDefaultBrowser('https://example.com')).toThrow(
      expect.objectContaining({ code: 'NO_CEP' }),
    )
  })

  it('齐全 → 原样把 url 交给系统浏览器', () => {
    const opened: string[] = []
    installHostCep({ util: { openURLInDefaultBrowser: (url) => opened.push(url) } })

    openUrlInDefaultBrowser('https://example.com/a?b=1')

    expect(opened).toEqual(['https://example.com/a?b=1'])
  })
})
