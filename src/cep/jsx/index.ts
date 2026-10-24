// 是什么：jsx 端口的**唯一出口**（域 → 真实实现 or 浏览器假实现）
// 唯一入口：页面/ps.ts/命令层只从这里拿 jsx，不再各自判断环境
// 替代了什么：模块求值期的 `createJsxPort(hasCep())` 快照（判据与 transport 不同口径）
// 谁在用：`ps.ts`、`commands/registry.ts`（经 ctx.jsx）
// 禁止：别处写 `if (hasCep())` 选实现；要真实 PS 能力只能从这里走

import { hasCep } from '@/cep/transport'
import { log } from '@/utils/logger'
import { createActionJsx } from './action'
import { createCommonUseJsx } from './commonUse'
import { createEnvJsx } from './env'
import { createFontJsx } from './font'
import { createLayerJsx } from './layer'
import { createLegacyJsx } from './legacy'
import { createMockJsx } from './mock'
import { createRenameJsx } from './rename'
import { createStyleJsx } from './style'
import type { JsxPort } from './types'

/** 按给定环境造一份端口实现。`createJsxPort` 导出给测试与 `portNow` 用 */
export function createJsxPort(inCep: boolean): JsxPort {
  if (!inCep) return createMockJsx()
  return {
    font: createFontJsx(),
    layer: createLayerJsx(),
    env: createEnvJsx(),
    action: createActionJsx(),
    legacy: createLegacyJsx(),
    rename: createRenameJsx(),
    style: createStyleJsx(),
    commonUse: createCommonUseJsx(),
  }
}

let cachedInCep: boolean | null = null
let cachedPort: JsxPort | null = null

/**
 * **每次调用**现问一次环境（与 `transport.runScript` 同一判据）。
 *
 * 以前是模块求值期快照：快照一旦为假，这个会话里所有 PS 操作都落到 mock，
 * 而 mock 每个函数都返回成功 → 面板弹「完成」、数据全是假的，唯一痕迹是启动日志
 * 一句 warn（TD-13-7）。判据只有一份、且在调用点，才不会有第二个真相。
 *
 * 端口本身按环境缓存：同一环境下重复构造 8 个域没有意义，环境变了才重建。
 */
function portNow(): JsxPort {
  const inCep = hasCep()
  if (cachedPort && cachedInCep === inCep) return cachedPort

  cachedPort = createJsxPort(inCep)
  cachedInCep = inCep
  if (!inCep) {
    log.warn('jsx', '当前不在 CEP 环境，本次调用走 mock（返回成功不代表 Photoshop 真的改了）')
  }
  return cachedPort
}

/**
 * 一个域的惰性代理：读方法时才定实现。
 *
 * 用 `Proxy` 而不是在模块里逐方法转调，是因为 `JsxPort` 的域接口会持续长函数；
 * 手写转调漏一个就编译不过，Proxy 不会漏。
 */
function lazyDomain<K extends keyof JsxPort>(key: K): JsxPort[K] {
  return new Proxy({} as JsxPort[K], {
    get(_target, property) {
      return Reflect.get(portNow()[key], property)
    },
  })
}

export const jsx: JsxPort = {
  font: lazyDomain('font'),
  layer: lazyDomain('layer'),
  env: lazyDomain('env'),
  action: lazyDomain('action'),
  legacy: lazyDomain('legacy'),
  rename: lazyDomain('rename'),
  style: lazyDomain('style'),
  commonUse: lazyDomain('commonUse'),
}
export type { JsxPort } from './types'
