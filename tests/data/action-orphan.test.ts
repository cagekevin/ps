import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasNode } from '@/cep/node'
import { installFakeFs } from '../helpers/fake-fs'
import { SEED } from '../helpers/cas-seed'
import { ERR_PREFIX } from '@/utils/errors'

/**
 * 动作库导入的「孤儿文件」（35 号 §3.2）。
 *
 * 场景：导入成功、索引已指向新仓库，但**旧文件删不掉**（被占用 / 权限）。
 * 旧实现只 `log.warn` 一句就完了 —— 界面上什么都看不到，磁盘上慢慢堆。
 *
 * 现在 `removeAll` 把删不掉的名单**返回**，`importActionArchive` 带出来，
 * 命令层用 `msg.data.fn.orphanFilesLeft` 抛给用户。这个文件钉的是"带出来"这一环。
 */

const disk = installFakeFs()

vi.mock('@/cep/transport', () => ({
  hasCep: () => true,
  // jsx 兜底的"文件不存在"哨兵：带 `ERR:` 前缀才算哨兵，否则被当成正文
  evalScriptRaw: async () => `${ERR_PREFIX}文件不存在: `,
}))

const { encodeDzx } = await import('@/domain/action-dzx')
const { importActionArchive } = await import('@/cep/data/action-archive')
const { actionIndexWriter } = await import('@/cep/data/actions')
const { writeBase64File } = await import('@/cep/disk-write')
const { userDir } = await import('@/cep/paths')

const SRC = '/tmp/import-source.dzx'
const OLD = 'sj_dz_old.json'
const NEW = 'sj_dz_new.json'

function pkg(): string {
  return encodeDzx({
    arrFileData: [{ name: NEW, data: Buffer.from('new-bytes').toString('base64') }],
    store: { index: 0, list: [{ name: '新仓库', fileName: NEW }] },
  })
}

/** 先摆一份「旧索引 + 旧库文件」，模拟"库里已经有一个仓库" */
function seedOldWarehouse(): void {
  actionIndexWriter.replace({ index: 0, list: [{ name: '旧仓库', fileName: OLD }] }, SEED)
  writeBase64File(`${userDir()}/${OLD}`, Buffer.from('old-bytes').toString('base64'), {
    cas: { mode: 'skip', why: '用例 seed' },
    backup: { mode: 'none', why: '用例 seed' },
  })
}

afterEach(() => {
  disk.uninstall()
  // 桩不许留在环境里：卸完必须"没有 node"（留着 → 下一个用例带着上一个的桩跑 → 假绿）
  expect(hasNode()).toBe(false)
})

beforeEach(() => {
  disk.files.clear()
  disk.install()
  disk.seed(SRC, pkg())
})

describe('动作库导入 · 旧文件删不掉时要说出来（35 号 §3.2）', () => {
  it('删不掉 → 抛错，文案说清"导入已完成"，且旧文件确实还在盘上', async () => {
    seedOldWarehouse()
    disk.failUnlinkFor = [OLD]

    await expect(importActionArchive(false, SRC)).rejects.toThrow(/没删掉/)

    // 旧文件确实还在盘上 —— 这就是"孤儿"，不是"我调用失败了"
    // 用 `files.has` 而不是 `read`：旧库文件是**字节**（base64 落盘），`read` 是文本读，读不到不代表不在
    expect(disk.files.has(`${userDir()}/${OLD}`)).toBe(true)
    // 索引已经指向新仓库：导入本身是成功的，错的只是收尾
    const read = actionIndexWriter.read()
    expect(read.status === 'ok' && read.value.list.map((item) => item.name)).toEqual(['新仓库'])
  })

  it('删得掉 → 不抛（正常路径不受影响）', async () => {
    seedOldWarehouse()

    await expect(importActionArchive(false, SRC)).resolves.toBeUndefined()

    expect(disk.files.has(`${userDir()}/${OLD}`)).toBe(false)
  })
})
