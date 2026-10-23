# tools —— 逆向流水线

> 这套脚本把原面板的压缩包拆成「组件 / 模板 / 方法 / 样式 / jsx 契约」，
> 产出 `reference/02-组件文档/` 下的全部文档。
> **本文件是唯一说明**：每个脚本做什么、吃什么、吐什么、现在还能不能跑。

## 一、先看这个：目录名变过

脚本里写死的路径是**旧目录布局**，现在仓库已经改过名。对照：

| 脚本里写的 | 现在实际 |
|---|---|
| `03-源码还原/webcrack输出/app/` | **已删除**（webcrack 中间产物，没进存档） |
| `03-源码还原/组件/` | **已删除** |
| `BUILD-SPEC/` | `reference/02-组件文档/` |
| `12-新面板/` | `app/` |
| `05-官方资源/04-CEP资源包/` | `reference/03-原版安装包/04-CEP资源包/` |
| `01-稳定版/...` | `reference/01-原版源码/panel/` |

**跑之前先对一遍上表**，否则脚本会报"找不到输入"或写到不存在的目录。

## 二、脚本清单与当前状态

状态含义：✅ 现在能跑 / ⚠️ 能跑但要先改路径 / ⛔ 缺输入（需重建 webcrack 产物）

| 脚本 | 作用 | 输入 | 输出 | 状态 |
|---|---|---|---|---|
| `01-text.cjs` | 中文文案 → 模块索引 | `03-源码还原/.../app/*.js` | 文案索引 `.md/.json` | ⛔ |
| `02-funcs.cjs` | 函数切分 | — | — | **文件不存在**（`run.cjs` 里仍列着它） |
| `03-components.cjs` | 组件识别（按 `data:function` / `methods:{` 锚点，不依赖 `name`） | `app.v4.js`（`--legacy` 才读旧目录） | `tools/_out/components/` + `component-map.json` | ✅ 单文件模式切出 193 个，与 reference 总数一致 |
| `04-spec.cjs` | 组件规格 | 组件 `.js` + map | `BUILD-SPEC/02-组件/<名>.md` | ⛔ |
| `04b-methods.cjs` | 方法实现 | 组件 `.js` | `02-组件/methods/` | ⛔ |
| `05-flows.cjs` | 交互链路 | 组件 `.js` | `03-交互链路/` | ⛔ |
| `06-store.cjs` | Vuex store 拆解 | 组件/入口 `.js` | `04-store.md` | ⛔ |
| `07-styles.cjs` | class → CSS 规则 | `panel/css/*.css` | `05-样式.md` | ⚠️ 改 `CANDIDATES` |
| `08-jsx.cjs` | jsx 调用契约 | 组件 `.js` | `06-jsx契约.md` | ⛔ |
| `09-template.cjs` | 模板结构树（递归解析 `render`） | `app.v4.js` + `tools/_out/component-map.json` | `tools/_out/templates/` + **`_索引.md`**（按根 class 可查） | ✅ 193 份，归属 bug 已修并**验证**（见第四节） |
| `10-deps.cjs` | 组件依赖关系 | 组件 `.js` | `09-依赖关系.md/.json` | ⛔ |
| `11-tree.cjs` | 路由 → 组件 → 子组件树 | `app/*.js` | `11-组件树.md` | ⛔ |
| `12-dynamic.cjs` | 动态逻辑（v-for / 条件 / computed） | 组件 `.js` | `10-动态逻辑.md` | ⛔ |
| `13-reuse.cjs` | 组件复用度 | `11-组件树.md` | `12-组件复用度.md` | ⛔ 缺上游 |
| `14-sprite.cjs` | 抽 SVG sprite + 图标名 | `app.8565afb8.js` | `app/src/assets/icons-sprite.svg`、`icon/names.ts` | ⚠️ 改两个路径；**会覆盖现有 sprite，慎跑** |
| `15-page-spec.cjs` | **页面结构 + 每个 class 的实测样式** | `app.v4.js` + `panel/css/*.css` | `app/docs/生成/页面规格/0N-*.md` | ✅ |
| `16-page-checklist.cjs` | 把页面规格转成清单的「结构对照」章（去重、一 class 一行、带状态列） | 15 号产物 | `app/docs/页面/_片段/`，人工合并进清单 | ✅ |
| `98-audit.cjs` | 质量审计 | `BUILD-SPEC/` | `07-审计报告.md` | ⛔ 缺上游 |
| `99-build-spec.cjs` | 收敛总览 | `BUILD-SPEC/` | `00-总览.md` | ⛔ 缺上游 |
| `run.cjs` | 一键跑全部 | 见上 | 见上 | ⚠️ 缺输入时跳过相关步骤 |

临时脚本（不是流水线，别当工具用）：`_dump.mjs`、`_fmcss.mjs`、`解密jsxbin.js`、`修复登录态.js`、`版本.js`。

## 三、怎么恢复完整流水线

缺的是 webcrack 还原产物。重建：

```powershell
npx webcrack <原面板 bundle.js> -o "03-源码还原/webcrack输出/app"
node run.cjs
```

**注意顺序**：`03-components` 必须先于 `04/04b/05/08/09`，因为它产出的 `component-map.json` 是后面所有步骤的组件索引。`run.cjs` 已按这个顺序排。

如果只是要**页面结构 + 样式**（不重建 webcrack），用 15 号，它直接读 `reference/01-原版源码/panel/js/app.v4.js`：

```powershell
node 15-page-spec.cjs --list          # 列出所有 render 的根 class
node 15-page-spec.cjs                 # 生成 7 个页面
node 15-page-spec.cjs --page Style    # 单页（按 PAGES 里的 key）
```

## 四、已修的两个 bug（别再踩回去）

### 1. `09-template.cjs` 归属方向反了（D-10 的根因）

```js
if (c.file === f && c.start < m.index) { ... }   // 旧：取 render 之前的组件
```

Vue 2 产物里 `render` 定义在**组件对象之前**（`render` 34774 → `name:"Custom"` 35124），
旧写法把每份模板都归给**上一个**组件——`tpl_Custom_*.md` 里装的是 `CommonUse` 的树。
已改为 `c.start > m.index`，并加前向兜底。

**已重跑验证（2026-10-21）**：`tpl_Custom_L34774.md` 的根 class 现在是 `Custom`（旧版是 `CommonUse`），
`Rename` / `FontSet` / `Action` / `CommonUse` 也全部对上。193 份产物在 `tools/_out/templates/`，
**取代文件名的是 `_索引.md`**（按根 class 排序）。旧文件保留在 `reference/…/08-模板/`，但引用一律走索引。

### 2. `15-page-spec.cjs` 的组件定位

压缩产物里子组件**多数没有 `name` 字段**，而且不同组件会复用同一个根 class
（`Style` 的 `color` / `gradients` 根 class 都叫 `export-wrap`）。
定位靠的是组合关系，不是名字也不是 class：

```
var HC = Object(Y.a)(script, render, styles)   // 组装
var VC = HC.exports                            // components 里引用的是 exports
components: { color: VC }                      // → color 用 render 那个函数
```

## 五、口径说明（避免把两个数字混用）

- `11-组件树.md` 的「N 个子组件」= 模板里直接引用的标签数，**会漏**（`Set` 漏了 `version-switcher`）。
- `12-组件复用度.md` 的「可达组件数」= 递归可达（含子组件内部再引用的基础件），**与上者不同源**。
- `15-page-spec.cjs` 按 `components` 声明 + `Object(...)` 组装关系，**逐页实测**，与两者都可能差几个。
  引用数字时写明来源，别互相印证。
