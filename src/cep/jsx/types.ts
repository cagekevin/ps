/**
 * PS 能力的**接口**。真实实现与 mock 实现都必须满足它（`satisfies`）。
 *
 * 这样新增一个 PS 函数时，漏写 mock 会直接编译失败，而不是"浏览器里崩"（ADR-16 的机制前提）。
 * 注意：这里只放**已接通的函数**。68 个函数里其余 60 多个返回结构未知，
 * 等对应页面开工时按域补，不要预先臆造签名。
 */
export interface FontJsx {
  /** 读取系统字体；返回原始结构（有两套键名），归一化在调用方 */
  initSystemList(): Promise<unknown>
  /** 字体管理页用：ztgl_setFont(hjm, mz, zz)，返回 { err, msg } */
  setFont(postScriptName: string, name: string, weight: string): Promise<unknown>

  // ---------- 字体面板：读 ----------
  /** AppPreferences.typeUnits：TypeUnits.PIXELS / POINTS / MM */
  getTypeUnits(): Promise<unknown>
  /** zt_getFontSimpleInfo：当前文字属性（字号/行距/字距/颜色/对齐…） */
  getFontSimpleInfo(): Promise<unknown>
  /** zt_getCurrentFontInfo：当前图层字体，用于"添加当前图层字体" */
  getCurrentFontInfo(): Promise<unknown>
  /** zt_getCurrentText：选中的文字内容（原版返回可能已混淆） */
  getCurrentText(): Promise<unknown>
  /** ys_getFontInfo：复制文字属性，返回 { err, data } */
  getFontInfo(): Promise<unknown>

  // ---------- 字体面板：写 ----------
  /** layer_font_setFontSize：字号（数字） */
  setNumberSize(size: number): Promise<unknown>
  /** zt_setFontSize：层级字号，点某一级时设置 */
  setHierarchySize(size: number): Promise<unknown>
  /** layer_font_setLeading：行距（绝对值） */
  setLeading(leading: number): Promise<unknown>
  /** zt_setFontWordSpacing：字距 */
  setTracking(tracking: number): Promise<unknown>
  /** zt_setFontColor：打开取色，返回 { err, data } */
  setColor(): Promise<unknown>
  /** zt_setFontName：字体面板换字体（hjm, mz, zz） */
  setFontName(postScriptName: string, name: string, weight: string): Promise<unknown>
  setAllCaps(value: boolean): Promise<unknown>
  /** zt_setFontVision：manual / opticalKern */
  setFontVision(mode: string): Promise<unknown>
  setFauxItalic(value: boolean): Promise<unknown>
  setFauxBold(value: boolean): Promise<unknown>
  /** zt_setFontJustified：段落文本对齐 */
  setJustified(index: number): Promise<unknown>
  /**
   * zt_setTextAlignment：水平对齐。
   * 原版两种调用形态：底部对齐只传 `[index]`（app.v4.js:38080），
   * 字体属性面板传 `[index, shiftKey]`（:42458）。第二参数不传时不能补 `false`。
   */
  setTextAlignment(index: number, shift?: boolean): Promise<unknown>
  /** zt_setHorizontalCenters([4])：水平居中分布 */
  setHorizontalCenters(): Promise<unknown>
  /** zt_verticalCenter([5])：垂直平均分布 */
  setVerticalCenter(): Promise<unknown>
  /** zt_setUpDownAlign：顶/中/底对齐 */
  setTextUpDownAlign(index: number): Promise<unknown>
  /** zt_setBackrgoudAlign：与背景对齐（原版拼写就是 Backrgoud） */
  setBackgroundAlign(value: number): Promise<unknown>
  /** zt_alignHorizontal：水平垂直居中对齐（只有快捷键/常用页入口） */
  alignHorizontal(): Promise<unknown>
  /** cy_distributedByPitch：按间距分布 */
  distributeByPitch(axis: number, value: string, filter: boolean): Promise<unknown>

  // ---------- 文本 ----------
  /** zt_changeTextBranchMerge：分行/分为单个/合并/合并为段落（1-4） */
  changeTextBranchMerge(mode: number): Promise<unknown>
  /** zt_textBranchMerge：上一步确认后的实际执行 */
  textBranchMerge(mode: number): Promise<unknown>
  /** zt_createButton：生成按钮，参数是形如 { type, isLine, padding } */
  createButton(config: { type: number; isLine: boolean; padding: string }): Promise<unknown>
  /** ys_checkUseFont：应用字体属性前检查缺字体 */
  checkUseFont(payload: string): Promise<unknown>
  /** ys_useFont：应用字体属性 */
  useFont(payload: string): Promise<unknown>
  /** zt_switchFontDirection：切换文本方向 */
  switchFontDirection(): Promise<unknown>
  /** zt_setTranslateText：把翻译结果写回文档 */
  setTranslateText(data: unknown, replace: boolean): Promise<unknown>
}

export interface LayerJsx {
  isSelectLayer(): Promise<unknown>
  getTypeNumber(): Promise<unknown>
}

export interface EnvJsx {
  /** jsx 内部按这些 key 拼路径与开关，见 cep/env.ts 的 PS_ENV */
  setEnv(json: string): Promise<unknown>
}

export interface ActionJsx {
  /** 读取 PS 当前动作面板的全部动作（结构同本地库，无 alias） */
  getActionList(): Promise<unknown>
  /** 按 group + name 在 PS 里找到并播放；传整个 item，与原版一致 */
  callAction(item: { group: string; name: string; alias?: string }): Promise<unknown>
}

export interface LegacyJsx {
  /** 旧自由面板 key 的直通调用；只允许白名单 key */
  call(key: string, args: unknown[], label?: string): Promise<unknown>
}

/**
 * 重命名域。
 *
 * 表达式求值在 PS 侧（`cmm_batchName`），我们只发字符串；
 * 返回结构未实测（jsxbin 不可读），所以签名是 `unknown` 且调用方不回读。
 */
export interface RenameJsx {
  /** cmm_batchName([表达式, 是否过滤子图层], "重命名")（app.v4.js:57234） */
  batchName(expression: string, filterChildren: boolean): Promise<unknown>
  /** cmm_setLayerColor([颜色序号])，0 = 清除（app.v4.js:57220） */
  setLayerColor(colorIndex: number): Promise<unknown>
}

export interface JsxPort {
  font: FontJsx
  layer: LayerJsx
  env: EnvJsx
  action: ActionJsx
  legacy: LegacyJsx
  rename: RenameJsx
}
