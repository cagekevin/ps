# 数据流总览

> 只写**跨页不变量**：分层、唯一入口、存储归属、跨页机制、写入边界。
> 单页细节 → `docs/页面/0N-*.md`；待办 → `daily/架构日志/债务.md`；机制选型 → `docs/adr/`（一条一文件）。
> 复核：2026-10-22（命令见 §8）。**本文不记录“当前通过 / 正常”**——那是命令输出，抄进来就会过期。

## 0. 怎么读

| 你要做什么 | 看哪节 |
|---|---|
| 改页面前确认调用链 | §1、§2、§6 |
| 新增命令 / 数据文件 | §2、§3 |
| 动拖拽 / 浮层 / Ctrl 语义 | §4 |
| 判断写入失败 / 并发 | §5 |
| 查自由面板 | §7 |
| 复核本文是否还准 | §8 |

不写：页面布局与视觉值（`docs/页面/0N`）、待办（`daily/架构日志/债务.md` ／ `00-任务-总索引.md`）、单条 jsx 返回结构（`docs/架构/jsx契约.md`）。

## 1. 分层与数据流硬约束

```
页面 / 组件
  ↓ 只发命令、只读 store
composable（useCommand / useFreePanelAdd / usePopover）
  ↓
commands（唯一写入口、唯一 jsx 入口）
  ↓
data repos（唯一存储入口，队列串行）
  ↓
文件 / jsx / PS 事件
  ↑
stores（只读投影，由 repo.onChange 刷新）
```

1. 页面不 import `cep/jsx`、`cep/data`、`cep/events`；只允许 `import type`。`pages/_probe` 是唯一例外（开发探针）。
2. 业务写操作只在 `commands/**`；store 只读，由 `repo.onChange` 刷新，页面不直接改业务字段。
3. 一次用户操作只发一条命令；命令内部可以 `execute` 子命令，但组合关系必须写在该命令里（例：`freePanel.execute`）。
4. 同一文件的所有 `update` 由 `fileRepo` 队列串行；队列**只在本进程内**有效（跨进程见 §5）。
5. 旧自由面板 key 必须先过 `domain/free-panel-legacy.ts`；未知 key 返回 `null`，由命令层报错。

唯一入口的完整清单在 `docs/架构/目标架构.md` §4.7，本文不重复。

## 2. 启动与命令链

### 2.1 启动装配（`src/main.ts`）

```
createApp
  → createPinia
  → bindFontData / bindActionData / bindFreePanelData / bindFontSetData / bindRenameData
  → setProgressPort
  → onSettingsWriteError
  → installErrorHandlers
  → app.use(router).mount
  → 非独立面板：startSelectionWatch() + startCloudAutoSync()
```

独立面板判断只有一条：

```ts
window.location.hash.startsWith('#/freePanel')
```

它同时决定三件事：跳过选区监听、跳过云自动同步、`MainLayout` 隐藏导航（`route.meta.standalone`）。

⚠️ 只认 hash。换入口方式（query、独立 html 直接 mount）时这条判断会失效。

### 2.2 命令执行链（`commands/registry.ts`）

```
useCommand.run(payload, successText)
  → execute(id, payload)
  → refresh() 选区一次
  → canRun(requires)
  → command.run(ctx, payload)
  → 成功：feedback.success
  → 失败：CepError / reason 归一
```

`CommandContext`：

```ts
{
  selection,
  settings,
  data: { stars, tags, actionIndex, actionLibrary, freePanel },
  jsx,
  progress,
}
```

`CommandResult`：

```ts
{ ok: true } | { ok: false, reason, code? } | { ok: 'cancelled' }
```

命令条数**不写死在正文**：`src/commands/*.ts` 的 `id:` 去重后由 §8 第 4 条现算。唯一注册点是 `src/commands/index.ts`。

## 3. 存储地图

文件都在 `%APPDATA%/SheJiZhuLi/` 下；本仓库不写这个目录以外的位置。

| 数据 | 文件 | 仓库 / 入口 | store |
|---|---|---|---|
| 字体偏好（仅字体面板字段） | `sj_set.json` | `cep/data/legacy-settings.ts` | `font-set` |
| 快捷字体 / 层级 / 翻译计数 / 字体历史 | `sj_ztQuickFont.json`、`sj_ztHierarych.json`、`sj_ztTranslate.json`、`sj_ztglHistory.json` | `cep/data/font-extra.ts` | `font-set` |
| 面板 UI 偏好 / 云同步地址与开关 | `sj_v5_ui.json` | `cep/data/settings.ts` | `usePersistedRef` |
| 字体列表缓存 | `SysFont2.json` | `cep/data/sys-font.ts` + `cep/jsx/font.ts` | `font` |
| 标签 / 星级 | `sj_ztglTags.ini`、`sj_ztglStar.ini` | `cep/data/index.ts`（`tagsRepo` / `starsRepo`） | `font` |
| 分类 | `classification.json` | `cep/data/classification-repo.ts` | `classification-view` |
| 动作仓库索引 | `sj_dzStoreInfo.json` | `cep/data/actions.ts`（`actionIndexRepo`） | `action` |
| 动作仓库文件 | `sj_dz*.json` | `cep/data/actions.ts`（`actionLibraryRepo`） | `action` |
| 自由面板 | `sj_appFreePanel.json` | `cep/data/free-panel.ts` | `free-panel` |
| 常用项列表（项 / 顺序 / 显隐） | `sj_commonFunction.json` | `cep/data/common-use.ts` | `common-use` |
| 重命名预设 | `sj_cmmRename.ini` | `cep/data/rename.ts` | `rename` |
| 样式仓库索引 | `sj_kuStoreInfo.ini` | `cep/data/style-library-repo.ts` | `style-library` |
| 四库文件 | 索引里的 `sj_ku*.json` | `cep/data/style-library-repo.ts` + `style-library-io.ts` | `style-library` |
| 云同步台账 | `sj_v5_cloud_sync.json` | `cep/cloud/ledger.ts` | `cloud`（只读状态） |

- 浏览器 dev 下 `settings.ts` 走 `localStorage`；CEP 下读写 `sj_v5_ui.json`。
- 样式库索引里的四个字段是**相对文件名**，扩展名不代表格式（见 `docs/生成/库文件格式契约.md` §2.2）。
- 字体面板的 `sj_set.json` 由 `legacy-settings.ts` 局部读写，不走 `settings.ts`；其余键原样保留。

## 4. 跨页机制

### 4.1 拖拽（T-67 后统一为原版 `am()`）

```
mousedown + Ctrl/Meta + 300ms
  → useLongPressDrag.start()（未按 Ctrl/Meta 直接返回 false，按普通点击处理）
  → 克隆占位 + 浮层跟手 + 落点前 / 后布尔
  → 页面命令（action.reorderItem / rename.reorderItem / style.moveItemTo / freePanel.reorder）
  → domain/reorder.ts（纯函数，唯一落点实现）
```

使用方：`/style` 四库项与组、`/action` 项与组、`/rename` 项与组、`/freePanel` 项（可跨 block）。

- **Ctrl/Meta 是拖拽的闸门，不是复制修饰键**；短按 Ctrl+click 仍然是“加入自由面板”。
- 没有 HTML5 DnD。不要再加 `draggable` / `dragstart` / `dragover` / `drop`。
- 同列表移动的下标补偿只在 `domain/reorder.ts` 里做，页面不写 splice。

### 4.2 Ctrl 矩阵

| 场景 | 行为 | 落点 |
|---|---|---|
| 动作项 Ctrl+click | 打开区域选择器 | `page.runAction` |
| 动作组 Ctrl+click | 批量加入自由面板 | `BaseGroup @ctrl` |
| 字体顶部 5 个图标 Ctrl+click | 加入自由面板 | `FontSetIcon @ctrl` |
| 动作项 / 组拖拽 | Ctrl/Meta + 长按 300ms | `useLongPressDrag` → `action.reorder*` |
| 自由面板项拖拽 | 同上，可跨 block | `FreePanel` → `freePanel.reorder` |
| 重命名项 / 组拖拽 | 同上 | `rename.reorder*` |
| 样式四库项 / 组拖拽 | 同上 | `style.move*` |
| 无 Ctrl/Meta 的拖拽 | 不启动 | — |

### 4.3 浮层

| 组件 / 场景 | 机制 |
|---|---|
| `GDropdown` / `SelectBox` / `ActionWarehouse` | `usePopover`（定位 + outside + Esc + ARIA） |
| `TagMenu` / `TagContextMenu` | `useFloatingPosition` + `useDismiss` |
| 动作页右键菜单 / 样式页 `StyleMenu` / 样式项 `.describe` | `useFloatingPosition` + `useDismiss` |
| 动作页列布局菜单 | `absolute` 挂底栏（有意，不跟鼠标） |
| `FontSetSelect` / `GTooltip` | 仍是 `relative` / `absolute` |
| `GPopover` | 只有 `_atoms` 演示，业务未用 |

统一几何在 `composables/floating-position.ts`；不要新写一套坐标计算。

## 5. 写入边界与失败模式

这些是**现状**，不是待办清单。要修其中一条，先在 `daily/架构日志/债务.md` 登记 id，再动代码。

| # | 事实 | 改代码时必须知道 |
|---|---|---|
| 1 | `fileRepo` 队列每实例一条，只在进程内串行 | 主面板 + 独立面板同时写同一文件 = last-write-wins；跨进程没有锁 |
| 2 | CEP 下无 Node 时 `writeTextFile` 抛 `NO_NODE`，不退回内存（ADR-14） | 写失败必须可见；不要加内存兜底 |
| 3 | `update` 读不到文件直接报 `IO`（`legacySettingsRepo` 的 `requireExisting`） | 不会用 fallback 覆盖用户文件 |
| 4 | `freePanel.execute` 内部再 `execute` 子命令 | 选区刷新两次；子命令失败被包成 `CepError('JSX')` |
| 5 | `legacy.call` 只走 `jsxCall` | 不写 `jsxHistory/jsxHistoryNoCheck`，历史记录与原版不同 |
| 6 | `freePanel.setDisplay` 对所有 block 写 `showNumber/showIcon/showText` | 不能按区域单独设置；`showNumber` 同时是列数（2/3/4） |
| 7 | `freePanel.clear` 用 `createEmptyFreePanel()` 重置 `uid=1`；`addBlock` 用 `uid += 1` | id 不保证全局唯一；不要假设旧 id 不会复用 |
| 8 | `free-panel` store 的 `degraded` 由 `load()` 写入，`onChange` 不更新 | D-40 曾判"无消费方"删掉；**T-99-2 加回来**：读边界归一（`normalize: readFreePanelFile`）后 `degraded` 才真正表示"磁盘那份文件不能当数据用"，页面空态靠它区分"文件坏了"与"面板是空的"。写后不刷新是对的——`degraded` 时 `file-repo.update` 直接抛 `IO`，不会有成功写入 |
| 9 | `settingsSnapshot()` 是命令执行时的快照 | 命令运行中再改偏好，不影响当前 `ctx.settings` |
| 10 | `freePanel.add` 的 option 规则：`undefined → {}`，`null` 原样保留 | 原版实际存在 `option:null`，不要统一成 `{}` |
| 11 | `actionIndexRepo.onChange` 里写当前文件指针 | 这是带副作用的读模型监听；新增监听不要照抄 |

## 6. 页面数据流索引

| 页面 | 一行数据流 | 细节落点 | 状态（任务索引） |
|---|---|---|---|
| `/fontManage` | `stores/font.load*` → `tagsRepo` / `starsRepo` / `sys-font`；`classification-view` → `classification-repo`；列表走 `usePagedList` | `docs/页面/01-字体管理.md` §六 / 七 / 十；`docs/生成/横切能力.md` §二 | 部分实现（T-51 / 52 / 53 / 58） |
| `/fontSet` | 页面 → `useCommand('fontSet.*')` → `commands/fontSet.ts` → `ctx.jsx.font.*`；当前文字走 `selection/current-text` → `stores/font-set`；字体列表走 `cep/jsx/font.initSystemList` → `stores/font` | `docs/页面/02-字体面板.md` §三；`docs/架构/字体面板事件数据流.md` §一 / 三 | 部分实现（T-54 / 55） |
| `/action` | 读：`actionIndexRepo` → `actionLibraryRepo` → `normalizeGroups` → `stores/action`；写：页面 → `action.*` → `commands/action.ts` → repo → `onChange`；执行：`ActionGrid @run` → `action.call` → `jsx.action.callAction` | `docs/页面/03-动作.md` §十 | 部分实现（T-56） |
| `/freePanel` | 见 §7 | 本文 §7（没有单页文档） | 独立面板 |
| `/style` | 页面 → `style.*` → `commands/style.ts` → `style-library-repo` / `style-library-io` → `store.load()` | `docs/页面/06-样式.md` §三；`docs/生成/库文件格式契约.md` | 部分实现（T-65） |
| `/rename` | 页面 → `rename.*` → `commands/rename.ts` → `renameRepo` → `bindRenameData` → `stores/rename` | `docs/页面/07-重命名.md` §三 / §8.2 | 部分实现（T-49） |
| `/commonUse` | 契约见 ADR-22、计划见 `docs/架构/常用页-实施计划.md`（**未实现**，页面仍是占位） | 同上 | 占位（T-47 / T-83…T-89） |
| `/set` | `cloud.setAutoSync` → `cep/cloud/config` → `sj_v5_ui.json`；`cloud.upload/download` → `cloudEngine`；`stores/cloud` 只读状态 | `docs/页面/08-设置.md` §三 / 五；`docs/架构/云同步契约.md` §11 | 部分实现（T-50） |
| `/custom` | 占位；设计态见 `docs/页面/04-自定义.md` | `docs/页面/04-自定义.md` | 占位（T-46） |
| 云同步（非页面） | `cloud.*` → `cep/cloud` → GAS；本地台账 `sj_v5_cloud_sync.json` | `docs/架构/云同步契约.md` §7 / 8；`docs/架构/云同步底层设施.md` §8 / 11 | T-55 / 56 |

## 7. 自由面板（唯一没有单页文档的页面）

### 7.1 数据结构

结构定义以 `src/domain/free-panel.ts` 为准，这里只列字段名：

```ts
FreePanelFile { uid, btnId, obj: { version, type: 'row' | 'norow', list: FreePanelBlock[] } }

FreePanelBlock {
  id, zIndex, showIcon, showNumber, showText?,
  type: 'row' | 'norow', width?, height?,
  children: FreePanelBlock[], data: FreePanelItem[]
}

FreePanelItem {
  icon, type, key, btnId, text, funcText, option,
  left, top, position
}
```

### 7.2 读

```
freePanelRepo.read()
  → normalizeFreePanel
  → stores/free-panel.blocks
  → pages/freePanel/components/FreePanel.vue
  → FreePanelBlock
  → ActionGrid
```

### 7.3 加入 / 排序 / 区域编辑

```
动作项 / 动作组 / 字体顶部 5 图标
  → useFreePanelAdd.open(items, title)
  → FreePanelRegionPicker → FreePanelBlockPicker（区域 id / 横排竖排 / 项数）
  → freePanel.add({ blockId, items })
  → freePanelRepo.update → onChange → store.blocks
```

- 发送端构造：`{ text, key, option, icon?, type? }`。
- `freePanel.add` 的 option 规则见 §5 第 10 条。
- 区域选择器是树形列表，不是完整按钮布局。

排序：

```
Ctrl/Meta + 长按 300ms
  → useLongPressDrag（落点候选 = 所有 block 里的所有项）
  → freePanel.reorder({ fromBlockId, fromBtnId, toBlockId, toBtnId, position })
  → domain/reorder.applyItemDrop
```

区域编辑：

```
菜单「新增区域」→ freePanel.addBlock（obj.list 或 parent.children）
区域 hover → ↔/↕ freePanel.setBlock({ type })
          → ⤢  CepModal → freePanel.setBlock({ width, height })
          → ×  freePanel.removeBlock
菜单显示项 → freePanel.setDisplay（所有 block，见 §5 第 6 条）
菜单清空   → freePanel.clear（uid 重置，见 §5 第 7 条）
```

### 7.4 执行

```
ActionGrid @run
  → FreePanel.run(blockId, item)
  → freePanel.execute({ blockId, btnId })
  → read + normalize
  → adaptFreePanelItem(item)
  → execute(mapped.id, mapped.payload)
  → 子命令
  → jsx / legacy
```

旧 key 映射（`domain/free-panel-legacy.ts`）：

```
dz_useAction            → action.call
zt_translate            → fontSet.translate
zt_createButton         → fontSet.createButton
zt_copyFontInfo         → fontSet.copyFont
zt_pasteFontInfo        → fontSet.pasteFont
zt_switchFontDirection  → fontSet.switchDirection
zt_setFontSize          → fontSet.fontSize
zt_setFontLeading       → fontSet.leading
zt_setFontTracking      → fontSet.tracking
zt_setLeftRightAlign    → fontSet.align (h)
zt_setUpDownAlign       → fontSet.align (v)
zt_changeTextBranchMerge → fontSet.split
cy_swapWireframeFill    → legacy.call
cy_exportOpenFolder     → legacy.call('cy_openDirectory')
cy_batchExportLayer     → legacy.call('cy_BatchExportLayer')
cy_batchExportSecondLayer → legacy.call('cy_BatchExportSecondLayer')
cy_exportImage          → legacy.call('cy_ExportImage')
```

`legacy.call` 只允许 `commands/legacy.ts` 的 `ALLOWED` 白名单；未知 key 报“未开放”。

### 7.5 独立面板入口

```
manifest 第二扩展
  → freePanel.html
  → index.html#/freePanel
  → MainLayout standalone（隐藏导航）
  → FreePanel
```

独立面板与主面板共享同一份前端产物和 `sj_appFreePanel.json`；启动时跳过选区监听与云自动同步（见 §2.1）。跨进程写同一文件的边界见 §5 第 1 条。

## 8. 复核命令

跑完只看输出，不把结果抄回本文；只更新顶部“复核”日期。

```bash
# 1. 门禁：样式守卫 + 债务账本 + ESLint + Prettier
npm run check

# 2. 类型
npm run typecheck

# 3. 单测（jsdom）
npm test

# 4. 命令数量与唯一注册点（正文不写死数字）
grep -rhoE "^\s+id: '[^']+'" src/commands/*.ts | sort -u | wc -l
grep -n "register(command)" src/commands/index.ts

# 5. 页面边界：期望 0 / 0（_probe 是唯一例外）
grep -rn "cep/jsx\|cep/data\|cep/events" src/pages --exclude-dir=_probe | wc -l
grep -rn "__adobe_cep__\|evalScript\|evalFile" src/pages | wc -l

# 6. 存储地图锚点：每个 repo 都应在 §3 有一行
grep -rn "export const .*Repo" src/cep/data/*.ts
```

## 9. 维护规则

| 变化 | 只改 |
|---|---|
| 新页面 | §6 加一行（一行流 + 落点 + 台账 id），不抄流程 |
| 新数据文件 / repo | §3 加一行 |
| 新命令域 / 注册点变化 | §2 的链路；不写数量 |
| 拖拽 / 浮层 / Ctrl 语义变化 | 先落 ADR，再改 §4 |
| 边界修掉 | 删 §5 对应行，台账归档 |
| 复核 | 跑 §8，只改顶部日期 |

**最容易腐烂的三处**：§6 的状态列（页面推进）、§4.3 的浮层表（组件接入）、§5 的边界（修了没删）。数字一律不写进正文。
