import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

/**
 * T-97-8：真机 bug「勾了拖入图片转链接智能对象，拖图进去什么都不发生」。
 *
 * 根因：`startPlaceImageWatch` 里 `readOptions` 被写成
 * `() => readCommonUseOptions() as unknown as Record<string, unknown>` ——
 * 数据层那个函数是 **async**、返回 `{ value, degraded }`，于是 `placeImageAction`
 * 拿到的是一个 **Promise 对象**，`options.cyOpenDranInToLinkObject` 恒为 `undefined`，
 * 一路静默走 `'none'`：事件收到了、回调也跑了、就是不做事、还不报错。
 *
 * 这个文件专门测**真实接线**（`startPlaceImageWatch` 自己构造 deps），
 * 而不是像 `common-use-place-image.test.ts` 那样把 deps 注入进去——
 * 注入进去的 `readOptions` 是同步的，正好把这个 bug 挡在视野外。
 */

/** 捕获注册进来的监听器，模拟 PS 事件回来 */
const listeners = vi.hoisted(() => new Map<string, (payload: unknown) => void>())

vi.mock('@/cep/events', () => ({
  subscribeHostEvent: async (name: string, listener: (payload: unknown) => void) => {
    listeners.set(name, listener)
    return () => listeners.delete(name)
  },
}))

/** 数据层真形状：async + `{ value, degraded }` */
const diskOptions = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('@/cep/data/legacy-settings', () => ({
  readCommonUseOptions: async () => ({ value: diskOptions.current }),
  updateCommonUseOptions: async () => ({}),
  COMMON_USE_SETTING_KEYS: [],
}))

const { startPlaceImageWatch, stopPlaceImageWatch } = await import('@/commands/commonUse')

const PAYLOAD = { eventData: { null: { _path: 'H:\\稿定\\02.jpg' } } }

function jsxPort() {
  const embedImage = vi.fn(async () => null)
  const relinkToFile = vi.fn(async () => null)
  return { port: { commonUse: { embedImage, relinkToFile } }, embedImage, relinkToFile }
}

beforeEach(() => {
  listeners.clear()
  stopPlaceImageWatch()
  diskOptions.current = {}
})

describe('T-97-8：事件订阅 → 真实读盘 → 分支真的执行', () => {
  it('勾了 cyOpenDranInToLinkObject：拖入事件必须真的调 relinkToFile（路径反斜杠转斜杠）', async () => {
    diskOptions.current = { cyOpenDranInToLinkObject: true }
    const { port, relinkToFile, embedImage } = jsxPort()
    await startPlaceImageWatch({ jsx: port })

    listeners.get('placeImage')!(PAYLOAD)
    await flushPromises()

    // 旧代码在这里红：deps.readOptions() 返回 Promise，分支恒为 'none'，一次都没调
    expect(relinkToFile).toHaveBeenCalledTimes(1)
    expect(relinkToFile).toHaveBeenCalledWith('H:/稿定/02.jpg')
    expect(embedImage).not.toHaveBeenCalled()
  })

  it('只勾 cyDragInAutoEmbed：走 embedImage，实参是设置原值（空串 path）', async () => {
    diskOptions.current = {
      cyDragInAutoEmbed: true,
      cyLinkObject: 'original',
      cyDeleteNext: true,
    }
    const { port, relinkToFile, embedImage } = jsxPort()
    await startPlaceImageWatch({ jsx: port })

    listeners.get('placeImage')!(PAYLOAD)
    await flushPromises()

    expect(embedImage).toHaveBeenCalledWith({ path: '', bLink2: 'original', bDelete: true })
    expect(relinkToFile).not.toHaveBeenCalled()
  })

  it('三个事件各自认自己的开关：粘贴事件只认 cyPasetImageAutoEmbed', async () => {
    diskOptions.current = { cyPasetImageAutoEmbed: true }
    const { port, embedImage } = jsxPort()
    await startPlaceImageWatch({ jsx: port })

    listeners.get('pasteImage')!(PAYLOAD)
    await flushPromises()

    expect(embedImage).toHaveBeenCalledTimes(1)
  })

  it('开关全没勾：什么都不调，也不报错', async () => {
    const { port, relinkToFile, embedImage } = jsxPort()
    await startPlaceImageWatch({ jsx: port })

    listeners.get('placeImage')!(PAYLOAD)
    await flushPromises()

    expect(relinkToFile).not.toHaveBeenCalled()
    expect(embedImage).not.toHaveBeenCalled()
  })

  it('处理抛错不再被 void 吞掉：写进日志（tag commonUse.placeImage）', async () => {
    diskOptions.current = { cyOpenDranInToLinkObject: true }
    const { log } = await import('@/utils/logger')
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {})
    const port = {
      commonUse: {
        embedImage: vi.fn(async () => null),
        relinkToFile: vi.fn(async () => {
          throw new Error('Layer_placedLayerRelinkToFile 失败')
        }),
      },
    }
    await startPlaceImageWatch({ jsx: port })

    listeners.get('placeImage')!(PAYLOAD)
    await flushPromises()

    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls.at(-1)?.[1])).toContain('placeImage')
    warn.mockRestore()
  })
})
