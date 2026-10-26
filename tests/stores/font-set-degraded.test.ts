import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ERR_PREFIX } from '@/utils/errors'
import { installHostBridge, installHostRequire } from '../helpers/host-stub'

/**
 * T-111：`/fontSet` 的 `degraded` 槽（清单 §6.7 的 S2 档）。
 *
 * 四条判据都钉在这里：
 * - A：四份 S2 数据（设置 / 快捷字体 / 层级预设 / 翻译计数）读坏时，`store.degraded` 有值；
 * - B：文案说得出"读失败"，不是"还没有"；
 * - C：**首次使用（`ENOENT`）时 `degraded` 必须为空**——"没有"与"坏了"分得开；
 * - 最近字体是 S3 档（fallback `[]`），读坏也**不**进 `degraded`。
 *
 * 这个文件**不 mock 数据层**：从 `node:fs` 这一层喂坏，走真实的
 * `pick → fileRepo → readTextOutcome → RepoRead`，测的是真接线。
 */
const disk = vi.hoisted(() => ({
  /** 非空 = 每次 `readFileSync` 都抛一个带这个 code 的系统错误 */
  code: 'EPERM' as string,
}))

const fakeFs = {
  // 实现不许再用 existsSync（T-108/T-109）。一调用就炸，顺带钉住这一点
  existsSync: () => {
    throw new Error('用例：实现不许再用 existsSync')
  },
  readFileSync: () => {
    throw Object.assign(new Error(`模拟 ${disk.code}`), { code: disk.code })
  },
  writeFileSync: () => undefined,
  mkdirSync: () => undefined,
  renameSync: () => undefined,
  unlinkSync: () => undefined,
}

function installNode() {
  installHostRequire((id: string) => {
    if (id === 'fs') return fakeFs
    if (id === 'path') return { join: (...parts: string[]) => parts.join('/'), dirname: () => '' }
    if (id === 'os') return { homedir: () => '/home/u' }
    throw new Error(`用例没准备 ${id}`)
  })
  // `dataRepo()` 用 `hasCep()` 选实现：不给它一个 CEP 桥，会走 memoryRepo（永不失败）。
  // `evalScript` **必须回调**，否则 `readTextOutcome` 的 jsx 兜底会一直等到超时。
  // 回什么要跟 `disk.code` 对齐：`combineReads` 的规则是"任一条说 error 就报 error"，
  // 所以只有两条路**都说不存在**时才是 `notSeen`——这正是判据 C 想钉的语义
  installHostBridge({
    // 真桥一定有 `getSystemPath`；`userDir()` 现在"桥在就只认宿主"（拿不到就抛，不静默回落）。
    // 这里给的值与 `os.homedir() = '/home/u'` 那条平台公式**逐字等价**，用例期望不变。
    getSystemPath: () => 'file:///home/u/Library/Application Support',
    evalScript: (_script, cb) =>
      cb(disk.code === 'ENOENT' ? `${ERR_PREFIX}文件不存在: /x` : `${ERR_PREFIX}用例：jsx 不可用`),
  })
}

// `dataRepo()` 在**模块加载时**就按 `hasCep()` 定死实现（memoryRepo 永不失败），
// 所以桥必须在 import 之前装好，否则整个文件测的是内存仓库、三条断言全是假绿
installNode()

const { useFontSetStore } = await import('@/stores/font-set')

beforeEach(() => {
  setActivePinia(createPinia())
  disk.code = 'EPERM'
  installNode()
})

describe('fontSet store · degraded（T-111）', () => {
  it('判据 A + B：四份 S2 数据读坏 → degraded 有值，且文案说"读取失败"', async () => {
    const store = useFontSetStore()

    await store.load()

    expect(store.degraded).toContain('面板设置读取失败')
    expect(store.degraded).toContain('快捷字体读取失败')
    expect(store.degraded).toContain('层级预设读取失败')
    expect(store.degraded).toContain('翻译计数读取失败')
    // 判据 B：不许说成"还没有"
    expect(store.degraded).not.toContain('还没有')
    expect(store.degraded).toContain('EPERM')
  })

  it('最近字体读坏也不进 degraded（S3 档：空列表本来就是合法状态）', async () => {
    const store = useFontSetStore()

    await store.load()

    expect(store.degraded).not.toContain('最近')
  })

  it('判据 C：首次使用（ENOENT）→ degraded 为空', async () => {
    disk.code = 'ENOENT'
    const store = useFontSetStore()

    await store.load()

    expect(store.degraded).toBe('')
  })
})
