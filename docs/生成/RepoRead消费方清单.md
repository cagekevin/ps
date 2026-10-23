# RepoRead 消费方清单（T-99-3b）

> **手写文档，不是脚本产物**（与 `库文件格式契约.md` / `jsx返回结构复原.md` 同类，见 AGENTS.md §4 第 2 条）。
> `npm run spec` / `stats` 不会重写它，改动请直接改本文件。

## 这份清单是什么

`RepoRead<T>` 现在的形状是 `{ value: T; degraded?: string }`——**`degraded` 可忽略**，于是
"读到坏文件"在 23 个文件里被 23 种方式处理，其中 8 处压根没处理。

把它改成判别联合 `{ ok: true; value: T } | { ok: false; reason: string }` 会让所有消费方编译不过。
在动消费方之前，先把这 220 处**逐个判成三类**：哪些必须让用户知道坏了、哪些坏了就等于空、
哪些根本不该读。判完再改，改的是"想清楚了的形状"，不是"编译器逼我补的 if"。

**快照来源**：`a661a1f`（那次"故意红"提交，已 `git revert`）跑 `npm run typecheck` 的完整输出。
行号对当前 HEAD 的生产代码仍然成立——回退只动 `types.ts` / `file-repo.ts` 两个文件，消费方一行未改。

## 数量（三类分组）

| 分类 | 生产代码 | tests | 合计 |
| --- | --- | --- | --- |
| **必须处理**（坏了要让人知道） | 70 | 139 | **209** |
| **可空着**（纯展示，坏了就是空） | 9 | 2 | **11** |
| **不该有读操作**（这处根本不该读） | 0 | 0 | **0** |
| 合计 | 79 | 141 | **220** |

判据（三类怎么分，先定死再判，避免逐条随心情）：

| 分类 | 判据 |
| --- | --- |
| 必须处理 | 坏数据会让用户看到**错的结论**（空列表冒充"没有"）、让命令**用默认值照常执行**、或让**写路径覆盖磁盘**。必须给可见信号：UI 提示 / 命令抛错 / `log.error` |
| 可空着 | 坏掉等价于"这份数据不存在"，用户看到空/默认**不算看到错的东西**，且不产生磁盘写入。不需要额外分支，但**不许静默造假数据** |
| 不该有读操作 | 这一处**读本身就是设计错误**（该由上层统一读一次），不是"坏"的处理问题 |

---

## 一、必须处理（209 处）

### 1.1 生产代码（70 处）

#### `src/cep/cloud/entries/action-library.ts` — 4 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 57 ×2 | 云同步「动作库」单元 `read()`：`if (read.degraded) throw` | **有**：抛 Error，整单同步失败（坏数据不上云） | 必须处理 |
| 59 | 把索引序列化进 unit payload | 无（跟在 57 之后，逻辑上已被挡住） | 必须处理 |
| 62 | 遍历 `read.value.list` 逐个读仓库文件 | 无（同上） | 必须处理 |

#### `src/cep/cloud/entries/font-hierarchy.ts` — 3 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 55 ×2 | 云同步「字体层级」：判 `degraded` 后抛 | **有**：抛 | 必须处理 |
| 56 | 序列化 `read.value` 进 payload | 无（被 55 挡住） | 必须处理 |

#### `src/cep/cloud/entries/font-stars.ts` — 3 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 13 ×2 | 云同步「星级」：判 `degraded` 后抛 | **有**：抛 | 必须处理 |
| 14 | 用 `read.value` 组 payload | 无（被 13 挡住） | 必须处理 |

#### `src/cep/cloud/entries/font-tags.ts` — 3 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 13 ×2 | 云同步「标签」：判 `degraded` 后抛 | **有**：抛 | 必须处理 |
| 14 | 用 `read.value` 组 payload | 无（被 13 挡住） | 必须处理 |

#### `src/cep/data/action-archive.ts` — 8 处（数据丢失风险，见 §四）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 77 ×3 | `archiveDefaultName`：取 `read.value.list[read.value.index]` 拼默认文件名 | **已修（T-99-4）**：原来坏索引 → `value` 是 fallback `DEFAULT_INDEX`（1 条「默认仓库」→ `sj_dz_default.json`），于是按"默认仓库.dzx"命名或抛「没有可导出的仓库」（把"文件坏了"说成"没有仓库"）；现在 `requireIndex()` 先抛「索引文件损坏…导出已中止」 | 必须处理 |
| 85 | `exportActionArchive`：`const index = read.value` | **已修（T-99-4）**：原来坏索引 → 拿 fallback 导出「默认仓库」或抛「读取仓库失败：sj_dz_default.json」；现在读索引即抛，且不生成 `.dzx` | 必须处理 |
| 89 | 遍历 `list` 逐个读 `.dzx` 拼 `arrFileData` | 无（被 85 挡住；原来 fallback 只有 1 条时循环只跑一次） | 必须处理 |
| 118 | `importActionArchive`：`const current = read.value` | **已修（T-99-4）**：原来坏索引 → `current` 是 fallback `DEFAULT_INDEX`（**不是空索引**），`next.list` 基于它算，`write(next)` 直接覆盖真索引（绕过 D-42）；现在在任何写之前 `requireIndex()` 抛错 | 必须处理 |
| 144 ×2 | 导入收尾：`current.list.map(...)` 删掉不在新列表里的旧文件 | **已修（T-99-4）**（不再可达）：原来 `current` 只有 fallback 那一条 → 替换模式下会 `removeAll` 删掉 `sj_dz_default.json`；用户的其它 `sj_dz*.json` 不在 `current.list` 里，不删、变孤儿 | 必须处理 |

#### `src/cep/data/actions.ts` — 2 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 105 | `deleteWarehouse`：`read.value.list.length <= 1` 前置校验 | **没有**：坏索引 → 空 list → 抛「至少保留一个仓库」（文案误导） | 必须处理 |
| 106 | 取 `read.value.list[index]` 作为待删仓库 | **没有**（同上，`target` 为 undefined 时抛「仓库不存在」） | 必须处理 |

#### `src/cep/data/classification-repo.ts` — 5 处（**生产者**，不是消费方）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 86 | dev 分支：`return { value: MOCK }` | N/A（浏览器没有真实文件） | 必须处理 |
| 94 | 读失败 → `{ value: emptyClassification(), degraded: '分类数据读取失败' }` | **有**：带原因 + 空分类 | 必须处理 |
| 97 | 文件不存在 → `degraded: '分类数据文件不存在'` | **有**（与"坏"分开） | 必须处理 |
| 119 | `degraded: categories.length ? undefined : '分类数据里没有可用分组'` | **有**（有意：没有分组也算坏） | 必须处理 |
| 123 | JSON 非法 → `degraded: '分类数据格式不正确'` | **有** | 必须处理 |

#### `src/cep/data/free-panel.ts` — 1 处（**生产者包装**）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 117 | `read()` 里 `result.value.obj.list` 跑会话态 showText 的 seed/strip/apply | **没有**：坏文件时拿到 fallback 空面板，仍照常跑会话态 | 必须处理 |

#### `src/cep/data/legacy-settings.ts` — 5 处（**生产者包装**）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 100 ×2 | `readFontSetSettings`：解构 `{ value, degraded }` | **有**：原样透传 | 必须处理 |
| 101 | 返回 `{ value: mergeFontSetSettings(value), degraded }` | **有**：透传 | 必须处理 |
| 191 ×2 | `readCommonUseOptions`：解构 `{ value, degraded }` | **有**：透传（但见 `stores/common-use.ts:16` 的第三份形状） | 必须处理 |

#### `src/cep/data/memory-repo.ts` — 1 处（**生产者**）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 26 | `read: () => Promise.resolve({ value })` | N/A：内存态没有失败路径 | 必须处理（必须与 `file-repo` 同时改，否则消费方的 `if (!r.ok)` 恒判坏） |

#### `src/cep/data/style-library-io.ts` — 2 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 173 | `indexState`：读索引后交 `readStyleWarehouseIndex` 归一 | **有**：不抛，交给调用方 | 必须处理 |
| 176 | 把 `stored.degraded` 与归一结果拼成一个 `degraded` 字符串 | **有**：`currentIndex():186` 拼出来就抛 | 必须处理 |

#### `src/cep/data/style-library-repo.ts` — 5 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 88 | `readStyleLibrary`：`readStyleWarehouseIndex(stored.value)` | **半**：读路径用 fallback 继续，坏因在 103 拼进 `degraded` | 必须处理 |
| 103 | 拼 `degraded: [stored.degraded ?? '', parsed.degraded, ...notes]` | **有**：透出给页面 | 必须处理 |
| 110 | `currentLibPath`：`readStyleWarehouseIndex(stored.value).value` | **没有**：坏索引 → 默认索引 → 可能找不到文件名而抛「索引里没有当前仓库的库文件名」（文案不准） | 必须处理 |
| 269 | `usableIndex`：`readStyleWarehouseIndex(stored.value)` | **有**（抛点在 271） | 必须处理 |
| 270 | 拼 `broken` 字符串 | **有**：非空就抛「仓库索引不可用，已中止写入」 | 必须处理 |

#### `src/commands/font.ts` — 6 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 310 ×2 | 「导出标签」：`if (tagRead.degraded) throw CepError('IO', …)` | **有**：命令抛错 → toast | 必须处理 |
| 312 ×2 | 同一命令读星级：同样判 `degraded` 抛错 | **有** | 必须处理 |
| 314 ×2 | `{ tags: tagRead.value, stars: starRead.value }` 组导出 payload | 无（被 310/312 挡住） | 必须处理 |

#### `src/commands/fontSet.ts` — 1 处必须处理（另 1 处见 §二）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 138 | 「按间距分布」读设置取 `ztDistributionFilter` | **没有**：坏设置 → 默认参数照常跑 jsx，用户不知道用的不是自己的设置 | 必须处理 |

#### `src/commands/freePanel.ts` — 1 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 298 | 「执行自由面板项」：`normalizeFreePanel(read.value)`（**读边界已归一过，这里是第二次**） | **没有**：坏文件 → 空面板 → 抛「自由面板项不存在」（把"文件坏了"说成"项不存在"） | 必须处理 |

#### `src/commands/rename.ts` — 3 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 193 ×2 | 「导出重命名预设」：`if (read.degraded) throw CepError('IO', read.degraded)` | **有** | 必须处理 |
| 199 | `serializePreset(read.value)` 写盘 | 无（被 193 挡住） | 必须处理 |

#### `src/main.ts` — 1 处（装配层）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 41 | `installCommonUseSource(commonUseRepo)` | N/A：问题在**类型**——store 端口 `CommonUseSource`（`src/stores/common-use.ts:16`）自声明了 `{ value: CommonUseFile \| null; degraded?: string }`，是 `RepoRead` 的第三份同义形状 | 必须处理（删掉自声明，改用 `RepoRead`） |

#### `src/stores/action.ts` — 7 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 32 | `warehouses.value = index.value.list` | **半**：坏索引 → 空仓库列表（34 给提示） | 必须处理 |
| 33 | `activeIndex.value = index.value.index` | 同上 | 必须处理 |
| 34 | `degraded.value = index.degraded ?? ''` | **有**：页面提示条 | 必须处理 |
| 36 | `selectActionFile(currentWarehouseFile(index.value))` | **没有**：坏索引 → 用默认索引选文件 | 必须处理 |
| 39 | `groups.value = library.value` | **半**：坏库 → 空分组 | 必须处理 |
| 40 ×2 | `if (library.degraded) degraded.value = library.degraded` | **有** | 必须处理 |

#### `src/stores/classification-view.ts` — 2 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 24 | `data.value = result.value` | **半**：坏 → 空分类（25 给提示） | 必须处理 |
| 25 | `degraded.value = result.degraded ?? ''` | **有** | 必须处理 |

#### `src/stores/font-set.ts` — 2 处必须处理（另 4 处见 §二）

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 56 | `settings.value = settingsRead.value` | **半**：坏 → 默认设置（57 给提示） | 必须处理 |
| 57 | `settingsDegraded.value = settingsRead.degraded ?? ''` | **有**：页面提示 | 必须处理 |

#### `src/stores/free-panel.ts` — 3 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 23 | `degraded.value = read.degraded ?? ''` | **有** | 必须处理 |
| 26 ×2 | `blocks.value = read.degraded ? [] : read.value.obj.list` | **有**：坏时置空 + 提示（全仓处理得最对的一处） | 必须处理 |

#### `src/stores/rename.ts` — 2 处

| 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| 26 | `preset.value = read.value` | **半**：坏 → 空预设 | 必须处理 |
| 27 | `degraded.value = read.degraded ?? ''` | **有** | 必须处理 |

### 1.2 tests（139 处）

全部是**断言旧失败形状**（`read.degraded` / `read.value` 直接取）的用例，改联合后跟着所属生产处一起改。
分类按"它钉的是哪个生产处"。

| 文件 | 行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- | --- |
| `tests/cep/cloud-entries.test.ts` | 59, 86 | 云同步落盘后读回 `legacySettingsRepo` / `starsRepo` 的值 | 断言旧形状 `.value` | 必须处理 |
| `tests/cep/cloud-hierarchy.test.ts` | 68, 97, 105 | 云同步层级：读回值；105 处 mock 直接返回 `{ value, degraded: '读取失败' }` | 断言旧形状（含 mock 形状） | 必须处理 |
| `tests/cep/file-repo.test.ts` | 109, 110, 118, 119, 139, 140, 148, 149, 171, 172 | `fileRepo` 读契约：正常 / 结构不认识 / 非法 JSON / 文件不存在 / 归一器返回怪值 五组断言 | 断言 `degraded` 与 fallback `value`（**这 10 处就是"坏要可见"的契约本身**） | 必须处理 |
| `tests/cep/style-library-write.test.ts` | 130, 140, 284, 285, 285, 292, 296, 306, 307, 328, 339, 378, 378, 379, 406, 406, 407, 416, 426 | 样式库索引写路径（切仓库 / 删仓库 / 导入导出）后读回索引 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/action.test.ts` | 132, 135, 141, 142, 148, 149, 155, 156, 166, 172, 175, 184, 185, 190, 193, 202, 209, 218, 219, 232, 233, 243, 244, 252, 253, 259, 266, 280, 281 | 动作库命令（增删改分组、切仓库、改名）后读回库/索引 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/free-panel.test.ts` | 34, 64, 70, 77, 102, 103, 108, 109, 116, 123, 128, 134, 146, 156, 175, 188, 202, 213, 223 | 自由面板命令后读回面板文件 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/free-panel-execute.test.ts` | 156, 161, 175, 176, 188, 199, 200 | 执行面板项后读回面板文件 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/rename.test.ts` | 43 | 读回重命名预设 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/style-io.test.ts` | 240, 241, 265, 266, 279, 293, 294 | 样式库 `.kux` 导入导出后读回索引 | 断言旧形状 `.value` | 必须处理 |
| `tests/commands/style.test.ts` | 876, 879, 887, 901, 908, 918, 927, 927 | 样式库命令后读回索引 | 断言旧形状 `.value` | 必须处理 |
| `tests/data/common-use-official-fixture.test.ts` | 60, 97 | 官方 fixture 读回后 `toTiles(read.value)` | 断言旧形状 `.value` | 必须处理 |
| `tests/data/free-panel-repo.test.ts` | 86, 87, 88, 89, 90, 102, 104, 105, 113, 114, 122, 130, 136, 137 | 自由面板仓库读边界归一：正常 / 缺 obj / list 非数组 / 顶层是数组 / 非法 JSON / 文件不存在 | 断言 `degraded` + fallback `value`（**"坏要可见"契约本身**） | 必须处理 |
| `tests/data/repo-cross-process.test.ts` | 213, 214 | 跨进程写冲突时 `read()` 仍返回坏因 + fallback | 断言旧形状（D-42 的读侧契约） | 必须处理 |
| `tests/data/repo.test.ts` | 57, 57, 64, 64, 71, 71, 128, 130, 140, 178 | `fileRepo` 读：文件不存在 / 内容损坏 / 正常 / 并发写入 | 断言 `{ value, degraded }` 解构 | 必须处理 |
| `tests/pages/action.test.ts` | 112, 113 | 动作页渲染前读回库 | 断言旧形状 `.value` | 必须处理 |
| `tests/pages/freePanel.test.ts` | 87, 142, 143 | 自由面板页面交互后读回面板文件 | 断言旧形状 `.value` | 必须处理 |
| `tests/stores/common-use.test.ts` | 66 | 注入数据源：`read: () => commonUseRepo.read()` | 断言旧端口形状（与 `main.ts:41` 同一个问题） | 必须处理 |

---

## 二、可空着（11 处）

坏了就是"没有这份数据"，用户看到空/默认**不算看到错的东西**，也不产生写盘。
改造时不需要为它们写 `if (!ok)` 分支，但**必须在数据层显式折叠**（`readOr(read, fallback)` 之类），
不许让"纯展示"读取器各自 `?? []`（那就是硬规则 20(b) 的静默回退）。

### 2.1 生产代码（9 处）

| 文件:行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| `src/cep/data/font-meta.ts:6` | `readFontTags` 取 `raw` | **没有**：坏 → 空数组 | 可空着 |
| `src/cep/data/font-meta.ts:8` | `.filter(item => typeof item.text === 'string')` | **没有**（空数组上不执行） | 可空着 |
| `src/cep/data/font-meta.ts:9` | `.map(...)` 成 `FontTag[]` | **没有** | 可空着 |
| `src/cep/data/font-meta.ts:18` | `readFontStars` 取 `raw` 遍历成 `{ 家族名: 星级 }` | **没有**：坏 → 空对象 → 页面不显示星 | 可空着 |
| `src/commands/fontSet.ts:234` | 「翻译」读计数器，`normalizeCounter` 后判每日上限 | **没有**：坏 → 归一成 0 次 → 上限被重置（对用户有利，不产生错数据、不写盘） | 可空着 |
| `src/stores/font-set.ts:58` | `quickFonts.value = quickRead.value`（快速字体列表，纯展示） | **没有**：坏 → 空列表 | 可空着 |
| `src/stores/font-set.ts:59` | `hierarchy.value = hierarchyRead.value`（层级预设，纯展示） | **没有**：坏 → 空 | 可空着 |
| `src/stores/font-set.ts:60` | `counter.value = counterRead.value`（翻译次数展示） | **没有**：坏 → 0 | 可空着 |
| `src/stores/font-set.ts:61` | `recentFonts.value = historyRead.value`（最近字体，纯展示） | **没有**：坏 → 空 | 可空着 |

### 2.2 tests（2 处）

| 文件:行号 | 在做什么 | 现在怎么处理"坏" | 分类 |
| --- | --- | --- | --- |
| `tests/commands/font-set.test.ts:119` | 读回 `fontHistoryRepo` 断言最近字体顺序 | 断言旧形状 `.value`（纯展示，随 §2.1 折叠） | 可空着 |
| `tests/commands/font-set.test.ts:197` | 读回 `translateCounterRepo` 断言 `counter.value.num === 1` | 断言旧形状 `.value` | 可空着 |

---

## 三、不该有读操作（0 处）

**一条都没有**——79 处生产代码逐条看过，没有哪一处是"根本不该读"。

最接近的两处，判过之后仍不成立，写在这里免得下次重复讨论：

| 位置 | 像什么 | 为什么不成立 |
| --- | --- | --- |
| `src/commands/freePanel.ts:298` | 命令层又 `normalizeFreePanel(read.value)`，像"多余的读" | **读本身必要**（执行项要拿当前面板）。多余的是**第二次归一**——读边界（`file-repo` 的 `normalize`）已经归一过。该删的是这行归一，不是读。所以归"必须处理" |
| `src/stores/font-set.ts:60` | store 读计数器，命令里也读一次 | 两处读的是**不同用途**（展示 vs 判上限），不是重复读。且它归"可空着" |

---

## 四、单列：`action-archive.ts` 的**数据丢失风险**

**现象**：索引文件损坏时执行「导入动作库」，用户原有仓库列表从索引里消失。

**触发条件**（三条同时成立）：
1. `%APPDATA%\SheJiZhuLi\` 下动作库索引文件损坏（不是合法 JSON，或结构不认识 → `read.degraded` 有值）；
2. 用户在动作页执行「导入动作库」（`.dzx`）；
3. 追加或替换都会中招：替换 = `next.list` 只有导入项；追加 = `[...current.list, ...imported]`，
   而 `current` 是 fallback `DEFAULT_INDEX`（**1 条「默认仓库」，不是空索引**）→ 结果 = 默认仓库 + 导入项。

**实际后果（写清边界，别夸大）**：**索引被覆盖**（`actionIndexRepo.write(next)`，`write` 不走 D-42 的拒绝逻辑），
用户原来的仓库文件名（`sj_dz*.json`）不在 `current.list` 里，所以**不删、变孤儿**；替换模式下
`removeAll` 会删掉 fallback 那一条指向的 `sj_dz_default.json`。原件在 `.bak` 里还有一份索引。
所以是"仓库列表在面板里消失 + 索引被 fallback 顶掉"，不是"用户仓库文件被删"。导出路径（`:77` / `:85`）不写仓库，只是文案误导。

**已修（T-99-4）**：`requireIndex(read, '导入' | '导出')` 在**任何写之前**判 `degraded` 并抛
`动作库索引文件损坏（<原因>），<动作>已中止：磁盘上的仓库文件没动`——与 `file-repo.update`（D-42）
和 `style-library-repo.usableIndex()` 同口径。用例见 `tests/cep/action-archive.test.ts` 的
「action-archive · 坏索引（T-99-4）」三条。

---

## 五、怎么核对这份清单

```powershell
# 220 = 79 + 141：在当前 HEAD 上重跑（要先把 RepoRead 改回联合才有输出，见下）
git revert --no-commit <本清单对应的红提交>
npm run typecheck 2>&1 | Select-String "error TS"      # 应得 79 + 141
git revert --abort 2>/dev/null; git checkout -- .
```

清单里每个行号都能用 `git grep -n` 或直接打开文件核对；三类判据在本文开头，
有争议先改判据再改清单，别逐条讨价还价。
