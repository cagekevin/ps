// 是什么：jsx 调用的超时**分档**（唯一一份；按"这次调用在等什么"分三档，不是按域名分）
// 唯一入口：所有 `jsxCall` 的 `timeout` 都从这里取，不许写裸数字
// 替代了什么：`font.ts` / `style.ts` / `commonUse.ts` 各定义一遍的 READ/WRITE/LONG，
//   以及另外 6 个域散落的裸数字（TD-09-5 / TD-13-1）
// 谁在用：cep/jsx/*.ts
// 禁止：在这里做业务判断；要新档位先说明"这次调用在等什么"与前三档的差别

/**
 * 一档 = 一种"在等什么"。判据是**阻塞原因**，不是域：
 *
 * | 档 | 毫秒 | 在等什么 |
 * | --- | --- | --- |
 * | `READ`  | 10_000  | PS 内部读：列表、属性、选区。不弹框、不写盘，正常是毫秒级 |
 * | `WRITE` | 60_000  | 一次文档写，或**会弹系统对话框等用户**（选图片、选文件夹） |
 * | `LONG`  | 300_000 | 批量 / 初始化：系统字体表、多图导入、优化整份文档 |
 *
 * **为什么 `WRITE` 是 60s 而不是 font 原来的 20s / commonUse 的 60s 两个值**：
 * `ztgl_setFont`（20s）与 `cy_locationTrade`（60s）都是"改一次当前文档"，语义没有差别，
 * 差三倍纯粹是各写各的。取 60s 的理由是这一档要容纳"弹对话框等用户"那类调用
 * （`cy_getImagePath` 选图片、`cy_getPsdForFolder` 选文件夹）——用户在文件对话框里挑半分钟
 * 是正常行为，20s 会把正常的挑文件判成超时。**过紧的超时是谎报失败**，比多等 40s 更坏。
 */
export const READ = 10_000
export const WRITE = 60_000
export const LONG = 300_000

export type JsxTimeout = typeof READ | typeof WRITE | typeof LONG
