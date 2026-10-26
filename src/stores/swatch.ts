// 是什么：色板面板的只读投影（自定义色 / 最近色 / 最近保留条数）
// 替代了什么：原版 `sf.js` 的 `g_aZiDingYi` / `g_ShuLiang` / `GetColorArray` / `GetVecentlyArray`
//   （`:41` / `:181` / `:328-335` / `:315-322`）—— 那些是"面板自己持有真相"的写法
// 谁在用：`pages/seBan/*`（刀3）
// 禁止：这里不写文件、不调 jsx、不判重排序；写操作在 `commands/swatch.ts`

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DEFAULT_RECENT_LIMIT,
  onChange as onSwatchFileChange,
  readCustomItems,
  readRecentItems,
  readRecentLimit,
} from '@/cep/data/swatch-repo'
import { APP_EVENT_SEBAN, onAppEvent } from '@/cep/events'
import { msg } from '@/domain/messages'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'

/**
 * 色板里一条颜色项。形状照 `jsx/main.jsx:287-298`（`sb_ZhuanHuanYanSeDuiXiang`）：
 * `{ name: "未命名", color: { hex, c, m, y, k } }`，`hex` 6 位大写无 `#`，`c/m/y/k` 是 0–100 整数。
 * `isFill` 不是 jsx 加的，是主面板 `cyAutoFillColor` 分支补的（`app.v4.js:17896`）→ 可选，读的时候不猜。
 */
export interface SwatchItem {
  name: string
  color: {
    hex: string
    c?: number
    m?: number
    y?: number
    k?: number
    isFill?: boolean
  }
}

/** 与 `domain/style-library.ts` 的 `HEX_RE` 同口径：3–8 位十六进制，不含 `#` */
const HEX_RE = /^[0-9a-fA-F]{3,8}$/

function channel(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * 归一一条磁盘上的项。
 *
 * **认不出就返回 `null`**（由调用方计数后汇进 `degraded`），不补默认值、不猜字段：
 * 色板里出现非颜色项时，静默丢掉会让"我明明存了 16 条怎么少一条"永远查不出来。
 */
function toSwatchItem(raw: unknown): SwatchItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const color = record.color
  if (!color || typeof color !== 'object' || Array.isArray(color)) return null

  const hex = (color as Record<string, unknown>).hex
  if (typeof hex !== 'string' || !HEX_RE.test(hex)) return null

  const source = color as Record<string, unknown>
  const item: SwatchItem = {
    name: typeof record.name === 'string' ? record.name : '',
    color: { hex },
  }
  const c = channel(source.c)
  const m = channel(source.m)
  const y = channel(source.y)
  const k = channel(source.k)
  if (c !== undefined) item.color.c = c
  if (m !== undefined) item.color.m = m
  if (y !== undefined) item.color.y = y
  if (k !== undefined) item.color.k = k
  if (typeof source.isFill === 'boolean') item.color.isFill = source.isFill
  return item
}

export interface SwatchConvertResult {
  items: SwatchItem[]
  /** 认不出的条数；>0 时调用方要提示（不许静默丢） */
  skipped: number
}

function convert(raw: unknown[]): SwatchConvertResult {
  const items: SwatchItem[] = []
  let skipped = 0
  for (const entry of raw) {
    const item = toSwatchItem(entry)
    if (item) items.push(item)
    else skipped += 1
  }
  return { items, skipped }
}

export const useSwatchStore = defineStore('swatch', () => {
  /** 自定义色（`userColor.ini`，原版 `#div_ZiDingYi`） */
  const custom = ref<SwatchItem[]>([])
  /** 最近色（`vecently.ini`，原版 `#div_ZuiJin`） */
  const recent = ref<SwatchItem[]>([])
  /** 最近色保留条数（`zuiJinShuLiang.txt`，默认 10） */
  const recentLimit = ref(DEFAULT_RECENT_LIMIT)

  const loading = ref(false)
  /**
   * 非空 = 读失败（文件在、读不到 / 不是合法 JSON / 顶层不是数组）。
   * 页面内联显示 + 重试，**不许**把读失败画成空色板（那与"还没存过颜色"分不开）。
   */
  const error = ref('')
  /** 非空 = 读到了但有条目认不出（数量如实写出来，不静默丢） */
  const degraded = ref('')

  /** 色块可用的 CSS 值；`hex` 已在归一时校验过，这里只拼 `#` */
  const customSwatches = computed(() => custom.value.map((item) => `#${item.color.hex}`))
  const recentSwatches = computed(() => recent.value.map((item) => `#${item.color.hex}`))

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    degraded.value = ''

    try {
      // 三个文件各自读：任何一个读坏都不该把另外两个也拖成空。
      // 仓库读返回判别联合（`ok:false` 上没有 `.value`），**没有 try/catch 可吞** ——
      // 读失败必须走下面的 notes 让用户看见。
      const [customRead, recentRead, limitRead] = [
        readCustomItems(),
        readRecentItems(),
        readRecentLimit(),
      ]

      const notes: string[] = []

      if (customRead.status === 'ok') {
        const result = convert(customRead.value)
        custom.value = result.items
        // 认不出的条目：数量如实写出来（用户"存了 16 条显示 15 条"就靠这句查）
        if (result.skipped) {
          notes.push(msg.data.fn.customColorSkipped(String(result.skipped)))
        }
      } else {
        custom.value = []
        notes.push(msg.data.fn.customColorReadFailed(describeCepError(customRead.reason)))
      }

      if (recentRead.status === 'ok') {
        const result = convert(recentRead.value)
        recent.value = result.items
        if (result.skipped) {
          notes.push(msg.data.fn.recentColorSkipped(String(result.skipped)))
        }
      } else {
        recent.value = []
        notes.push(msg.data.fn.recentColorReadFailed(describeCepError(recentRead.reason)))
      }

      if (limitRead.status === 'ok') recentLimit.value = limitRead.value

      // 两个数据文件都读不到才算"整页读失败"；只坏一个时用 degraded 提示，另一个照常显示
      const reason = notes.join('；')
      if (customRead.status !== 'ok' && recentRead.status !== 'ok') error.value = reason
      // 降级说明 = **这一次读的结果**（数量 / 原因 / 要不要重试），不是常驻文案：
      // 每次 load 开头都清空，读全了就是空串 ⇒ 页面不显示任何提示。
      degraded.value = reason ? `${reason}；可点"重试"重新读取（文件被改动或权限恢复后即恢复）` : ''
      if (notes.length) log.warn('swatch', '色板读取有降级', notes)
    } finally {
      // **只有 `finally`，没有 `catch`**：
      // 读失败已经由判别联合走 `notes`（用户看得见），所以这里没有"读失败"可接。
      // 真抛出来的只可能是编程错误 —— 把它变成一句"读取失败"文案就是**把 bug 伪装成数据问题**。
      // 让它往上抛（`useCommand` 统一报），`finally` 只负责把 spinner 复位。
      loading.value = false
    }
  }

  /** 页面上的"重试"按钮 */
  function retry(): Promise<void> {
    return load()
  }

  return {
    custom,
    recent,
    recentLimit,
    loading,
    error,
    degraded,
    customSwatches,
    recentSwatches,
    load,
    retry,
  }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：两个来源都接上，**订阅点只在这里**。
 *
 * 1. 本面板的命令写完文件 → `swatch-repo` 的 `onChange` → 重读；
 * 2. 别处（主面板 / 官方色板面板）写完 → 发 `com.fengzi.event.seban`（`app.v4.js:50216-50218`）
 *    → `onAppEvent` → 重读。
 *
 * **不过滤消息体**：官方只认 `"GengXin"`（`sf.js:174`），但我们自己也在这条频道上
 * 收发 `sendColor` / `QieHuanXianKuang`，重读是幂等的、不会自激（重读不发事件）。
 * 少一个判断就少一处"消息体改名后静默不刷新"。
 */
export function bindSwatchData(): void {
  if (bound) return
  bound = true

  onSwatchFileChange(() => {
    void useSwatchStore().load()
  })
  onAppEvent(APP_EVENT_SEBAN, () => {
    void useSwatchStore().load()
  })
}
