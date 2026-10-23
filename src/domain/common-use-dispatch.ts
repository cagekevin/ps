// 是什么：常用页「格子左键」分派表——官方 `clickFunction`（`app.v4.js:37882-37946`）的逐格语义
// 唯一入口：页面判断"点格子做什么"只能查这张表，不许写 if 链
// 替代了什么：2026-10-23 我按 `isMore` 猜"有子面板就展开"，官方只有 3 格左键=展开
// 谁在用：`src/pages/commonUse/index.vue`；`tests/domain/common-use-dispatch.test.ts` 用快照当外部预言机比对
// 禁止：在这里写死页面文案/提示；只描述"动作类型 + 命令 id"

/**
 * 一格的左键动作。四种，没有第五种：
 * - `command`：执行一条命令（id 必须是 `commands/commonUse.ts` 里真实注册的）
 * - `toggle-setting`：翻转一个 `sj_set.json` 布尔设置（官方 case 13 只干这个 + 提示）
 * - `expand`：展开/收起子面板（官方 `open(e)`）
 * - `none`：什么都不做（官方 case 32 直接 break）
 */
export type LeftClickAction =
  | { kind: 'command'; command: string }
  | { kind: 'toggle-setting'; path: string }
  | { kind: 'expand' }
  | { kind: 'none' }

/**
 * 官方 case 里的目标名 → 我方动作。
 *
 * 键是**官方源码里的目标名**（`embedImage` / `cy_embedMultipleImage` / `open` …，见
 * `docs/生成/常用页-左键分派.json` 的 `target`），不是我方命令 id——这样快照一变，测试就能指出哪一条对不上。
 */
export const TARGET_ACTIONS: Record<string, LeftClickAction> = {
  embedImage: { kind: 'command', command: 'commonUse.embedImage' },
  cy_embedMultipleImage: { kind: 'command', command: 'commonUse.embedMultipleImages' },
  importMultipleImage: { kind: 'command', command: 'commonUse.importMultipleImages' },
  cyAutoFillColor: { kind: 'toggle-setting', path: 'cyAutoFillColor' },
  coorectBlur: { kind: 'command', command: 'commonUse.correctBlur' },
  swapWireframeFill: { kind: 'command', command: 'commonUse.swapWireframeFill' },
  optimizeDoc: { kind: 'command', command: 'commonUse.optimizeOnce' },
  open: { kind: 'expand' },
  exportImage: { kind: 'command', command: 'commonUse.exportImages' },
  layerReplace: { kind: 'command', command: 'commonUse.layerReplace' },
  locationTrade: { kind: 'command', command: 'commonUse.locationTrade' },
  exchangeLayerColor: { kind: 'command', command: 'commonUse.exchangeLayerColor' },
}

/**
 * 格子名（官方 `contextjson[i].name`）→ 动作。
 *
 * 顺序与官方分派链一致（`:37894`）；14 个名字全覆盖，包括官方"什么都不做"之外的每一种。
 * 名字来自 `sj_commonFunction.json` 的 `name` 字段（官方也按 `t.name` 分派）。
 */
export const LEFT_CLICK_BY_NAME: Record<string, LeftClickAction> = {
  嵌入图片: TARGET_ACTIONS.embedImage,
  嵌入多图片: TARGET_ACTIONS.cy_embedMultipleImage,
  导入多图片: TARGET_ACTIONS.importMultipleImage,
  自动填充颜色: TARGET_ACTIONS.cyAutoFillColor,
  修正模糊: TARGET_ACTIONS.coorectBlur,
  填充线框互换: TARGET_ACTIONS.swapWireframeFill,
  优化文档: TARGET_ACTIONS.optimizeDoc,
  自定义变换: TARGET_ACTIONS.open,
  参考线工具: TARGET_ACTIONS.open,
  按间距分布: TARGET_ACTIONS.open,
  导出图片: TARGET_ACTIONS.exportImage,
  元素替换: TARGET_ACTIONS.layerReplace,
  位置对换: TARGET_ACTIONS.locationTrade,
  图层颜色互换: TARGET_ACTIONS.exchangeLayerColor,
}

/** 查表；表里没有的名字 = 官方默认分支（`case 32`，什么都不做） */
export function leftClickOf(name: string): LeftClickAction {
  return LEFT_CLICK_BY_NAME[name] ?? { kind: 'none' }
}
