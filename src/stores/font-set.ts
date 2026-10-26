// 是什么：字体面板的只读投影（设置 / 快捷字体 / 层级预设 / 当前文字属性）
// 唯一入口：页面读这三份数据只能经过这个 store
// 替代了什么：原版组件里的 `set: V.a.info`、`new lv()`、`new Ft()` 直接持有真相
// 谁在用：pages/fontSet/*
// 禁止：这里不写文件、不调 jsx；写操作在 commands/fontSet.ts

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fontHistoryRepo,
  hierarchyRepo,
  quickFontRepo,
  translateCounterRepo,
  type HierarchyFile,
  type QuickFontFile,
  type TranslateCounter,
} from '@/cep/data/font-extra'
import {
  FONT_SET_DEFAULTS,
  readFontSetSettings,
  type FontSetSettings,
} from '@/cep/data/legacy-settings'
import { textInfoError, textInfoRef, typeUnitsRef } from '@/selection/current-text'
import { msg } from '@/domain/messages'
import { deepClone } from '@/utils/clone'

export const useFontSetStore = defineStore('fontSet', () => {
  // 深拷贝：默认值里有嵌套对象，浅拷贝会让多个 store 实例共享同一份 ztPasteFont
  const settings = ref<FontSetSettings>(deepClone(FONT_SET_DEFAULTS))
  const quickFonts = ref<QuickFontFile>({ index: 0, list: [] })
  const hierarchy = ref<HierarchyFile>({ index: 0, list: [] })
  const counter = ref<TranslateCounter>({ num: 0, max: 380, time: '' })
  const recentFonts = ref<string[]>([])

  /**
   * 非空 = 至少一份面板数据**读坏了**，页面必须显示（ADR-14 扩展二 / T-111）。
   *
   * 只收 **S2 档**（fallback 非空、渲染出来与"用户自己配的"不可分辨）：
   * 设置 / 快捷字体 / 层级预设 / 翻译计数。
   * **最近字体不进**——它是 S3 档（fallback `[]`），"没有最近记录"本来就是合法状态，
   * 此时"没有"与"读坏"在界面上该有相同反应，加提示只是噪音。
   *
   * 文案由本 store 写完整句、页面原句转发（ADR-23）：页面不许再补"可能不完整"这类结论。
   */
  const degraded = ref('')

  /** 当前文字属性：selection 里的唯一快照，这里只做投影 */
  const textInfo = computed(() => textInfoRef.value)
  const textError = computed(() => textInfoError.value)
  /** TypeUnits.PIXELS / POINTS / MM */
  const typeUnits = computed(() => typeUnitsRef.value)

  const activeFamily = computed(() => {
    const list = quickFonts.value.list
    const index = quickFonts.value.index
    return list[index]?.family ?? ''
  })

  async function load() {
    // 五个读全是同步的 ⇒ 不需要 `Promise.all`（它只对 Promise 有意义）
    const [settingsRead, quickRead, hierarchyRead, counterRead, historyRead] = [
      readFontSetSettings(),
      quickFontRepo.read(),
      hierarchyRepo.read(),
      translateCounterRepo.read(),
      fontHistoryRepo.read(),
    ]

    // 坏设置文件：默认值由数据层给（`legacySettingsRepo` 的 fallback `{}` 经同一处归一出），
    // store 只转发，不再自己调 `mergeFontSetSettings({})`（ADR-24）
    settings.value = settingsRead.status === 'ok' ? settingsRead.value : settingsRead.fallback

    // 读坏的四份汇成一条 `degraded`（清单 §6.7 的 S2 档）：渲染成默认值与"用户自己配的"
    // 在界面上不可分辨，所以必须让用户看见。**只有 `status:'error'` 才有 reason**——
    // 首次使用（`notSeen`）走 `status:'ok'` 且无 reason，天然不进这里（T-111 判据 C，用例钉住）
    const reasons: string[] = []
    if (settingsRead.status !== 'ok')
      reasons.push(msg.data.fn.panelSettingsReadFailed(settingsRead.reason))

    quickFonts.value = quickRead.status === 'ok' ? quickRead.value : quickRead.fallback
    if (quickRead.status !== 'ok') reasons.push(msg.data.fn.quickFontReadFailed(quickRead.reason))

    hierarchy.value = hierarchyRead.status === 'ok' ? hierarchyRead.value : hierarchyRead.fallback
    if (hierarchyRead.status !== 'ok')
      reasons.push(msg.data.fn.hierarchyReadFailed(hierarchyRead.reason))

    counter.value = counterRead.status === 'ok' ? counterRead.value : counterRead.fallback
    if (counterRead.status !== 'ok')
      reasons.push(msg.data.fn.translateCounterReadFailed(counterRead.reason))

    // 最近字体 fallback 是 `[]`（S3 档）："没有最近记录"本来就是合法状态，日志够了
    recentFonts.value = historyRead.status === 'ok' ? historyRead.value : historyRead.fallback

    degraded.value = reasons.join('；')
  }

  return {
    settings,
    quickFonts,
    hierarchy,
    counter,
    recentFonts,
    degraded,
    textInfo,
    textError,
    typeUnits,
    activeFamily,
    load,
  }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：仓库写成功后刷新投影。
 * 与 `bindFontData` 同一模式，避免测试里重复订阅。
 */
export function bindFontSetData() {
  if (bound) return
  bound = true

  quickFontRepo.onChange((value) => {
    useFontSetStore().quickFonts = value
  })
  hierarchyRepo.onChange((value) => {
    useFontSetStore().hierarchy = value
  })
  translateCounterRepo.onChange((value) => {
    useFontSetStore().counter = value
  })
  fontHistoryRepo.onChange((value) => {
    useFontSetStore().recentFonts = value
  })
}
