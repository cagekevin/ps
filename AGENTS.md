# 给后续 AI / 开发者的规则

这个文件是**硬约束**，不是建议。改代码前先读完。

## 项目是什么

PS 面板（CEP 12）重写。Vue 3 + TS + Vite + Pinia。
UI 和数据流全部重写；PS 能力层继续调原厂 jsxbin（`public/lib/all.decrypted.js`），不逆向、不重写。

## 开工前必读（按顺序）

1. `docs/进度.md` —— 现在做到哪、下一步是什么
2. `docs/台账.md` —— 待办和债务，**带 id 和依赖**，从这里挑活干
3. `docs/横切能力.md` —— 已有哪些公共能力，别重复造
4. `docs/jsx-契约.md` —— jsx 函数真实返回结构，**别猜**
5. `docs/架构决策.md` —— 为什么这么设计，别轻易推翻
6. `docs/log/index.md` —— 最近踩过什么坑、做过什么决策
7. `README.md` —— 命令、目录
8. `BUILD-SPEC/12-组件复用度.md` —— 哪些组件该先写
9. 要改的页面对应的 `BUILD-SPEC/02-组件/<组件>.md` 和 `08-模板/tpl_<组件>.md`

## 硬规则

### 1. 新增横切能力后跑一次 `npm run registry`

它会扫描 `src/{cep,composables,stores,utils,styles}`，给未登记的文件**自动补骨架**，然后重写
`docs/横切能力.md` 的表格。你只需要把骨架里的 `（待补：…）` 填成真实内容。

**它不阻塞构建**（见 `docs/架构决策.md` ADR-10）。但漏了文档就会过期，后面的人找不到这个能力，
然后重复造一遍——这是它唯一要防的事。

判断该不该抽成横切，见 `docs/横切能力.md` 第一节。

### 2. 页面禁止裸调 CEP

不允许出现 `window.__adobe_cep__`、`evalScript`、`$.evalFile`。
所有 PS 能力走 `src/cep/ps.ts`；新函数同时补 `src/cep/types.ts` 和 `src/cep/mock.ts`。

### 3. 动效只用 token

`var(--dur-fast|--dur-base|--dur-slow)` + `var(--ease)`，过渡类用 `fade/slide-up/slide-down/scale/page/list`。
不要在组件里写 `transition: 0.15s`。

### 4. 反馈分两层

- 操作结果（成功/失败/警告）→ `feedback.ok/error/warn/info`
- 需要看清详情、危险操作确认 → `CepModal`
- 页面级加载失败 → 页面内联 + 重试按钮

错误文案统一用 `describeCepError(e)`，不要各写各的。

### 5. 列表页用骨架

`PageShell` + `usePagedList`。不要自己拼 header + 滚动区，也不要自己接 IntersectionObserver。

```ts
const listRef = ref<HTMLElement>()
const sentinelRef = ref<HTMLElement>()
const { items, visible, loading, error, load, bind } = usePagedList(fetcher, { listRef, sentinelRef })
bind(computed(() => items.value.filter(/* ... */)))   // 有筛选才需要
```

### 6. 样式只用 token，不许硬编码

组件样式里禁止出现 `#hex`、`rgb()/rgba()`、`hsl()/hsla()`、`font-size: 12px`、`border-radius: 4px`。
一律用 `src/styles/tokens.css` 里的变量（`--c-*` `--sp-*` `--fs-*` `--r-*` `--h-*` `--z-*` `--shadow-*`）。

**`npm run check` 会拦**：`docs/style-baseline.json` 记录各文件当前允许的违规数，只许减少不许增加。
清理完一个文件后跑 `npm run style:baseline` 收紧。

需要新色值/新尺寸时：先加到 `tokens.css`，再在组件里引用。
色值来源必须是 `05-官方资源/04-CEP资源包/CEP001-设计助理/css/app.bf68b505.css` 里的真实值，
不要凭截图目测（这一条踩过坑）。

**命名规则**（三种前缀，别混）：

| 前缀 | 用途 | 例 |
|---|---|---|
| `g-` | 通用组件 | `.g-btn` `.g-btn__spin` |
| `page-` / 页面名 | 页面私有 | `.font-item` `.shell__header` |
| `u-` | 布局 utility | `.u-stack` `.u-fill` |

- 元素用 `__`（`.modal__body`），状态用 `.is-*`（`.is-active` `.is-disabled`）
- **禁止无前缀通用名**：`.content` `.info` `.glyph` 这种最容易撞，已经有过

**可定制点必须是变量**（否则外部改不动）：

```css
/* 组件内部：留出口 */
.modal__body { padding: var(--modal-body-padding, var(--sp-5)); }

/* 外部：只改变量，不碰选择器 */
:root { --modal-body-padding: var(--sp-4); }
```

因为 scoped 样式特异性是 `0,2,0`，全局 `0,1,0` 覆盖不了——这是**唯一**的覆盖方式。
只给"以后可能会调"的属性留出口，不要每个属性都包一层。

### 7. jsx 返回结构必须实测

`BUILD-SPEC/06-jsx契约.md` 只有**调用侧参数**，没有返回结构。
写新页面时先在 PS 里跑一次、把真实返回抓成 fixture 放 `src/mocks/`，再定义类型。
（字体页就因为猜返回结构返工了三次：`"ok"` vs 数组、`name/zz/mz/hjm` vs `family/weights/names/postScriptNames`。）

### 8. 不要动这些

- `public/lib/all.decrypted.js` —— 原厂 jsxbin，改了就跑不起来
- `%APPDATA%\SheJiZhuLi\` 下原面板的数据文件 —— 只读不写（我们自己的偏好写 `sj_v5_ui.json`）
- `com.local.psz.panel.v4` / `com.sf.设计助理2.7` —— 留作对照

### 9. 组件放在哪

| 目录 | 放什么 | 判断 |
|---|---|---|
| `src/components/` | **跨页复用**的组件 | 被 2 个以上页面用 |
| `src/pages/<页>/components/` | 该页私有 | 只在这一页出现 |
| `src/components/` 且 `G` 前缀 | UI 基础件（GButton/GMenu…） | 对应原版 G-UI 库 |

拿不准就先放页面私有目录，等第二个页面要用时再往上提。**不要因为"以后可能复用"就提前放公共目录。**

### 10. 决策优先级

冲突时按这个顺序，上面的赢：

1. **不白屏、不崩溃** —— 宁可功能缺失也不能整个面板挂
2. **功能正确** —— 数据对、操作有结果
3. **可维护** —— 符合横切规范、不硬编码
4. **视觉还原** —— 像素级对齐原版
5. **动效细节** —— 缓动曲线、微交互

不要为了 1px 对齐花两小时，也不要为了"看起来专业"加没必要的动效。

### 11. 一个页面算做完的标准

全部满足才算，缺一条就是没做完：

```
□ 无控制台报错，无白屏
□ 数据能加载（真实 PS，不是只有 mock）
□ 主要交互全部可用（对照原版逐个点一遍，包括右键、hover、空态）
□ loading / 空态 / 错误态三种状态都有
□ 样式只用 token，npm run check 通过
□ 新增的 jsx 调用已记入 docs/jsx-契约.md，fixture 已存
```

**最容易漏的是第三条**：字体页就是只做了主流程，漏了右键打标签、hover 操作区、字重小预览。

### 12. 干活前先看台账

`docs/台账.md` 里每条都有 id、状态、依赖。**只挑依赖已完成的条目做**。

- 新发现的活先登记，再动手
- 做完了把状态改成 `done`（依赖它的条目会自动解锁）
- 做不完就写 `blocked` 并在说明里写清卡在哪
- 代码里留标记用 `TODO(T-03)` 这种格式，id 必须真实存在（`npm run ledger` 会校验）

标 `done` 之前，依赖必须全部 `done`——校验会拦住"假装完成"。

### 13. 日志只在三种情况下写

```powershell
npm run log:new "主题"    # 建一篇，带固定区块
npm run log:index         # 重建索引
```

三种情况：**做了架构决策 / 踩了坑 / 改了横切机制**。日常功能改动不写，否则变成流水账。

一篇一文件（`docs/log/日期-主题.md`），固定区块：背景 / 做了什么 / 为什么 / 影响。不要往单一 changelog 里无限追加。

## 提交前自检

```powershell
npm run check      # 横切注册表
npm run build      # 类型检查 + 构建（会先跑 check）
```

构建产物会直接写进 CEP 扩展目录，改完要在 PS 里关掉面板重开才能看到。
