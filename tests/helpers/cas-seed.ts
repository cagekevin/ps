import type { CasMode } from '@/cep/disk-write'

/**
 * 测试 seed 专用：往仓库里放初始数据时**显式声明不比**。
 *
 * 为什么集中一份：`Repo.replace` 的 `cas` 是必填的（收口后「忘了比」与「决定不比」
 * 在类型上必须分开）。测试准备数据的场景永远是"没有并发"，所以统一用这一个常量，
 * 而不是每个文件各写一句 `why`——那会变成 40 份同义字符串。
 *
 * 真实并发行为由专门的用例钉（`tests/data/settings-read-failure.test.ts` 的 CAS 用例、
 * `tests/cep/fs-atomic-bytes.test.ts` 的库文件 CAS 用例），不靠 seed 覆盖。
 */
export const SEED: CasMode = {
  mode: 'skip',
  why: '用例 seed：初始化仓库数据，不涉及并发',
}
