import { defineStore } from 'pinia'
import { ref } from 'vue'
import { familyLang } from '@/domain/font-lang'
import { msg } from '@/domain/messages'
import { getFontList } from '@/cep/data/font-list'
import { readFontStars, readFontTags } from '@/cep/data/font-meta'
import { starsRepo, tagsRepo } from '@/cep/data'
import { describeCepError } from '@/utils/error-text'
import { log } from '@/utils/logger'
import { usePersistedRef } from '@/composables/usePersisted'
import type { FontTag } from '@/cep/types'
import type { FontItem } from '@/domain/font-item'

/** 预览档位，对齐原面板的 xg 数组 */
export type PreviewMode = 'none' | 'small' | 'medium' | 'large' | 'extra-large'

export const PREVIEW_MODES: PreviewMode[] = ['none', 'small', 'medium', 'large', 'extra-large']

export const PREVIEW_LABEL: Record<PreviewMode, string> = {
  none: '普通列表',
  small: '小预览',
  medium: '中预览',
  large: '大预览',
  'extra-large': '超大预览',
}

/**
 * 家族名 → 中/英。**判据只有一处**：`domain/font-lang`。
 * 这里保留同名转发，是因为 `fontSet` 页的字体下拉已经在 import 它；
 * 转发不是第二份实现——规则本身不在这个文件里。
 */
export { familyLang }

export function previewText(family: string): string {
  return familyLang(family) === 'en' ? 'Crazy Design' : '设计助理'
}

/**
 * 字体相关的跨页面**只读投影**。
 *
 * 写操作全部在 `commands/font.ts`（ADR-16）。这里只负责：
 * 读一次、缓存、订阅仓库变更后刷新。
 * 列表数据不在这里 —— 列表归页面自己的 `usePagedList`。
 */
export const useFontStore = defineStore('font', () => {
  const tags = ref<FontTag[]>([])
  const tagsError = ref('')
  const stars = ref<Record<string, number>>({})
  /**
   * 星级读不到的原因。
   *
   * 与 `tagsError` 同一口径：读失败必须落到界面上一句话，不能让"评分全是 0"冒充
   * "你还没收藏过"。列表本身不受影响——评分是装饰，不因为读不到就不显示字体。
   */
  const starsError = ref('')
  const previewMode = usePersistedRef<PreviewMode>('font.previewMode', 'small')
  /** 用户自定义的预览文案；空字符串表示用默认（按语言自动选） */
  const customPreviewText = usePersistedRef<string>('font.previewText', '')

  /**
   * 字体列表读取入口。
   *
   * 数据在 `cep/data/font-list.ts`，本 store 只做只读投影：页面只有"读模型"和"命令"两条通道，
   * 这样"页面不碰 cep"是结构事实，不靠 eslint 拦——页面若经 ps.ts 取数据就破了这层。
   */
  async function fetchList(opts: { refresh?: boolean } = {}): Promise<FontItem[]> {
    return getFontList(opts)
  }

  async function loadStars() {
    try {
      const read = readFontStars()
      stars.value = read.status === 'ok' ? read.value : read.fallback
      starsError.value = read.status === 'error' ? msg.data.fn.starsReadFailed(read.reason) : ''
      if (read.status === 'error')
        log.warn('font', '星级读不到：界面显示"读不到"，不是"未收藏"', read.reason)
    } catch (e) {
      stars.value = {}
      starsError.value = msg.data.fn.starsReadFailed(describeCepError(e))
      log.warn('font', '星级读不到：界面显示"读不到"，不是"未收藏"', e)
    }
  }

  /** force 用于仓库变更后的强制刷新；普通调用命中缓存就返回 */
  async function loadTags(force = false) {
    if (!force && tags.value.length) return
    // `readFontTags()` **不抛**（读失败在判别联合里），直接判 `ok` 取数据或原因：
    // `tagsError` 只在读失败时设置，不是永远装饰的错误通道。
    const read = readFontTags()
    tags.value = read.status === 'ok' ? read.value : read.fallback
    tagsError.value = read.status === 'error' ? read.reason : ''
  }

  function cyclePreview() {
    const index = PREVIEW_MODES.indexOf(previewMode.value)
    previewMode.value = PREVIEW_MODES[(index + 1) % PREVIEW_MODES.length]
  }

  return {
    tags,
    tagsError,
    stars,
    starsError,
    previewMode,
    customPreviewText,
    loadTags,
    loadStars,
    fetchList,
    cyclePreview,
  }
})

let bound = false

/**
 * 装配层调用一次（main.ts）：命令写成功后刷新只读投影。
 *
 * 不放在 store setup 里，是因为测试每次 createPinia 都会新建 store，
 * 订阅会累积到已销毁的实例上。
 */
export function bindFontData() {
  if (bound) return
  bound = true

  tagsRepo.onChange(() => {
    void useFontStore().loadTags(true)
  })
  starsRepo.onChange(() => {
    void useFontStore().loadStars()
  })
}
