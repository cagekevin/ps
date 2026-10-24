# 给后续 AI / 开发者的规则

这个文件是**硬约束**，不是建议。改代码前先读完。

## 项目是什么

PS 面板（CEP 12）重写。Vue 3 + TS + Vite + Pinia。
UI 和数据流全部重写；PS 能力层继续调原厂 jsxbin（`public/lib/all.decrypted.js`），不逆向、不重写。

## 环境与约束（不可协商）

- **用户不参与验证。** 不要要求用户开 PS 点、不要发"请你确认 / 帮我看一眼 / 你测一下"。
  能自己查的自己查；查不到的标记，不许猜，也不许把验证责任推回去。
- **禁止 e2e / 浏览器自动化 / 截图回归。** 不装 Playwright / Cypress / Puppeteer，
  不写自动点面板、开浏览器跑流程、做像素 diff 的脚本。
- **单元 / 组件测试允许，而且该写就写。** 用 `vitest` + `@vue/test-utils` + `jsdom`，
  全部在 Node 里跑：不启浏览器、不点 PS、不 `fetch`、不启 dev server。
- 验证分三层，测什么/不测什么/优先级/无意义测试的判据，**全部见 `docs/规范/测试规范.md`**。三条铁律：
  1. 先列测试点（3-6 条），再写代码；写不出测试点的需求 = 没想清楚
  2. 只断言可观察结果（返回值 / emit / 语义类 / 依赖调用），不测布局与坐标（jsdom 没有）
  3. 不追覆盖率；P0（白屏 / 丢数据 / 静默失败）必须有，P2 细节可以没有

| 层   | 手段                                           | 能证明                                   |
| ---- | ---------------------------------------------- | ---------------------------------------- |
| 静态 | `vue-tsc` / `npm run check` / `npm run ledger` | 类型、样式、债务账本                     |
| 组件 | `npm test`（jsdom）                            | 逻辑、事件、DOM 输出、条件分支           |
| 运行 | 只能在 PS 里                                   | 真实数据、点击、视觉 —— **不做，标未验** |

- 前两层查不到的，一律写 `UNVERIFIED`，并在该页清单里留一行。**不写"已完成""正常""应该没问题"。**

## 已完成页面冻结

`/fontSet`、`/fontManage`、`/action`、`/freePanel`、`/set` 以及已有非占位页面：

- 不再为了“统一”做视觉迁移；
- 只允许修 bug / 数据错误 / 安全问题；
- 不允许重排布局、换控件皮肤、删除页面私有结构。

本规则只约束后面前页面。新页面仍必须走页面契约。

## 页面契约（硬门槛）

改任何**新页面**的 UI 前，先按 `docs/组件库/页面契约.md` 报备整页设计：

- ASCII 结构；
- 组件清单；
- 页面 CSS（优先“无”）；
- 数据流；
- 新控件单列。

批准口令只有：

```text
USER APPROVED PAGE: /route
```

没有这句，不写该页 UI。  
“好 / 继续 / 可以”都不算批准。

## 控件准入（硬门槛）

新增按钮 / 勾选框 / 输入框 / 菜单 / 弹窗 / 折叠行 / 页面级 Section，必须先查
`docs/组件库/README.md`，再读 `docs/规范/新控件准入.md`，并提交：

1. 原版出处（文件 + 行号 / 选择器）；
2. 现有控件排查（为什么不能复用）；
3. ASCII 结构图；
4. 数据流和状态；
5. **用户明确批准**。

缺任意一项，不写代码。  
“好”“继续”“可以”不算批准；必须是“同意新增 <控件名>”。

## 写代码前：三个动作

> 这三条不是约束，是**让下一张页面少返工**的方法。上一轮 9 次返工全落在这三条上。
> 每条都有判定句：做不到就是没做完，不需要理解背景。
> 其余规则都归到下面的「需要事实时再查」，**不是开工前通读**。

### 动作 1：先搜一次，再决定建不建文件

```powershell
grep -rln "<概念词>" src          # 有哪些文件叫这个名字
grep -rn "export .*<概念词>" src  # 有哪些导出叫这个名字
```

命中 > 1 处 → **不许新建，先合并**，合并完再写。

为什么：同一个词落在两个文件里 = 两次选择，两次选择就是两套实现。`filter` 已经有两份，`classification` 有三份。

**判定**：你新建的文件名，全仓库只出现一次。

**查邻居（2026-10-23 加，因为吃过一次亏）**——新建 `data/` / `utils/` / `composables/` 文件前，三个动作缺一不可：

1. 看目录邻居 + 搜机制：
   ```powershell
   ls src/cep/data src/utils src/composables
   grep -rn "onChange\|deepClone\|deepMerge\|debounce\|subscribeHostEvent" src/utils src/cep/data
   ```
   理由：`utils/clone.ts` 的 `deepClone`、`file-repo.ts` 的 `onChange` 都在那儿，我却在 `common-use.ts` 里又写了一整套订阅总线（T-86c 删掉）。
2. **commit message 里写一行"查过哪些邻居文件"**。写不出来 = 没查，等于没做。
3. 打开 `docs/生成/横切能力.md` 对应小节看一眼（`npm run registry` 生成，谁有什么都写在那儿）。

**判定**：这次 diff 若新增了上述目录的文件，commit body 里能搜到"邻居："这一行。

### 动作 2：建文件 = 一次替换，不是一次追加

新增入口（文件 / 导出 / 组件 / store 方法）时，**当次删掉它替代的那个**。

不许"先加，以后再清理"。三个图标组件并存、两套 mock 并存，都是这么留下来的：加的时候都合理，删的时候永远排不上。

**判定**：这次 diff 里必须有删除（删文件 / 删导出 / 删旧调用点）。只有 `+` 没有 `-` 的提交，不算完成。

### 动作 3：新页面第一条 commit 改第一页

第二页要用第一页的东西 → **搬上去**，不在第二页复制。抽象发生在"第二页要用"这一刻，不是"以后统一重构"。

**判定**：该页的第一个 commit 只动公共目录（`components/` `composables/` `domain/` `stores/` `cep/`），不含 `pages/<新页>/`。

### 命名：一个概念一个文件，名字带域

同一概念分属不同层时，**名字必须不同**，让搜一次就能得到"该用哪个"的答案：

| 现在                         | 改成                              | 理由                                 |
| ---------------------------- | --------------------------------- | ------------------------------------ |
| `domain/filter.ts`           | `domain/font-filter.ts`           | 带域，避免第二页再建一个 `filter.ts` |
| `cep/data/classification.ts` | `cep/data/classification-repo.ts` | 读实现                               |
| `stores/classification.ts`   | `stores/classification-view.ts`   | 只读投影                             |

**判定**：搜一个概念词命中多个文件时，每个文件名都能看出它属于哪一层。

### 公共文件首行三段

`src/{cep,domain,stores,composables,utils}` 下的文件，前 5 行必须是：

```ts
// 是什么｜替代了什么｜谁在用
```

**判定**：打开文件 5 秒内能回答"我该不该用它、该看哪一份"。

---

## 我们有什么（资产地图，查证前先看这张）

> 这一节是**事实清单**，不是规范。目的是：别再去别人嘴里问"我们有没有 X"，这里写着有没有、几行、能不能重新生成。
> 数字会漂——漂了就跑 `npm run stats` 并顺手更新本表。

### 1. 文档与生成物

| 想知道                                           | 去哪                                                                                  | 能重新生成?                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 每页做到哪、下一步怎么定                         | `docs/状态/进度.md`                                                                   | 散文手写；带 `stats` 注入块的部分由脚本生成                       |
| **所有技术债（唯一待办源 · 债侧）**              | `daily/架构日志/债务.md`                                                              | 摘要手写；**读写唯一入口 = `node scripts/debt.mjs`**，禁手写表格行 |
| **所有任务（唯一待办源 · 任务侧）**              | `daily/架构日志/00-任务-总索引.md`                                                    | 手写，`npm run ledger` 校验                                       |
| 某笔债的明细、证据与覆盖度表                    | `daily/架构日志/<NN>-<区域>-<日期>.md`                                                | 手写；`债务.md` 的锚点列指向它                                    |
| 区域审计进度（灯：已审 / 有债 / 未审）            | `daily/架构日志/index.md`                                                             | ✅ 机器生成 `node scripts/arch-index.mjs`（禁手改）                |
| 单页验收记录（原版 vs 我方逐项）                 | `docs/页面/0N-*.md`（10 份，约 4200 行）                                              | 手写                                                              |
| **单页 render 结构树 + 全量 class + CSS 实测值** | **`docs/生成/页面规格/0N-*.md`（9 份，约 3700 行）**                                  | ✅ `npm run spec`（读 `docs/原版/01-原版源码/`，与这 9 份产物一一对应）                 |
| 某页某个 class 有没有绑事件                      | `docs/生成/交互清单.md`（1665 行）                                                    | ❌ 数据源（webcrack 解包输出）**不在仓库**；缺时脚本以退出码 2 说明缺哪条路径 |
| 已有哪些公共能力、谁在用                         | `docs/生成/横切能力.md`（约 356 行）                                                  | ✅ `npm run registry`                                             |
| 库文件格式 `.kux/.kuc/.kug/.kuf/.kus`            | `docs/生成/库文件格式契约.md`（745 行）                                               | ❌ **手写**（放错目录，见 §4）                                    |
| jsx 返回结构复原（20 个函数）                    | `docs/生成/jsx返回结构复原.md`（899 行）                                              | ❌ **手写**（同上）                                               |
| 为什么这么设计（ADR-0001…ADR-0026）              | `docs/adr/`（**一条一文件**，ADR-NNNN-*.md）                                          | 由 `scripts/adr.mjs` 读写；README 索引是产物，禁手改                                            |
| 数据流（启动/命令链/存储地图/跨页机制）          | `docs/架构/dataflow.md`（354 行）                                                     | 手写；含 6 条复核命令                                             |
| 云同步端点、载荷、鉴权                           | `docs/架构/云同步契约.md`、`云同步底层设施.md`                                        | 手写                                                              |
| 分层原则与四层结论                               | `docs/架构/目标架构.md`                                                               | 手写                                                              |
| 测什么/不测什么/优先级                           | `docs/规范/测试规范.md`                                                               | 手写                                                              |
| 视觉规范（字号/图标/图标+文字）                  | `docs/规范/视觉规范.md`                                                               | 手写                                                              |
| 原版哪些地方本身就是坏的                         | `docs/规范/原版缺陷.md`                                                               | 手写                                                              |
| 控件库现状与准入                                 | `docs/组件库/README.md`、`现有控件.md`、`映射与缺口.md`、`页面契约.md`、`组件宪法.md` | 手写                                                              |
| 规模数字（命令 / 用例 / 组件 / 图标 / 页面）     | `docs/生成/规模.md`                                                                   | ✅ `npm run stats`                                                |
| 最近踩过什么坑、做过什么决策                     | `docs/日志/`（13 篇）+ `docs/日志/index.md`                                           | ✅ `npm run log:index`                                            |
| **工序命令集（写码 / 排错 / 审计 / 治理）**         | `.codebuddy/commands/*.md`（23 篇 + `dep-audit.cjs`）                                 | 手写；**2026-10-24 已整体本仓化**（层名 / 门禁 / 文档来源全部指向本仓，禁再引入外仓口径） |

### 2. 代码结构（2026-10-23 实测）

| 层 | 规模 | 放什么 |
| --- | --- | --- |
| `src/pages/` | <!-- stats:begin layers.pages -->63 文件 / 12799 行<!-- stats:end layers.pages --> | 11 个页面（含 `_atoms` `_probe` `_placeholder` 三个内部页） |
| `src/cep/` | <!-- stats:begin layers.cep -->55 文件 / 7169 行<!-- stats:end layers.cep --> | PS 出口：`transport` / `jsx/<域>` / `data/`（仓库层）/ `cloud` / `dialog` / `events` |
| `src/components/` | <!-- stats:begin layers.components -->36 文件 / 3288 行<!-- stats:end layers.components --> | 跨页组件；`G` 前缀 = UI 基础件 |
| `src/domain/` | <!-- stats:begin layers.domain -->25 文件 / 3545 行<!-- stats:end layers.domain --> | 纯函数与类型，零 IO；**唯一例外** `font-missing.ts`（跨层共享 UI 状态，用了 Vue `ref`，已登记为债） |
| `src/commands/` | <!-- stats:begin layers.commands -->16 文件 / 4827 行<!-- stats:end layers.commands --> | 命令注册表 + 分域命令 |
| `src/composables/` | <!-- stats:begin layers.composables -->10 文件 / 918 行<!-- stats:end layers.composables --> | 组合式（`useCommand` 在 `components/command/`） |
| `src/stores/` | <!-- stats:begin layers.stores -->15 文件 / 1220 行<!-- stats:end layers.stores --> | 只读投影 + 少量 UI 状态 |
| `src/utils/` | <!-- stats:begin layers.utils -->11 文件 / 636 行<!-- stats:end layers.utils --> | 通用工具；**唯一例外** `error-handler.ts`（接 `stores/feedback` 做全局错误提示） |
| `src/cloud/` | <!-- stats:begin layers.cloud -->4 文件 / 1045 行<!-- stats:end layers.cloud --> | 同步引擎与台账 |
| `src/selection/` | <!-- stats:begin layers.selection -->2 文件 / 426 行<!-- stats:end layers.selection --> | 选区 / 当前文字快照 |

**测试**：<!-- stats:begin tests -->**159 个文件、1319 处用例**（静态计数 `it()`/`test()`；非通过数）<!-- stats:end tests -->（`tests/{cep,cloud,commands,components,composables,data,domain,pages,selection,stores,utils}`）。

### 3. 一手证据已入库，别再问"路径在不在"

**原版源码、组件文档、CSS、抽取脚本都已搬进仓库**（2026-10-23），位置见 `docs/原版/` 与 `docs/原版/README.md`。

| 想知道 | 去哪 | 备注 |
| --- | --- | --- |
| 原版未压缩源码 | `docs/原版/01-原版源码/panel/js/app.v4.js`（73,703 行美化版） | **一手证据**，行号即锚点 |
| jsx 函数真实名单 | `app.v4.js:17058`（派发表）+ `17061-17184`（调用封装） | 函数名先在这里对一遍，对不上就是假的 |
| 原版组件 props / methods / 文案 | `docs/原版/02-组件文档/02-组件/<组件>.md`、`08-模板/tpl_*.md` | 注意 `tpl_*` 文件名会错位（D-10） |
| 原版 CSS 实测值 | `docs/原版/01-原版源码/panel/css/app.bf68b505.css`（安装包副本：`docs/原版/03-原版安装包/04-CEP资源包/CEP001-设计助理/css/app.bf68b505.css`） | 也可查 `生成/页面规格/0N-*.md` 的「实测样式」列 |
| 页面结构树 / 全量 class | `docs/生成/页面规格/0N-*.md` | 由 `npm run spec` 生成（`scripts/page-spec.mjs`，逻辑取自 `docs/原版/tools/15-page-spec.cjs`） |

**规矩**：凡"官方怎么调 / 什么参数 / 什么结构"，**必须回源码核对**；
`UNVERIFIED` 只留给真机行为（PS 是否回某个事件、jsx 返回值的取值），
**不再给函数签名这种读一次就能确定的东西**。

### 4. 三个会让人白跑一趟的陷阱

1. **页面文档标「未提取」，生成物里其实有。** `docs/页面/04`(3 处) / `05`(1) / `06`(1) / `07`(1) / `08`(1) / `09`(12) 都还写着「未提取」，但对应 `docs/生成/页面规格/0N-*.md` **都有完整结构树与 CSS 实测值**。**先查生成物，再信「未提取」**。
2. **`docs/生成/` 里有四个文件是手写的，不是脚本产物。** `库文件格式契约.md`、`jsx返回结构复原.md`、`RepoRead消费方清单.md`、`硬规则20违规清单.md` 是调查结论，**可以手改**（与 `docs/README.md` 说"生成物别手改"矛盾；这四份文件的首行都写明了这一点）。`生成/` 其余文件（`交互清单` / `横切能力` / `注册表.json` / `样式基线.json` / `断言基线.json` / `规模.*` / `常用页-左键分派.json` / `jsx派发表.json` / `页面规格/`）才是产物。
3. **`src/cep/env.ts` 的 `PS_ENV` 常量不是死代码。** 它是**注入给 jsx 的环境契约**（字段名不能改），包括 `VUE_APP_UMS` 这类看起来像账号残留的字段。不做账号**功能** ≠ 删这几个常量。

### 5. 脚本清单（写清能不能跑、要不要仓库外的数据、门禁管不管）

本表记的是能不能跑、要不要外部依赖、门禁管不管，不记有没有写。

| 命令 | 干什么 | 状态 |
| --- | --- | --- |
| `npm run check` | **12 步**：style-guard → template-guard → assert-guard → dispatch:check → boundary:pages → **layer:boundary** → spec:check → ledger → stats:check → lint → format:check | ✅ **不含测试、不含类型检查、不含 `scripts/`** |
| `npm run check:tools` | **2 步**（**工具层**）：`lint:tools`（eslint scripts）→ `format:check:tools`（prettier scripts/**） | ✅ **不进 `deploy`** —— 工具脚本的风格问题不许卡产品交付（2026-10-24 裁定） |
| `npm run layer:boundary` | 层间方向守卫：store 只读 / 命令不自取选区 / 适配层不引文案层 / domain 不反向依赖 `@/cep` | ✅ 已进 `check`；判据见 `docs/架构/目标架构.md` §4.7 |
| `npm test` | vitest run（`<!-- stats:begin tests -->**159 个文件、1319 处用例**（静态计数 `it()`/`test()`；非通过数）<!-- stats:end tests -->`） | ✅ 单独一条，`check` 不调它 |
| `npm run deploy` | check → typecheck → build → verify:dist | ✅ 跑全的入口；**不含测试**，测试是流程不是脚本 |
| `npm run build` | `vite build`，**只此一步** | ✅ 不带任何检查；检查归 `check` / `typecheck` / `verify:dist` |
| `npm run typecheck` | `vue-tsc --noEmit`（`src/**`）+ `vue-tsc --noEmit -p tsconfig.tests.json`（`tests/**`） | ✅ 独立一条，`check` 不调它，`deploy` 会调 |
| `npm run stats` | 生成规模数字，改写 `进度.md` 与本文的注入块 | ✅ |
| `npm run ledger` | 债务账本与任务索引的格式、依赖自洽（**账本已从 `docs/状态/台账.md` 迁到 `daily/架构日志/`**） | ✅ |
| `npm run registry` | 横切能力清单 `docs/生成/横切能力.md` | ✅ |
| `npm run spec` | 重新生成 `docs/生成/页面规格/0N-*.md`（读 `docs/原版/01-原版源码/`，可加 `-- --page X`） | ✅ |
| `npm run log:index` | `docs/日志/index.md` | ✅ |
| `npm run render:check` | SSR 渲染 2 个页面（`fontManage` / `style`），查白屏 | ⚠️ 需要输出目录：设 `PSZ_EXT_DIR=/tmp/x`（没有 `%APPDATA%` 的环境）；**只覆盖 2 页，未接进任何门禁** |
| `npm run list` | 按页面聚合 spec | ✅ 读 `docs/原版/02-组件文档`（已在库） |
| `npm run interactions` | 从原版 render 提取交互点 | ⚠️ 数据源（webcrack 解包输出）不在仓库；缺时退出码 2 说明缺哪条路径 |
| `npm run audit:page -- Action --cross` | 从原版 AST 提组件树（`--cross` 再与 `08-模板` 交叉核对） | ✅ 读 `docs/原版/01-原版源码/panel/js/app.v4.js` 与 `docs/原版/02-组件文档/08-模板`（均已在库） |
| `node scripts/probe.mjs` | 「先红后绿」探针：临时注入一处违规 → 跑命令 → 精确断言 → **自动还原**（journal 兜底 + 还原 sha 自校验 + 并发编辑守卫） | ✅ 2026-10-24 自 maomao 仓搬入；**会临时改文件**（用完即还原，不许 `--keep`）；journal 在 `scripts/.probe/`（已 gitignore，存源码全文） |
| `node scripts/mv-sync-refs.mjs` | 引用图与搬移：`refs`（谁 import 它 + 字符串残留引用）· `find-dead`（孤儿）· `rename` / `move` / `move-dir`（**自动全库改写 import**，含 `.vue` 的 `<script>` 块；`move-dir` 支持 `--undo`） | ✅ 2026-10-24 自 maomao 仓搬入并按本仓改造（别名 `@/→src/`、扫描根 `src/`+`tests/`、**补 `.vue` 支持**、解析器换成本仓已有的 `typescript`）；**它改 import 不改字符串** ⇒ 字符串引用仍要人工同步 |

**这门禁缺什么，写清楚**（不要以为绿的就没问题）：

- **门禁分两层（2026-10-24 裁定：作者即上游）**：**产品层** = `npm run check`（12 步，只管 `src/**` + `tests/**` + 根配置）；**工具层** = `npm run check:tools`（`lint:tools` + `format:check:tools`，只管 `scripts/**`）。
  - **工具层不许卡产品层**：`deploy` 链里**没有** `check:tools` ⇒ 往 `scripts/` 搬一个脚本、或脚本有风格问题，**不会让面板构建变红**。
  - 判据落点：**功能坏 = 产品闸红**（node 非零退出即中断，工具坏了当场被发现）；**风格脏 = 工具闸红**（自己跑 `npm run check:tools`，不阻塞交付）。
  - 依据：`daily/架构日志/17-文档与门禁治理-2026-10-24.md` §九。
- **没有一条命令会自动跑测试**（`check` / `build` / `deploy` 都不跑）。**测试是纪律，不是门禁**：交付前必须先 `npm test` 再 build，这一条靠人（和 AI）执行，脚本不管。
- **`tests/` 现在也做类型检查**（2026-10-23 起；原来那条「把 `tests/**` 加进去会冒出 83 条错误、没修」已清零）。`npm run typecheck` 依次跑两个 tsconfig：`tsconfig.json`（`src/**`，`lib: ES2019`，`types` 只有 `vite/client`）与 `tsconfig.tests.json`（`tests/**`，`lib: ES2022` + `@types/node`，并带上 `src/**/*.d.ts` 拿全局声明）。**分成两个文件不是绕路**：TS 的 `types` 是**整个 program** 的，没法按文件收窄；合成一个 program 就等于让 `Buffer` / `process` / `node:fs` 在 `src/` 里也能编译通过，而 `src/` 跑在 CEP 里没有 Node（`window.require` 要 `--enable-nodejs`），这类误用没有任何门禁能拦。`typecheck` 是独立一条；`check` 不跑它，`deploy` 会调它。`build` 里没有 `vue-tsc`——构建不负责检查。
- **没有 CI**。没有 `.github/`，所有门禁都靠人工手动跑。

## 需要事实时再查（不是开工前通读）

> 原版一手证据在 `docs/原版/`，**直接用，不用再确认在不在**（完整清单见上一节 §3）。
> 想看汇总而不是源码时：**`docs/生成/页面规格/0N-*.md`**（9 份，带 `app.v4.js` 行号）或 `docs/页面/0N-*.md` 的组件表。

> 上面三条是唯一需要每次做的。这一节是**查证路径**，想知道什么翻哪一行。
>
> **新页面开工 / 返工前先读** `docs/日志/2026-10-21-字体面板返工复盘.md` 的**第 0 节「可迁移的排查思路」**。
> 第 2 节的具体值（#222/#535353/26px/30px 等）**只属于 `/fontSet`**，其他页面必须重新查
> 自己的 render + scoped CSS，禁止照抄。

1. `docs/状态/进度.md` —— 每页做到哪、下一步怎么定
2. `daily/架构日志/债务.md`（债）+ `daily/架构日志/00-任务-总索引.md`（任务）—— **唯一待办源**，带 id 和依赖，从这里挑活干；旧路径 `docs/状态/台账.md` 已于 2026-10-24 删除
3. `docs/生成/横切能力.md` —— 已有哪些公共能力，别重复造
4. `docs/规范/视觉规范.md` —— 字号、图标、图标+文字怎么配，**写页面前必查**
5. `docs/规范/原版缺陷.md` —— **原版不是标准答案**，视觉照搬、工程别照抄（`!important`、`console.log`、字体图标、测试资源…）
6. `docs/生成/交互清单.md` —— 自动生成的 class 串索引，**只能用来查"某个元素有没有事件"，不能当页面清单**
   （没有页面归属、没有状态）。页面级交互以组件表 + render 源码里的 `on:` 为准
7. `docs/架构/jsx契约.md` —— jsx 函数真实返回结构，**别猜**
8. `docs/adr/README.md` + `docs/adr/ADR-NNNN-*.md` —— 为什么这么设计，别轻易推翻。**先跑 `node scripts/adr.mjs list`**（默认只列现行；已退出的标「已取代 / 已弃用 / 已否决 / 已毕业」，不承载现行判据）
9. `docs/架构/目标架构.md` —— **只放结论**（四层 / 命令 / 契约 / 护栏），改结构前必读；
   为什么这么设计看 `docs/adr/`（一条一文件），重构前的诊断看 `docs/架构/重构复盘.md`（一次性）
10. `docs/日志/index.md` —— 最近踩过什么坑、做过什么决策
11. `README.md` —— 命令、目录
12. `docs/原版/02-组件文档/12-组件复用度.md` —— 复用度直接查它；我方缺口另看 `docs/组件库/映射与缺口.md`
13. `docs/原版/02-组件文档/` —— props / methods / 文案 / 子组件都在这里（`02-组件/`、`08-模板/`）；
    验收用该页的清单（`docs/页面/0N-<页面>.md`，01–08 已建；标「未提取」的模板/CSS 开工前先查 `docs/生成/页面规格/0N-*.md`）
14. `docs/日志/2026-10-21-字体面板返工复盘.md` —— **只针对 `/fontSet`** 的返工复盘：
    第 0 节是可迁移的排查顺序；第 2 节是仅本页的值，**其他页面不要外推**

## 文档分工（谁写什么，别写重）

| 文件                     | 只放什么                                   | 不放什么                |
| ------------------------ | ------------------------------------------ | ----------------------- |
| `AGENTS.md`              | 规范、约束、查证路径                       | 进度、待办              |
| `docs/状态/进度.md`      | 每页状态快照（占位 / 部分实现 / 静态通过） | 待办、债务              |
| `daily/架构日志/债务.md` | **所有**技术债的一行摘要 + 状态         | 叙述（明细在区域日志）   |
| `docs/页面/0N-<页面>.md` | 单页验收记录（逐项 原版 vs 当前）          | 待办（只能指向债 / 任务 id） |
| `docs/规范/测试规范.md`  | 测什么 / 不测什么 / 优先级 / 流程          | 具体用例（在 `tests/`） |
| `docs/生成/横切能力.md`  | 已有能力清单（`npm run registry` 生成）    | 计划中的能力            |
| `docs/日志/`             | 决策、踩坑、机制变更                       | 日常改动流水账          |

**状态只写一处。** 同一个事实出现两遍，早晚会不一致——上一轮就是这么乱起来的。

## 一次改对（防返工）

返工的根因不是改得多，是**每次改都没有停止条件**。四条，按顺序：

### 1. 先取事实，再写代码（清单先行）

**页面开工前的第一件事是建清单，不是写代码。** 分两层：

**a. 组件穷举**——把该页子树的组件**抄全**，包括被引用但没单独目录的
（`License`、`Empty`、`overlay` 这种最容易漏）。每个组件都要有：
职责 / 我方对应文件 / 状态（✅⚠️☐➖）。这张表没有的组件等于不存在，页面也不许标验收完成。
模板见 `docs/页面/01-字体管理.md` 的「组件展开」。

> **数据源顺序（D-19）**：以 `02-组件/<组件>.md` 的「子组件」小节为准，
> **不要只信 `11-组件树.md`**——实测它 31% 的边是 `⚠`，且 `Action` 的子组件名与文档对不上。
> 因此**不提供自动生成骨架**：曾经的 `npm run checklist` 产出的名字是错的，已移除。
> **清单可以预建，但只写到"查到的"为止**，三档如实标：已核实（带行号）/ 未提取 / 文档缺失。
> 2026-10-21 已建 01–08 八份；02、04–08 的模板与 CSS 标为「未提取」——
> 开工前先补那几行，补不出就不写样式。预建清单的作用是暴露缺口，不是宣布进度。

**b. 值定案**——要动的值（颜色 / 尺寸 / 文案 / jsx 返回结构）进「已定案值」表：
**值 + 出处（选择器或 `文件:行号`）+ 落地变量**。三者缺一，不许开工。

"我觉得原版大概是…"不算事实。查不到就先写 `T-xx`；没有清单就开工，后面一定是几百次微调。

> 素材有坑：`08-模板/tpl_*.md` 的**文件名和标题会错位**（`tpl_font-manage-search_*.md` 里
> 装的是 `__tag`）。只认文件里的第一个 `staticClass` 或 render 源码，别信文件名。见 D-10。

### 2. 一轮只改一个能核对的东西

改之前先写出**预期结果**，而且必须是能核对的：哪个选择器、哪个 token、哪一行 render 的哪个属性。

- 能核对的：改完用 `grep` / `npm run check` / 对照源码确认，再走下一步
- 核对不了的（运行时行为、视觉）：**只改一处**，并在清单里标 `UNVERIFIED`，不要连锁改五处

一次改 5 处再一起看，等于没验证——分不清是哪处生效。没有反馈渠道时，改得越多，错得越远。

### 3. 同一个值不许改第二次

第二次动同一个值，说明第一次没找到依据，**不是手抖，是方法错了**。停下，回第 1 步。

连续两次凭感觉调同一个属性，就把这件事登记成台账条目（`blocked`，写明缺什么依据），
不要继续微调。微调十次不如查一次源码。

### 4. 结束有判据

四条全满足才算完，缺一条就别说"差不多了"：

```
□ 该页组件表逐行有状态，☐ 的每一行都对应一个 T-xx
□ 已定案值里的值，代码里实际用的和表里一致（能 grep 出来）
□ npm run check 通过（该页没有新增硬编码）
□ 每处偏离原版都写了「有意偏离 + 原因」或指到 T-xx
```

**判据只覆盖静态事实。** 运行时黑盒禁止测，所以任何"点了能跑""显示正常"都不算判据，
也不许写进完成说明——写了就是猜。

**提交粒度**：一个 commit 只对应一个 `T-xx`，标题带上 id（`fix(fontManage): … (T-23)`）。
一条 commit 里塞三件事，出问题就分不清是哪件——这也是之前一页改几百次还没对的原因之一。

**新增入口的 commit，标题里必须有"删"**：`feat(font): 列表读取移进 store，删页面直连 ps (T-xx)`。
`git log --oneline` 因此能直接看出每个入口是"替换"还是"追加"——只有"加"没有"删"的，就是未来重复实现的种子。

## 硬规则

### 1. 新增横切能力后跑一次 `npm run registry`

它会扫描 `src/{cep,composables,stores,utils,styles}`，给未登记的文件**自动补骨架**，然后重写
`docs/生成/横切能力.md` 的表格。你只需要把骨架里的 `（待补：…）` 填成真实内容。

**它不阻塞构建**（见 `docs/adr/` 的 ADR-0010）。但漏了文档就会过期，后面的人找不到这个能力，
然后重复造一遍——这是它唯一要防的事。

判断该不该抽成横切，见 `docs/生成/横切能力.md` 第一节。

### 2. 页面禁止裸调 CEP

不允许出现 `window.__adobe_cep__`、`evalScript`、`$.evalFile`（`src/cep/` 内部除外）。

PS 能力走 `src/cep/jsx/<域>.ts`（transport → jsx → 命令），**不是**全塞进 `ps.ts`：
`ps.ts` 只保留读与初始化；写文档/写应用状态的操作在 `commands/<域>.ts`。

新增一个 jsx 函数要同时改三处，漏了编译不过（`JsxPort` 强制）：
`jsx/<域>.ts` 实现 + `jsx/types.ts` 签名 + `jsx/mock.ts` 假实现。

页面**只经 `useCommand` 调用命令**，不直接 import `cep/jsx`、`cep/data`、`cep/events`
（eslint `no-restricted-imports` 会拦，见 `docs/架构/目标架构.md` 4.7）。

### 3. 动效只用 token

`var(--dur-fast|--dur-base|--dur-slow)` + `var(--ease)`，过渡类用 `fade/slide-up/slide-down/scale/page/list`。
不要在组件里写 `transition: 0.15s`。

### 4. 反馈分两层

- 操作结果（成功/失败/警告）→ `feedback.ok/error/warn/info`
- **命令结果**（成功/失败/取消）→ 由 `useCommand.run` 统一提示，页面不再手写 try/catch + toast；
  只有"前置校验"（空标签名、重名）才直接 `feedback.error`
- 需要看清详情、危险操作确认 → `CepModal`
- 页面级加载失败 → 页面内联 + 重试按钮

错误文案统一用 `describeCepError(e)`，不要各写各的。

### 5. 列表页用骨架

`PageShell` + `usePagedList`。不要自己拼 header + 滚动区，也不要自己接 IntersectionObserver。

```ts
const listRef = ref<HTMLElement>()
const sentinelRef = ref<HTMLElement>()
const { items, visible, loading, error, load, bind } = usePagedList(fetcher, {
  listRef,
  sentinelRef,
})
bind(computed(() => items.value.filter(/* ... */))) // 有筛选才需要
```

### 6. 样式只用 token，不许硬编码

组件样式里禁止出现 `#hex`、`rgb()/rgba()`、`hsl()/hsla()`、`font-size: 12px`、`border-radius: 4px`。
一律用 `src/styles/tokens.css` 里的变量（`--c-*` `--sp-*` `--fs-*` `--r-*` `--h-*` `--z-*` `--shadow-*`）。

**`npm run check` 会拦**：`docs/生成/样式基线.json` 记录各文件当前允许的违规数，只许减少不许增加。
清理完一个文件后跑 `npm run style:baseline` 收紧。

需要新色值/新尺寸时：先加到 `tokens.css`，再在组件里引用。
色值来源必须是**原版 CSS 的真实值**——原版 CSS 在 `docs/原版/01-原版源码/panel/css/app.bf68b505.css`，直接查它；
改查 `docs/生成/页面规格/0N-*.md` 的「实测样式」列（已带选择器与实测值）。
不要凭截图目测（这一条踩过坑）。

**字号和图标**：一律查 `docs/规范/视觉规范.md`。图标用预设名（`size="xs"`），
禁止 `:size="12"` 这种裸数字（`npm run check` 会拦，`npm run style:fix` 能自动改）。
图标和文字必须在 flex 容器里，间距用 `gap`，不要 `vertical-align`、不要 `margin-right`。

**命名规则**（三种前缀，别混）：

| 前缀             | 用途         | 例                            |
| ---------------- | ------------ | ----------------------------- |
| `g-`             | 通用组件     | `.g-btn` `.g-btn__spin`       |
| `page-` / 页面名 | 页面私有     | `.font-item` `.shell__header` |
| `u-`             | 布局 utility | `.u-stack` `.u-fill`          |

- 元素用 `__`（`.modal__body`），状态用 `.is-*`（`.is-active` `.is-disabled`）
- **禁止无前缀通用名**：`.content` `.info` `.glyph` 这种最容易撞，已经有过

**可定制点必须是变量**（否则外部改不动）：

```css
/* 组件内部：留出口 */
.modal__body {
  padding: var(--modal-body-padding, var(--sp-5));
}

/* 外部：只改变量，不碰选择器 */
:root {
  --modal-body-padding: var(--sp-4);
}
```

因为 scoped 样式特异性是 `0,2,0`，全局 `0,1,0` 覆盖不了——这是**唯一**的覆盖方式。
只给"以后可能会调"的属性留出口，不要每个属性都包一层。

### 7. jsx 返回结构：有 fixture 才写类型，没有就按两种都兜

原版 jsx 契约（`docs/原版/02-组件文档/06-jsx契约.md`）只有**调用侧参数**，没有返回结构；返回结构查 `docs/架构/jsx契约.md` 与 `docs/生成/jsx返回结构复原.md`。
字体页就因为猜返回结构返工三次：`"ok"` vs 数组、`name/zz/mz/hjm` vs `family/weights/names/postScriptNames`。

**现在不能靠"在 PS 里跑一次"**（见环境与约束）。所以：

1. 先看 `docs/架构/jsx契约.md` 有没有已记录的返回结构；`src/mocks/` 有没有 fixture
2. 有 → 照它写类型；没有 → 类型按**最宽松的联合**写，解析时两个分支都兜住
3. 兜不住的，函数入口标 `UNVERIFIED`，并在台账登记一条（写明缺哪个函数的实测）

宁可多写一个 `Array.isArray()` 分支，也不要假定一种形状——猜错一次的返工成本，比防御性代码高一个数量级。

### 8. 不要动这些

- `public/lib/all.decrypted.js` —— 原厂 jsxbin，改了就跑不起来
- `%APPDATA%\SheJiZhuLi\` 下原面板的数据文件 —— 只读不写（我们自己的偏好写 `sj_v5_ui.json`）
- `com.local.psz.panel.v4` / `com.sf.设计助理2.7` —— 留作对照

### 9. 组件放在哪

| 目录                          | 放什么                                   | 判断                                               |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `src/components/`             | **跨页复用**的组件                       | 被 2 个以上页面用                                  |
| `src/pages/<页>/components/`  | 该页私有                                 | 只在这一页出现                                     |
| `src/components/` 且 `G` 前缀 | UI 基础件（GButton/GMenu…）              | 对应原版 G-UI 库                                   |
| `src/components/command/`     | 命令消费（`useCommand` / `CommandGrid`） | 横切，所有页面共用；**不要按"2 页才提"的规则挪走** |

拿不准就先放页面私有目录，等第二个页面要用时再往上提。**不要因为"以后可能复用"就提前放公共目录。**

### 10. 决策优先级

冲突时按这个顺序，上面的赢：

1. **不白屏、不崩溃** —— 宁可功能缺失也不能整个面板挂
2. **功能正确** —— 数据对、操作有结果
3. **可维护** —— 符合横切规范、不硬编码
4. **视觉还原** —— 像素级对齐原版
5. **动效细节** —— 缓动曲线、微交互

不要为了 1px 对齐花两小时，也不要为了"看起来专业"加没必要的动效。

### 11. 一个页面算「静态通过」的标准

因为**不测运行时**（见「环境与约束」），这里没有"做完"，只有「静态通过 / 部分实现」。
全部满足才算静态通过：

```
□ vue-tsc 通过；npm run check 通过；npm test 通过
□ 组件表逐行有状态；每个 ☐ 都指向一个 T-xx
□ 已定案值里的值 = 代码里实际用的值（能 grep 对上）
□ loading / 空态 / 错误态三个分支都有测试覆盖（不是"我点过"）
□ 每处偏离原版都有「有意偏离 + 原因」或 T-xx
□ 新增的 jsx 调用已记入 docs/架构/jsx契约.md，fixture 已存；没有 fixture 的标 UNVERIFIED
```

**最容易漏的是第二条**：字体页漏了右键打标签、hover 操作区、字重小预览、授权标识——
全都因为组件表里没有这几行，不是"做漏了"，是"根本不在视野里"。

**运行时**（真实加载、点击反应、视觉观感）一律未验。可以写"代码路径存在"，不能写"功能正常"。

### 12. 干活前先看债务账本与任务索引

`daily/架构日志/债务.md`（技术债）与 `daily/架构日志/00-任务-总索引.md`（任务）里每条都有 id、状态、依赖。**只挑依赖已完成的条目做**。

- **债**：走 `node scripts/debt.mjs`（`add` / `resolve` / `edit`），**禁手写表格行**；明细与证据写进 `daily/架构日志/<NN>-<区域>-<日期>.md`，账本只留一行摘要
- **任务**：手改 `00-任务-总索引.md`；做完了把状态改成 `done` 并移到「已完成」表（依赖它的条目会自动解锁）
- 做不完就写 `blocked` 并在说明里写清卡在哪
- 代码里留标记用 `TODO(T-23)` 这种格式，id 必须真实存在（`npm run ledger` 会校验）

标 `done` 之前，依赖必须全部 `done`——校验会拦住"假装完成"。

**每次收工只做三件事**，做完就停，别顺手开新页：

1. 账本：债走 `debt.mjs resolve`，任务状态改对、完成项移到归档表
2. 进度：**只有页面状态档位变了才改**（占位→可用→验收完成），细节不写
3. 跑 `npm run check`；有决策/踩坑才写日志

### 13. 先查代码，再问人

**能自己查到的，不要问用户。** 用户不是你的调试工具。

| 想知道                                           | 去哪查（不要问人）                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 颜色 / 尺寸 / 圆角                               | 原版 CSS 在 `docs/原版/01-原版源码/panel/css/app.bf68b505.css`，**直接查**；汇总看 `docs/生成/页面规格/0N-*.md` 的「实测样式」列 + `src/styles/tokens.css` |
| **原版源码（未压缩、可读）**                     | `docs/原版/01-原版源码/panel/js/app.v4.js`（73,703 行美化版），**直接查**；行号速查看 `docs/生成/页面规格/0N-*.md` 与台账里的行号记录 |
| 原版组件有哪些 props / computed / methods / 文案 | `docs/原版/02-组件文档/02-组件/<组件>.md`、`08-模板/tpl_*.md`，**直接查**；页面级汇总看 `docs/页面/0N-*.md` 组件表 |
| 原版的 DOM 结构和嵌套                            | 源码在 `docs/原版/01-原版源码/panel/js/app.v4.js` 的 render；汇总看 `docs/生成/页面规格/0N-*.md` 的「结构树」段 |
| 原版样式                                         | 原版 CSS 在 `docs/原版/01-原版源码/panel/css/app.bf68b505.css`；汇总看 `docs/生成/页面规格/0N-*.md` 的「实测样式」列（已带选择器与实测值） |

> ⚠️ **不要直接拿压缩 CSS 里的选择器当结论。** 那份 CSS 里新旧两套组件混在一起
> （`.nav-item` 40×40 是左侧导航，`.sub-nav-item` 26×26 是另一个组件；
> `.nav-item-act` 是旧版、`.nav-item-active` 是新版）。只看 CSS 会选错。
> 正确顺序：**app.v4.js 找 render → 拿到真实类名 → 再去 CSS 查那条类名**。
> | 组件有哪些 props / 方法 | `docs/原版/02-组件文档/02-组件/<组件>.md`（直接查）；页面级汇总看 `docs/页面/0N-*.md` 组件表、`docs/组件库/现有控件.md` |
> | jsx 返回结构 | 先查 `docs/架构/jsx契约.md`；没有再实测（`#/__probe`） |
> | CEP 版本 / 环境能力 | 原版 `CSXS/manifest.xml` 的 `RequiredRuntime` + 系统注册表 |
> | 数据文件长什么样 | 直接读 `%APPDATA%\SheJiZhuLi\*.json` |
> | **页面 DOM 结构 / 每个 class 的实测样式** | **`docs/生成/页面规格/0N-*.md`**（9 份，带 `app.v4.js` 行号）。**这是随仓库分发的原版结构与样式汇总**；产物由 `npm run spec` 重新生成（`scripts/page-spec.mjs`），别手改 |
> | 界面渲染结果 | 无头 Chrome `--dump-dom` 统计 DOM |

这一轮有 3 个"待用户确认"的问题（CEP 版本、内容区底色、图标实现），全部在代码里查到了，
其中一个还发现**原版自己就是坏的**（gdaicon 字体从未加载）。问人只会浪费对方时间。

### 14. 猜的东西必须标 `UNVERIFIED`

凡是**没实测过**的结论——jsx 返回结构、颜色值、尺寸、CSS 特性可用性——在代码里写：

```ts
// UNVERIFIED: ztgl_xxx 的返回结构按文档推断，未实测
```

```css
/* UNVERIFIED: 这个底色是从截图目测的，未在 CSS 里找到对应规则 */
```

```ts
// UNVERIFIED: 假设 CEP 12 是 Chromium 99，未在真机确认
```

理由：这一轮返工了 9 次，全部源于"看起来合理"被当成了"事实"。标记的作用不是防止犯错，
而是让错误**可被发现**——`grep UNVERIFIED` 就能列出所有待验证项。

查到证据后，把标记换成依据：

```ts
// 依据：56d7.js:2190 jsx("ztgl_setFont", [hjm, mz, ez])
```

### 15. 日志只在三种情况下写

```powershell
npm run log:new "主题"    # 建一篇，带固定区块
npm run log:index         # 重建索引
```

三种情况：**做了架构决策 / 踩了坑 / 改了横切机制**。日常功能改动不写，否则变成流水账。

一篇一文件（`docs/日志/日期-主题.md`），固定区块：背景 / 做了什么 / 为什么 / 影响。不要往单一 changelog 里无限追加。

### 16. 注释写结论，不写编辑史

注释回答两个问题：**这段代码对应原版哪里**、**为什么不是最直接的写法**。除此之外不写。

| 该写                                               | 不该写                   |
| -------------------------------------------------- | ------------------------ |
| `原版 __preview{padding:6px 8px}，左右已由项给`    | `原来是 8px，后来改成 0` |
| `这里用文本 ★：sprite 没有星形`                    | `之前试过图标，不行`     |
| `--input-height: var(--h-field)` 的依据            | `调了很多次终于对了`     |
| `TODO(T-18): 现在有标签就显示，应超过 94px 才显示` | `暂时这样，以后再改`     |

- **引原版必须能被检索到**：带选择器或文件名，值要和代码里实际用的变量对得上。
  注释写"原版 #ccc"、代码用 `#f5f5f5`，比没有注释更坏——下一个人会照着错的改。
- 原版里**查不到**的规则就写"推断，见 T-xx"，不要写成"原版是…"。
- 不写"注意/必须/千万"这类提醒超过一句；真正的规则写到本文件，不散落在组件里。
- 不堆空行：注释和它的选择器/函数之间不留空行。

### 17. 唯一入口必须自证 + 登记

一个事实只有一个读写入口时，**入口文件前 8 行必须写清四段**，少一段等于没声明：

```ts
// 是什么：
// 唯一入口：<哪类事只能经过这里>
// 替代了什么：
// 谁在用：
// 禁止：<页面 / 组件 / 其他层不许做什么>
```

新增入口当次在下面的表里加一行。**这张表是唯一清单**，不要在别处再列一份。
绕过判据：`grep -rn "cep/jsx\|cep/data\|cep/events" src/pages` 必须为 0；
`grep -rn "readTextFile\|writeTextFile" src/pages src/commands` 必须为 0。

| 事实             | 唯一入口                    | 谁能用                | 判据                              |
| ---------------- | --------------------------- | --------------------- | --------------------------------- |
| PS 文档写        | `commands/<域>.ts`          | 页面经 `useCommand`   | 页面不 import `cep/jsx`           |
| 命令执行         | `commands/registry.ts`      | 页面经 `useCommand`   | 页面不裸调 `execute`              |
| 数据文件读写     | `cep/data/<域>.ts`          | 命令 / store 只读投影 | 页面不 import `cep/data`          |
| 宿主事件         | `cep/events.ts`             | `selection/` 等适配层 | 页面不 import `cep/events`        |
| 当前文字属性     | `selection/current-text.ts` | 页面只读投影          | 只有这里调 `zt_getFontSimpleInfo` |
| jsx 返回结构     | `utils/jsx-result.ts`       | 只在 `commands/**`    | 别处不写 `res.err === 1`          |
| 外部网络         | `cep/http.ts`               | 只在 `commands/**`    | 页面不插 `<script>`、不 `fetch`   |
| 翻译签名与编解码 | `domain/translate.ts`       | `commands/fontSet.ts` | 纯函数，可单测                    |

### 18. 跨页机制先落 ADR，再写代码

引入或替换**跨页机制**（拖拽、浮层、滚动、快捷键、数据同步等会被多个页面复用的交互或基础设施）之前，必须先落一条 ADR（`node scripts/adr.mjs add`，落 `docs/adr/`），写清候选方案与取舍；**没有 ADR 的机制类改动不予合入**。"原版这么做"只能作为候选方案之一的论据，不能单独构成决定。

反面案例：动作页最初用 HTML5 DnD 是未经权衡直接实现的，重命名页按「复用第一页已有实现」照抄，错误被复制成两份；最终由样式页按原版 `am()` 复刻、统一到 `useLongPressDrag` + `domain/reorder`（见 ADR-19 / 台账 T-67）。**"复用已有实现"之前，先确认那份实现本身是否经过选型。**

### 19. 证据分两级：一手缺席时，二手证据就是证据

- **一手证据**：原版源码（美化版行号 / 压缩版字符串）、真机样本、已通过的测试。
- **二手证据**：`docs/` 里已完成的调查结论——`docs/生成/*`、`docs/架构/*`、`docs/页面/0N-*.md`、`daily/架构日志/` 各区域日志的结论段。

原版面板源码已入库（`docs/原版/01-原版源码/`），行号直接用；只有 jsxbin 里的 jsx 实现（`public/lib/all.decrypted.js`）仍不可读。别的插件安装副本（`~/Library/Application Support/fz.FengZi1Hao/js/`）即使存在也要**先确认版本**——曾有一份与文档调查所用版本不一致（文档引用的 `56d7.js` / `0425.js` 不在其中），那种情况**不得据它核对任何结论**。`app.v4.js:行号` 是**美化版坐标**；源码已入库（`docs/原版/`，ADR-25），**行号就是可当场复核的锚点**——直接按行号读（`Get-Content <文件> | Select-Object -Skip <N-1> -First <M>`），不再要求"字符串定位、不写行号"；核实后标注 `已核（docs/原版/01-原版源码/panel/js/app.v4.js:NNNN）`。**一手证据缺席时（真机行为、webcrack 解包输出这类仓里没有的），二手证据就是唯一证据，可以直接据此实现**，不许停摆或要求重新调查。

二手证据的有效性由**锚点**保证，不由当场复核保证：每条调查结论必须带 `文件:行号`（美化版坐标）、CSS 选择器、契约章节号、测试用例名之一。锚点是给"将来复核"用的，不是"当下必须跑一遍"。

未经一手复核的结论按第 14 条标 `UNVERIFIED`，但**不影响开工**；报告里单列一节，写明依赖的是哪条二手证据。文档与代码冲突时**以代码为准，并立刻改文档**（见 `docs/README.md` 第七节「文档坏了怎么修」；证据规则见 `AGENTS.md` 第 19 条与 `daily/架构日志/00-任务-总索引.md`）。

**不许编造锚点**：写不出 `文件:行号` 的，不许标"已核实"，只能标"未提取"或"待查证"。三档的正面样板见 `docs/页面/09-模板库.md` 的「已核实 / 未提取 / 文档缺失」。机制层面的理由见 ADR-25。

### 20. 禁双转型；消费者不许替生产者捏造

> 来源：T-97-8 真机 bug——`readOptions` 写成 `() => readCommonUseOptions() as unknown as Record<string, unknown>`，
> 数据层其实是 `async` 且返回 `{ value }`，于是读到的是一个 **Promise**，分支恒为 `'none'`：
> **点了没反应、不报错、测试全绿**。用户据此定的规矩。

> **判据面在 `docs/adr/`**：「拆 catch」「默认不兜底」见 **ADR-0014 扩展一 / 扩展二**；「消费者只能转发」见 **ADR-0023**；「缺了先补生产者」见 **ADR-0024**。ADR 写"为什么这么判、什么算违规、拿什么实证"，本条写"怎么查、怎么判基线"。**两处指向同一件事，改一处必须同时改另一处**，不许各自长一份细则。

**规矩一：禁 `as any`、禁 `as unknown as`（双转型）。**
需要跨类型时，**改生产者的类型**（函数签名 / 返回值类型 / 契约），不改消费者的断言。
`as unknown as` 的本质是"先骗编译器说它什么都不是，再骗它说它是我要的东西"——两次撒谎之间，
任何形状错误都能通过编译。

**规矩二（更宽）：消费者不许替生产者捏造信息。**
发现类型 / 字段 / 返回值缺了，**去补生产者**（改契约、改类型、改实现），不许在消费侧用
兜底值、默认值、猜的字段糊过去。消费侧一旦开始"补"，生产者就永远不知道自己缺了东西。

**确需转型的只有一类：第三方边界**（`window.__adobe_cep__`、`process.env`、CE 注入的 `require`
这类**运行时才存在、类型系统管不到**的东西）。

**(a) 第三方优先写 `.d.ts`，补不了才转型。** 顺序不能反：

1. **先让类型存在**——写 `declare global` / 模块声明 / `src/**/*.d.ts`，把 `__adobe_cep__`、`require`、
   `process.env` 这些补进类型系统。这样调用处**一行转型都不用写**，也顺带让全仓受益。
2. 实在补不了（签名依赖运行时才确定、或 `.d.ts` 会污染全局），才允许在**调用处**转型，且必须写注释：

```ts
// 断言理由：__adobe_cep__ 由 CEP 运行时注入，.d.ts 补不了它的动态字段
const bridge = (window as unknown as { __adobe_cep__?: Bridge }).__adobe_cep__
```

**为什么必须写这一条**：只写"禁转型"，下一个人会读成"第三方也不许碰"，然后去 `@ts-ignore`、
`eslint-disable`、或改 `tsconfig` 放宽 `strict`——**那是更坏的后门**：转型至少还写在一处、能被守卫数出来，
放宽配置是全局失效且不会红。**无注释即违规**——守卫 `npm run assert:guard` 会红。

**(b) 兜底：判"静默回退"才算违规，不是"一律不许兜底"。**
错误分两种，待遇不同：

| 类型 | 例子 | 判定 |
| --- | --- | --- |
| **静默回退**（错误被吃掉、用户与日志都不知道） | `catch { return [] }`、`res.data ?? []`、`(x as any).id ?? ''` | **违规** |
| **带可见信号的降级**（有意的、用户能看到） | `commonUse` 读坏文件仍渲染 + `degraded` 提示 + 重试按钮；页面级 `error` 内联 + 重试 | **合规** |

判据一句话：**兜底必须有可见失败信号**（`degraded` / `error` / `feedback.error` / `log.warn` 至少一个，
且用户能在界面上看到或能在「打开日志」里查到）。没有信号的回退 = 把错误变成"看起来能用"，
比直接崩更坏——它会让人以为功能正常，一路错下去。

这条与硬规则 10「不白屏、不崩溃」不冲突：**能降级就降级，但降级必须喊出来**。
`degraded` / `error` 那套是**合规的兜底**，不是违规的捏造——**不许因为这条规矩把它们删掉**。

| 算违规 | 为什么 |
| --- | --- |
| `readCommonUseOptions() as unknown as Record<string, unknown>` | 生产者是 async 的，消费侧用转型把 Promise 当对象——**改生产者签名** |
| `const x = (res as any).data ?? []` | `?? []` 是捏造：`data` 缺失该让生产者保证有 |
| `(payload as { id?: string }).id ?? ''` | 猜字段 + 兜底值，两层捏造 |
| `catch { return [] }` 吞掉解析失败、**且没有任何可见信号** | 静默回退，错误变成"看起来能用" |
| 为了绕开类型去 `@ts-ignore` / `eslint-disable` / 放宽 `tsconfig.strict` | 比转型更坏：全局失效且不会红 |

| 不算违规 | 为什么 |
| --- | --- |
| 写 `.d.ts` / `declare global` 把第三方类型补进去 | 让类型**存在**，比转型更根本 |
| `(window as unknown as { require?: ... })` + `// 断言理由：…` | 第三方边界，`.d.ts` 补不了，且已登记 |
| `import type` / 泛型约束 / 类型守卫（`Array.isArray`、`in`、判别联合） | 这些是**证明**，不是**断言** |
| 读坏文件仍渲染 + `degraded` 提示（`commonUse` 现状） | **带可见信号**的降级，合规 |

**判据（出 bug 时按这个顺序怀疑）**：

1. 真机"**点了没反应，但不报错**" → 第一个怀疑对象**就是转型与兜底**，不是网络、不是权限、不是 PS。
   静默走错分支正是转型的典型症状：类型说没问题，运行时拿到的是另一个东西。
2. 测试**不许用注入的假对象绕过真实接线**——注入进去的 `readOptions` 是同步裸对象，
   正好把"真实接线是 async"这个 bug 挡在视野外。**每个真实接线至少有一条用例走真实路径**
   （mock 更外层：`subscribeHostEvent`、数据层，而不是把被测函数的依赖直接换掉）。

## 提交前自检

```powershell
npm run check      # 12 步守卫：样式 / 模板 / 断言 / 边界 / 账本 / 类型风格（不查 TS 类型，不跑测试）
npm run deploy     # check + 类型检查 + 构建 + 产物校验，唯一强制点
```

构建产物会直接写进 CEP 扩展目录，改完要在 PS 里关掉面板重开才能看到。

| 命令                                   | 什么时候用                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| `npm run lint`                         | 只跑 ESLint（也已含在 `check` 里）                              |
| `npm run format`                       | 格式化（Prettier，只覆盖 `src` / `tests` / `scripts` / 根配置） |
| `npm run format:check`                 | 只检查格式（已含在 `check` 里）                                 |
| `npm run check`                        | 收工前顺手跑，秒级                                              |
| `npm test`                             | 改了组件/逻辑就跑（jsdom，不启浏览器）                          |
| `npm run deploy`                       | 要进 PS 里验收之前，必须通过                                    |
| `npm run ledger`                       | 只改了债 / 任务账本                                             |
| `npm run registry`                     | 新增了 `src/{cep,composables,stores,utils,styles}` 下的文件     |
| `npm run template:guard` | 扫 `.vue`：模板里的非法属性名（反引号等）+ SFC 解析错误。**编译与 jsdom 都抓不到**这类问题，所以单独一道 | ✅ 已接进 `check` |
| `npm run assert:guard` | 扫 `src/`：`as any` / `as unknown as`（双转型）。第三方边界须写 `// 断言理由：…`；存量走基线只许减少 | ✅ 已接进 `check` |
| `npm run assert:baseline` | 清掉一处双转型后收紧 `docs/生成/断言基线.json` | — |
| `npm run style:fix` / `style:baseline` | 修样式违规 / 清理完一个文件后收紧基线                           |
| `npm run log:new` / `log:index`        | 写日志（只在三种情况下写，见第 15 条）                          |
