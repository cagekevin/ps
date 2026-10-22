# 数据流总览

> **这不是开发日志。**  
> 本文只写当前仓库代码的**实现事实**。  
> **⚠️ 表示当前代码自身存在的不一致、重复实现或未接通，用于改代码前核对。**

## 0. 分层原则

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

硬约束：

1. 页面不 import `cep/data`、`cep/jsx`、`cep/transport`；只允许 `import type`。
2. 一次用户操作只发一条命令；命令内部可以 `execute` 子命令，但组合关系必须明确。
3. 所有业务写操作走 `commands`；store 只读。
4. 同一文件的所有 `update` 由 `fileRepo` 队列串行。
5. 自由面板旧 key 必须经过 `domain/free-panel-legacy.ts` 适配。

## 1. 启动装配

文件：`src/main.ts`

```
createApp
  → createPinia
  → bindFontData / bindActionData / bindFreePanelData / bindFontSetData
  → setProgressPort
  → installErrorHandlers
  → app.use(router).mount
  → startSelectionWatch（#/freePanel 除外）
```

独立自由面板判断：

```ts
window.location.hash.startsWith('#/freePanel')
```

⚠️ 判断只依赖 hash；如果入口不以 hash 进入，`startSelectionWatch` 不会跳过。

## 2. 存储地图

| 数据 | 文件 | 仓库 | store |
|---|---|---|---|
| 字体偏好 | `sj_set.json` | `cep/data/legacy-settings.ts` | `font-set` |
| 快捷字体/层级/翻译计数 | `sj_ztQuickFont.json`、`sj_ztHierarych.json`、`sj_ztTranslate.json` | `cep/data/font-extra.ts` | `font-set` |
| 面板 UI 偏好 | `sj_v5_ui.json` | `cep/data/settings.ts` | `usePersistedRef` |
| 字体列表 | 字体缓存 / PS | `stores/font` + `cep/jsx/font` | `font` |
| 动作仓库索引 | `sj_dzStoreInfo.json` | `cep/data/actions.ts` | `action` |
| 动作仓库文件 | `sj_dz*.json` | `cep/data/actions.ts` | `action` |
| 自由面板 | `sj_appFreePanel.json` | `cep/data/free-panel.ts` | `free-panel` |
| 分类 | `classification.json` | `classification-repo.ts` | `classification-view` |
| 标签 | `sj_ztglTags.ini` | `cep/data/index.ts` 的 `tagsRepo` | `font` |
| 星级 | `sj_ztglStar.ini` | `cep/data/index.ts` 的 `starsRepo` | `font` |

浏览器 dev 下 `settings.ts` 用 `localStorage`；CEP 下读写 `sj_v5_ui.json`。  
分类数据由独立读取函数处理，不走 `pick`。

## 3. 命令执行通用链

文件：`commands/registry.ts`

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

当前注册命令 55 条，唯一注册点 `commands/index.ts`。

## 4. 动作面板数据流

### 4.1 读

```
actionIndexRepo.read()
  → 当前仓库文件 actionLibraryRepo.read()
  → normalizeGroups
  → stores/action.groups
  → pages/action/index.vue
```

PS 动作列表：

```
jsx.action.getActionList()
  → readActionList()  // {name,children} / {groupName,list}
  → psGroups
  → ActionAddContext
```

仓库索引变更：

```
actionIndexRepo.onChange
  → stores/action.warehouses / activeIndex
  → selectActionFile(currentWarehouseFile)
```

⚠️ `onChange` 里写当前文件指针，是带副作用的读模型监听。

⚠️ `action.addWarehouse` 只加索引；仓库文件在首次写入时创建。

### 4.2 写

```
页面组件
  → useCommand('action.*')
  → commands/action.ts
  → actionLibraryRepo.update / actionIndexRepo.update
  → repo.onChange
  → stores/action 投影
```

### 4.3 执行

```
ActionGrid @run
  → page.runAction
  → action.call({ group, name, alias })
  → jsx.action.callAction
```

### 4.4 Ctrl / 拖拽

```
动作按钮 Ctrl+click
  → useFreePanelAdd.open([item])
  → FreePanelRegionPicker
  → freePanel.add({ blockId, items })
  → block.data

动作组 Ctrl+click
  → useFreePanelAdd.open(group.list, '批量添加动作组')
  → freePanel.add

动作按钮 drag
  ← ActionGrid
  → page drag state
  → action.reorderItem

动作分组 drag
  ← page 的 <section draggable>
  → page drag state
  → action.reorderGroup
```

⚠️ `ActionGrid` 的 drag 不读 `event.ctrlKey`；Ctrl+拖拽没有复制/追加语义。

## 5. 自由面板数据流

### 5.1 数据结构

```ts
FreePanelFile {
  uid: number
  btnId: number
  obj: {
    version: string
    type: 'row' | 'norow'
    list: FreePanelBlock[]
  }
}

FreePanelBlock {
  id: number
  zIndex: number | string
  showIcon: boolean
  showNumber: number
  showText?: boolean
  type: 'row' | 'norow'
  width?: string
  height?: string
  children: FreePanelBlock[]
  data: FreePanelItem[]
}

FreePanelItem {
  icon, type, key, btnId, text, funcText, option,
  left, top, position
}
```

### 5.2 读

```
freePanelRepo.read()
  → normalizeFreePanel
  → stores/free-panel.blocks
  → pages/freePanel/components/FreePanel.vue
  → FreePanelBlock
  → ActionGrid
```

### 5.3 接收快捷方式

```
动作页 / 字体页
  → useFreePanelAdd.open(items, title)
  → FreePanelRegionPicker
  → 用户选 block
  → freePanel.add({ blockId, items })
  → commands/freePanel.ts
  → freePanelRepo.update
  → onChange
  → store.blocks
```

发送端构造：

```ts
{ text, key, option, icon?, type? }
```

`freePanel.add` 的 option 规则：

```ts
option: item.option === undefined ? {} : item.option
```

区域选择器：

```
FreePanelRegionPicker
  → FreePanelBlockPicker（区域 id / 横排/竖排 / 项数）
  → confirm(blockId)
```

⚠️ 区域选择器是树形列表，不是完整按钮布局。

当前发送端：

- 动作按钮 Ctrl+点击
- 动作组 Ctrl+点击
- 字体顶部 5 个 Ctrl 图标

⚠️ 常用页、样式页等仍没有发送端。

### 5.4 执行

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

旧 key 映射：

```
dz_useAction        → action.call
zt_translate        → fontSet.translate
zt_createButton     → fontSet.createButton
zt_copyFontInfo     → fontSet.copyFont
zt_pasteFontInfo    → fontSet.pasteFont
zt_switchFontDirection → fontSet.switchDirection
zt_setFontSize       → fontSet.fontSize
zt_setFontLeading    → fontSet.leading
zt_setFontTracking   → fontSet.tracking
zt_setLeftRightAlign → fontSet.align
zt_setUpDownAlign    → fontSet.align
zt_changeTextBranchMerge → fontSet.split
cy_swapWireframeFill → legacy.call
cy_exportOpenFolder  → legacy.call('cy_openDirectory')
cy_batchExportLayer  → legacy.call('cy_BatchExportLayer')
cy_batchExportSecondLayer → legacy.call('cy_BatchExportSecondLayer')
cy_exportImage       → legacy.call('cy_ExportImage')
```

`legacy.call` 只允许 `commands/legacy.ts` 的 `ALLOWED` 白名单；未知 key 报“未开放”。

⚠️ `freePanel.execute` 外层 `execute` 已刷新选区，子命令 `execute` 再刷新一次；错误被包成 `CepError('JSX', result.reason)`。

⚠️ `legacy.call` 只走 `jsxCall`，没有 `jsxHistory/jsxHistoryNoCheck` 的历史写入。

### 5.5 拖拽

```
ActionGrid dragstart/dragover/drop
  → FreePanelBlock 加 blockId
  → FreePanel drag state
  → freePanel.reorder({
       fromBlockId, fromBtnId,
       toBlockId, toBtnId,
       position
     })
```

同 block 移动补偿下标；跨 block 不补偿。

### 5.6 区域编辑

```
菜单「新增区域」
  → freePanel.addBlock
  → obj.list 或 parent.children

区域 hover
  → ↔/↕ → freePanel.setBlock({ type })
  → ⤢  → CepModal → freePanel.setBlock({ width,height })
  → ×  → freePanel.removeBlock
```

⚠️ `setDisplay` 对所有 block 写 `showNumber/showIcon/showText`，没有按区域独立设置。

⚠️ `freePanel.clear` 用 `createEmptyFreePanel()` 重置 `uid=1`。

⚠️ `addBlock` 用 `next.uid += 1`，不取现有 block 的 `max(id)`。

### 5.7 独立面板入口

```
manifest 第二扩展
  → freePanel.html
  → index.html#/freePanel
  → MainLayout standalone（隐藏导航）
  → FreePanel
```

独立面板与主面板共享同一份前端产物和 `sj_appFreePanel.json`。

## 6. 字体面板数据流

```
fontSet 页面
  → useCommand('fontSet.*')
  → commands/fontSet.ts
  → ctx.jsx.font.*
  → PS

当前文字
  → selection/current-text
  → stores/font-set
  → FontColor / FontQuick / FontHierarchy

字体列表
  → cep/jsx/font.initSystemList
  → stores/font
  → FontQuick / FontSetSelect
```

Ctrl+点击：

```
FontSetIcon @ctrl
  → page.openFreePanel
  → useFreePanelAdd
  → freePanel.add
```

当前只覆盖字体顶部 5 个图标。

## 6.1 字体管理 / 标签 / 分类

```
字体列表
  → stores/font.fetchList
  → cep/ps.getFontList
  → jsx.font.initSystemList
  → fontManage 列表（usePagedList）

标签
  → tagsRepo / getFontTags
  → stores/font.tags
  → TagMenu / FontWeight / FilterPanel

分类
  → cep/data/classification-repo
  → stores/classification-view
  → fontManage 筛选

预览
  → usePersistedRef('font.previewMode' / 'font.previewText')
  → PreviewSetting / PreviewText
```

标签创建/重命名/删除走 `commands/font.ts`；`TagCreator/TagMenu` 仍持有页面弹层状态。

## 6.2 选区 / PS 事件

```
PS 事件（selection / transform / make / setd）
  → cep/events
  → selection/index.selectionRef
  → useCommand 的 requires 检查
  → 当前文字快照
      → selection/current-text
      → jsx.font.getFontSimpleInfo
      → textInfoRef
      → stores/font-set
      → FontColor / FontHierarchy
```

独立自由面板启动时跳过 `startSelectionWatch()`，因此没有选区快照。

## 6.3 设置 / 偏好

```
页面
  → usePersistedRef / setPref
  → cep/data/settings.ts
  → sj_v5_ui.json（浏览器 dev 用 localStorage）
  → settingsSnapshot()
  → CommandContext.settings
```

字体面板的 `sj_set.json` 由 `cep/data/legacy-settings.ts` 局部读写，不走 `settings.ts`。

`settingsSnapshot()` 是命令执行时的快照；命令运行中再改偏好，不影响当前 `ctx.settings`。

## 6.4 `.dzx` 导入导出

```
导出
  → action.exportWarehouse
  → cep/dialog.saveFile
  → data/action-archive.exportActionArchive
      → actionIndexRepo.read
      → 读仓库文件 base64
      → encodeDzx
      → writeTextFile

导入
  → action.importWarehouse
  → cep/dialog.openFile
  → data/action-archive.importActionArchive
      → decodeDzx / remapDzxFileNames / validate
      → 先写新仓库文件
      → actionIndexRepo.write
      → selectActionFile
      → 替换模式最后清理旧文件
```

写入失败时删除本次已写文件；索引未写成功前，旧索引和旧文件保持可用。

## 6.5 网络 / 翻译

```
FontSet 翻译
  → commands/fontSet.translate
  → cep/http（JSONP）
  → translateCounterRepo
  → jsx.font.setTranslateText
```

## 7. 浮层与弹窗数据流

### 7.1 统一几何

```
computeFloatingPosition（纯函数）
  → useFloatingPosition（DOM 测量 + resize/scroll）
  → usePopover（open / outside / Esc / ARIA / 清理）
  → GPopover.vue（trigger + panel 壳）
```

### 7.2 已接入

| 组件 | 方式 |
|---|---|
| `GDropdown` | `usePopover` |
| `SelectBox` | `usePopover` |
| `ActionWarehouse` | `usePopover` |
| `TagMenu` | `useFloatingPosition` + `useDismiss` |
| `TagContextMenu` | `useFloatingPosition` + `useDismiss` |
| 动作页 `ctx-menu` | `useFloatingPosition` + `useDismiss` |

### 7.3 未接入 / 重复

⚠️ `FontSetSelect` 仍是 absolute。  
⚠️ `GTooltip` 仍是 anchored absolute。  
⚠️ 动作页列布局菜单仍是 absolute，没有当前项勾选。  
⚠️ `GPopover.vue` 没有被业务组件使用。  
⚠️ `CepModal` 是固定 `width` + `max-width/max-height` 的居中弹窗。  
⚠️ `TagMenu/TagContextMenu/动作 ctx-menu` 仍各自保留 `useDismiss`。

## 8. 公共组件与重复实现

### 已抽

| 组件 | 使用方 |
|---|---|
| `ActionGrid.vue` | 动作页（1/2/3 列）、自由面板（2/3/4 列） |
| `BaseGroup.vue` | 动作页 |
| `SelectBox.vue` | 动作添加弹层 |
| `CheckBox.vue` | 动作添加弹层 |
| `CepModal.vue` | 确认 / 区域尺寸 |
| `useFreePanelAdd.ts` | 动作页、字体页 |
| `usePopover` / `useFloatingPosition` | 部分浮层 |

### 仍未抽 / 有重复

⚠️ `ActionGrid.vue` 仍带动作页专用类 `action-item__run`。  
⚠️ 动作页列布局菜单与自由面板工作区菜单是两套；动作 1/2/3，自由 2/3/4。  
⚠️ `FreePanelBlock` 的 block 布局和悬浮工具按钮没有和动作页分组布局共享。  
⚠️ 标签菜单、右键菜单、ActionWarehouse 内容层各自实现。  
⚠️ `CepModal`、`DistributedDialog` 是两套弹窗壳。

## 9. Ctrl / 拖拽矩阵

| 场景 | 行为 | 落点 | 状态 |
|---|---|---|---|
| 动作按钮 Ctrl+click | 打开区域选择器 | `runAction(item, event)` | ✅ |
| 动作组 Ctrl+click | 批量加入自由面板 | `BaseGroup @ctrl` | ✅ |
| 字体顶部 Ctrl+click | 加入自由面板 | `FontSetIcon @ctrl` | ✅ |
| 动作按钮 drag | 同组/跨组移动 | `ActionGrid` → `action.reorderItem` | ✅ |
| 动作组 drag | 组排序 | page `<section draggable>` → `action.reorderGroup` | ✅ |
| 自由面板按钮 drag | 同/跨 block 移动 | `ActionGrid` → `freePanel.reorder` | ✅ |
| Ctrl+drag | 无特殊行为 | 无 | ⚠️ |
| 自由面板 block drag | 无 | 无 | ⚠️ |
| 动作组 Ctrl+drag | 无 | 无 | ⚠️ |

## 10. 数据流问题清单

| # | 严重度 | 问题 | 影响 |
|---|---|---|---|
| 1 | 高 | 独立面板是 `freePanel.html` → 主应用 `#/freePanel`，不是独立前端入口 | UI/通信与主面板共享 |
| 2 | 高 | 多进程同时写 `sj_appFreePanel.json`，`fileRepo` 队列只在本进程内串行 | last-write-wins |
| 3 | 高 | `legacy.call` 只调用 `jsxCall`，不写 `jsxHistory` | 历史记录不同 |
| 4 | 中 | `freePanel.execute` 嵌套子命令，重复 `refresh()` | 多一次选区查询，错误被二次包装 |
| 5 | 中 | `showText` 是当前代码新增字段 | 写回文件后多一个字段 |
| 6 | 中 | `setDisplay` 一次改所有 block | 不能按区域配置 |
| 7 | 中 | 发送端只有动作页、字体页 | 其他页面不能加入自由面板 |
| 7b | 中 | 区域选择器是树形列表 | 看不到按钮布局 |
| 8 | 中 | Ctrl+drag 未实现 | 没有复制/追加语义 |
| 9 | 中 | `ActionGrid` 仍带 `action-item__run` | 自由面板继承动作类名 |
| 10 | 中 | 列布局菜单两套 | 动作 1/2/3，自由 2/3/4 |
| 11 | 低 | `freePanel.clear` 重置 uid=1 | 旧 id 会被重新使用 |
| 12 | 低 | `addBlock` 不取 max(id) | uid 不同步时 id 会重复 |
| 13 | 低 | `free-panel` store 的 `degraded` 不在 `onChange` 更新 | 写后状态滞后 |
| 14 | 中 | 浮层只接了一半 | `FontSetSelect`/`GTooltip`/动作列菜单仍 absolute |
| 15 | 低 | `GPopover` 未使用 | 多一层未消费的壳 |

## 11. 当前代码验证

```
npm run check        通过
vue-tsc              通过
npm test             40 个测试文件通过
npm run build        通过
```

证据索引：

| 事实 | 证据 |
|---|---|
| 命令总数 55 | `src/commands/*.ts` 的 `id:` 去重统计 |
| 唯一注册点 | `src/commands/index.ts` |
| 唯一执行入口 | `src/commands/registry.ts` |
| 自由面板仓库 | `src/cep/data/free-panel.ts` |
| 动作归档 | `src/cep/data/action-archive.ts` |
| 自由面板命令 | `src/commands/freePanel.ts` |
| 旧 key 适配 | `src/domain/free-panel-legacy.ts` |
| 快捷方式发送端 | `src/composables/useFreePanelAdd.ts` |
| 共用按钮网格 | `src/components/ActionGrid.vue` |
| 浮层几何 | `src/composables/floating-position.ts` |
| 浮层行为 | `src/composables/usePopover.ts` |
| 独立面板入口 | `public/freePanel.html` + `public/CSXS/manifest.xml` |
| 单测 | `tests/**/*.test.ts`，40 个文件 |

## 12. 结论

当前代码的数据流主链：

```
发送端 → useFreePanelAdd → freePanel.add → repo → store → ActionGrid
ActionGrid → freePanel.execute → legacy adapter → command → jsx
```

代码层结构如上，所有 ⚠️ 都是当前实现的已知边界。
