import { describe, expect, it } from 'vitest'
import { CLOUD_SYNC_GAS_URL } from '@/config/cloud'
import { setPref } from '@/cep/data/settings'
import {
  getCloudUrl,
  isAutoSyncEnabled,
  isCloudUrlUsable,
  setAutoSyncEnabled,
} from '@/cep/cloud/config'

/**
 * TD-11-10：云同步的两个闸门是**两件事**，判据不许混。
 *
 * - `isCloudUrlUsable()`：有效地址能不能用。有效地址 = 偏好非空取它，**空值回退内置常量**，
 *   所以对绝大多数人恒为 true —— "开箱可用"是设计，不是默认值兜底；
 * - `isAutoSyncEnabled()`：自动同步开关（默认关）。**停用云同步靠它**。
 *
 * 为什么要专门钉："名字像'用户配置过'"会让人写 `if (!configured) 提示去设置地址`，
 * 而那条分支对用内置地址的用户永远不该出现。
 */
describe('云同步闸门：地址可用 ≠ 用户配置过（TD-11-10）', () => {
  it('偏好为空 ⇒ 有效地址就是内置常量，且判为可用', () => {
    setPref('cloud.gasUrl', '')

    expect(getCloudUrl()).toBe(CLOUD_SYNC_GAS_URL)
    expect(isCloudUrlUsable()).toBe(true)
  })

  it('偏好是空白串也回退内置（trim 后为空 = 没填过）', () => {
    setPref('cloud.gasUrl', '   ')

    expect(getCloudUrl()).toBe(CLOUD_SYNC_GAS_URL)
    expect(isCloudUrlUsable()).toBe(true)
  })

  it('用户填了自己的端点 ⇒ 用它，并判为可用', () => {
    const own = 'https://script.google.com/macros/s/AKfycb_own_endpoint/exec'
    setPref('cloud.gasUrl', own)

    expect(getCloudUrl()).toBe(own)
    expect(isCloudUrlUsable()).toBe(true)
  })

  it('填错地址（不是 GAS /exec）⇒ 不可用：这是唯一的 false 路径', () => {
    for (const bad of ['http://example.com/exec', 'https://example.com/', 'AKfycby123']) {
      setPref('cloud.gasUrl', bad)
      expect(isCloudUrlUsable()).toBe(false)
    }
  })

  it('停用云同步靠开关而不是地址：地址可用时开关仍默认关，打开后才为真', () => {
    setPref('cloud.gasUrl', '')
    setPref('cloud.autoSync', false)

    expect(isCloudUrlUsable()).toBe(true)
    expect(isAutoSyncEnabled()).toBe(false)

    setAutoSyncEnabled(true)
    expect(isAutoSyncEnabled()).toBe(true)
  })
})
