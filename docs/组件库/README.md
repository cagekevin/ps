# 组件备件库

> **用途：** 新页面上手前先查这里。  
> **原则：** 先找现成控件；找不到再申请；申请没批准前不写 UI。

## 目录

| 文档 | 内容 |
|---|---|
| [官方控件](./官方控件.md) | 原版通用控件、证据、关键 class、对应关系 |
| [现有控件](./现有控件.md) | `src/components` 里已有的备件、层级、用途 |
| [映射与缺口](./映射与缺口.md) | 官方 → 现有 → 缺口，以及重复实现 |
| [组件宪法](./组件宪法.md) | 现有组件允许的 props / 变体 / 禁止项 |
| [页面模板](./页面模板.md) | SettingsPage / ListPage / DetailPage |
| [新控件准入](../规范/新控件准入.md) | 新增控件前必须提交的证据、ASCII、用户批准 |

## 备件分层

### Tier A：页面骨架与基础控件

可以直接复用：

- `PageShell`
- `GButton`
- `CheckBox`
- `GInput`
- `SelectBox`
- `GDropdown`
- `GMenu` / `GMenuItem`
- `CepModal`
- `Icon`
- `NewSpin`
- `BackTop`
- `ToastHost`
- `TaskHud`

### Tier B：域内共用

只在对应域内复用：

- `ActionGrid`：动作页、自由面板
- `BaseGroup`：动作页
- `GPopover`：浮层壳，业务未接入

### Tier C：缺失

尚未抽象：

- `SettingsSection`（设置页折叠行）
- `EmptyState`（通用空态）
- `Tabs`（通用选项卡）
- `TagInput`（标签输入）
- `VersionSwitcher`
- `DeviceModal`
- `ListLoading`
- `SearchInput`

## 使用规则

1. 页面不写按钮、勾选框、输入框、弹窗样式。
2. 页面不写新的颜色、字号、圆角。
3. 页面级结构只允许 `PageShell` + 已登记的 Section / Row。
4. 需要新控件 → 走 `docs/规范/新控件准入.md`。
5. 新增控件必须当次替换旧实现，不能只加不删。
6. 视觉证据只认源码路径、行号、选择器；不认“看起来像”。

## 新页面

```bash
npm run new:page -- --template=settings --route=/foo --name=foo --title=标题
```

只生成 `settings / list / detail` 三种页面。

## 控件模板

源码：

```text
src/pages/_atoms/index.vue
```

开发路由：

```text
#/__atoms
```

它不是演示页，是唯一控件模板：

- 外层固定 `PageShell`；
- 所有可用控件都从这里选；
- 每个控件块上方注释写清允许的用法和禁止项；
- 新增控件必须先进这里，再允许页面使用。

## 当前结论

已完成页面冻结，不再为了统一做视觉迁移：

```text
/fontSet
/fontManage
/action
/freePanel
/set
```

这些页面只修 bug / 数据错误 / 安全问题。  
页面契约、脚手架、组件宪法只约束后面的新页面。
