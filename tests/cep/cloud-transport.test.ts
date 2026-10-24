import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSnapshot, type SyncUnit } from '@/domain/cloud'

const config = vi.hoisted(() => ({
  getCloudUrl: vi.fn(() => 'https://script.google.com/macros/s/test/exec'),
}))

vi.mock('@/cep/cloud/config', () => config)

const { pushSnapshot, pullSnapshot } = await import('@/cep/cloud/transport')

function unit(): SyncUnit {
  return { schema: 1, hash: 'h', files: [] }
}

function response(text: string, ok = true, status = 200) {
  return { ok, status, text: async () => text }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cloud transport', () => {
  it('push_data 发送 action + snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)
    const snapshot = buildSnapshot({ 'font.tags': unit() }, 1, 100)

    await pushSnapshot(snapshot)

    const init = fetchMock.mock.calls[0][1] as { body: string }
    expect(JSON.parse(init.body)).toEqual({ action: 'push_data', data: snapshot })
  })

  it('pull_data 归一化 { data: snapshot }', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          JSON.stringify({
            data: {
              type: 'psz_sync',
              schema: 1,
              rev: 2,
              updatedAt: 100,
              units: { 'font.tags': unit() },
            },
          }),
        ),
      ),
    )

    const pulled = await pullSnapshot()
    expect(pulled.status).toBe('ok')
    const view = pulled.status === 'ok' ? pulled.snapshot : null
    expect(view?.rev).toBe(2)
    expect(view?.units['font.tags']).toBeTruthy()
  })

  /**
   * TD-11-5：网关回 200 但**结构不符**时，`pull` 必须报"读不懂"，
   * 不能报"云端是空的"（后者会让引擎以 rev=1 覆盖云端）。
   */
  it('pull_data 回 {"ok":true}（无 units）→ unreadable，不是 empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(JSON.stringify({ ok: true }))))
    expect(await pullSnapshot()).toMatchObject({ status: 'unreadable' })
  })

  it('pull_data 回 {data:null} → empty（服务端显式说没有）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(JSON.stringify({ data: null }))))
    expect(await pullSnapshot()).toEqual({ status: 'empty' })
  })

  it('HTML 权限页报 CLOUD_PERMISSION_HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('<html>login</html>')))

    await expect(pullSnapshot()).rejects.toMatchObject({ code: 'CLOUD_PERMISSION_HTML' })
  })

  it('非 JSON 报 CLOUD_BAD_RESPONSE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('not-json')))

    await expect(pullSnapshot()).rejects.toMatchObject({ code: 'CLOUD_BAD_RESPONSE' })
  })

  it('error 字段原样上抛', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('{"error":"云端错误"}')))

    await expect(pullSnapshot()).rejects.toMatchObject({ message: '云端错误' })
  })

  it('并发的两次请求是排队的，不是"在飞就报错"（T-77）', async () => {
    let releaseFirst: (value: ReturnType<typeof response>) => void = () => {}
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (releaseFirst = resolve)))
      .mockResolvedValue(response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)

    const first = pullSnapshot()
    const second = pullSnapshot()

    // 第一次还没回来：第二个请求不许开始（以前这里会直接抛假的网络错误）
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    releaseFirst(response('{"ok":true}'))
    // 这份回包本身没有 units（TD-11-5 之后是 unreadable）——本用例只关心"排队"，
    // 所以断言三态而不是 null
    await expect(first).resolves.toMatchObject({ status: 'unreadable' })
    await expect(second).resolves.toMatchObject({ status: 'unreadable' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
