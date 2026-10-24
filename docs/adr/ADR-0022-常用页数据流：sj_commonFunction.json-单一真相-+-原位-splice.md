# ADR-0022 · 常用页数据流：`sj_commonFunction.json` 单一真相 + 原位 splice

- **状态**：生效
- **结论**：常用页唯一真相是 sj_commonFunction.json（根为裸数组），排序用原位 splice，参数落 sj_set.json 的 cy* 键。
- **日期**：2026-10-23（取自源文档状态索引「定于」列，未逐条 git log -S 复核）
- **裁定人**：UNVERIFIED（源文档未记每条裁定人）
- **触发**：上一版把 COMMON_TILES 之类的常量当真相，页面/命令各有一份

## 背景

源文档（`docs/架构/决策记录.md`）本条未单列「背景」段：旧约定与原因写在「决定 / 原因 / 由来」字段里，已随「判据」段逐字搬来。

## 判据（它凭什么成立 / 为什么不成立）

- **决定**：
  - 网格项 / 顺序 / 显隐的**唯一真相**是 `sj_commonFunction.json`；**文件根是裸数组**（14 项），排序用**原位 splice**（`domain/reorder.dropInsertIndex`，四分支与官方同构），**不用"全量覆盖数组"**。
    - **2026-10-23 更正（T-94）**：本条原写 `{info:[...]}`，**当时无一手依据**（把内部字段当成了文件形状）。一手依据：`configReset()` 直接返回数组（`app.v4.js:11112`）、基类 `this.info = n`（`:6389`）、读回 `Object.assign(this.info, r)`（`:6392`）、写回 `JSON.stringify(this.info)`（`:6401`）；真机文件 `%APPDATA%/SheJiZhuLi/sj_commonFunction.json` 实测 **3489 字节、根是数组、14 项**（fixture：`tests/fixtures/sj_commonFunction.official.json`）。
    - 后果（为什么必须修）：写出去的是对象根，官方面板读不到 14 项，**常用页在真机显示"还没有常用功能"**。
    - 读侧兼容旧形状 `{info:[...]}`（我们早期写错的历史文件），**写侧一律归一成裸数组**。
  - 子面板参数**不落会话态**：官方真持久化在 `sj_set.json` 的 8 个 `cy*` 键（`cyAutoFillColor`/`cyLinkObject`/`cyDeleteNext`/`cyImportToLinkObject`/`cyExport`/`cyOptimizeAll`/`cyOptimizeDeleteAllEmpty`/`cyOptimizeDeleteAllHide`），我方写在**官方位置**；写入口只在 `cep/data/legacy-settings.ts` 的两个窄函数（不新建第二个读写 `sj_set.json` 的模块）。嵌套 patch 口径：**递归到叶子**、数组整体替换、深对象不整块替换、未知键不进 patch。
  - 折叠态（`cyShow*`）**不写**官方文件，落我方 `sj_v5_ui.json`（延续 D-35：我方 UI 字段不进官方文件）。
  - **首建语义**：文件不存在才建种子（repo 的 `ensure()`）；**损坏 / 读失败一律抛 `IO`、不写**。明确**不照抄**官方父类：`readToObject` 把"读不到"和"解析失败"都返回 `{}`，构造函数随即 `keys(r).length==0 → updata()`，即**用默认值覆盖损坏文件**（`app.8565afb8.js` 模块 `4058`；`app.v4.js:11088-11108` 的父类）。
  - `resetSort` 的官方语义是 `Lt.resetConfig()`（全清 + push 14 项种子 + 整份 `updata`，`:11101-11108`、`:64456-64458`），**连用户显隐一起复位**，而按钮文案写的是"重置排序"。我方**照语义实现、不照文案**：命令 `commonUse.resetAll` + 文案改「恢复默认常用功能」+ 二次确认（官方无确认 = 我方有意偏离）。
  - 自由面板项的 `key` 是**官方派发表 key**（`$freePanelBox.show` 的第二参 → `option.key`，`:2163-2180`），它与 jsx 名**不总是同名**（`cy_embedImage`→`cy_insertionImage` 等 5 处），所以映射是**两跳**：`item.key` →（legacy 表）→ 命令 id →（jsx 表）→ jsx 名。旧自造 `commonUse.*` key 收进 `LEGACY_KEY_ALIASES` 一张表。
  - **两处窄例外，写清以便复核**：① 新增纯 UI 态命令 `commonUse.setCollapsed`（折叠态要跨会话保持，但 store 不许写、页面不许 import `cep/data`）；② `cep/events.ts` 的"一个 ID 只能一个语义名"改为"**一个语义名 + payload 路由**"——`setd`(1936028772) 按 `eventData.null._property` 与 `to._obj` 分派（`:69412-69422`），**不新增语义名**，`idToName` 仍是 1:1。
- **原因**：
  - 上一版把 `COMMON_TILES` 之类的常量当真相，页面/命令各有一份；官方本就是把这一页的全部可变状态放在一个文件里，照抄它的形状最省翻译成本，且**设置页仍在写同一个数组**（`:61464-61483`），我方只有同文件同形状才不互相抹。
  - 参数必须落在官方读取位置：官方连**执行时**也现读 `getKey(...)`（`:37753-37754`、`:37822`、`:38041-38043`、`:37685`），放别处就会出现"面板里设的值"与"真正执行用的值"分叉。
  - 官方那条"读坏文件 → 覆盖成默认值"是 P0 会丢用户顺序与显隐的缺陷，与本项目 D-20/D-42 直接冲突，故只借它的**建种子**行为、不借它的兜底。
- **代价**：
  - `sj_set.json` 成为**双写热点**（原面板 deep watch 整份重写 `:16880-16886`，我方按路径 patch）。已核实**原面板没有周期落盘**（全库仅 1 处 `setInterval` 且回调是空实现 `:71601`/`:71608-71610`；113 处 `setTimeout` 无一处调 `updata`/`write`），所以只剩"用户在两个面板同时改同一键"这一种窗口，靠 `file-repo` 的重读 + CAS（D-26）兜。
  - `cep/data/legacy-settings.ts` 会持续变胖（fontSet + `cy*` + 嵌套 patch 挤在一个文件），换来"一个文件一个 repo"。
  - `LEGACY_KEY_ALIASES` 会变成一张没人敢删的表，必须在表头写清加它/删它的条件。
- **什么时候推翻**：
  - 官方若新增"用户自定义常用项"能力（现在明确没有：`:37698`/`:37700` 是"这一项不支持加进自由面板"，全库无新增/删除网格项入口），本 ADR 的"只显隐 + 排序"边界作废。
  - 若某天原面板不再写 `sj_commonFunction.json`，"必须与官方同形状"的理由消失，可换成我方 schema。
  - 若实测发现 `setd` 的 payload 判别字段不是 `_property`/`to._obj`（真机未验，标 `UNVERIFIED`），第 ⑥ 条例外要重做。

> **ADR-23 / ADR-24 的由来与分工**：两条同源于 T-97-8 真机 bug（下面各有实证），但判据不同——ADR-23 管**语义**（消费者补文案 / 补分类 / 补因果），ADR-24 管**类型与数据**（消费者补字段 / 补默认值 / 补转型）。合成一条会让"只推翻类型那条"变成拆条，故各占一条。
>
> **判据面 / 执行面**：ADR-23 / ADR-24 是**判据面**（为什么这么判、什么算违规、拿什么实证）；`AGENTS.md` 硬规则 20 是**执行面**（怎么查、怎么判基线）。两处指向同一件事，**改一处必须同时改另一处**，不许各自长一份细则。

## 决议

决议即「判据」段各条判据本身；本条无独立例外或指向性补充。

## 后果


- 📌 **违反时的判据**：出现第二份常用页可变状态真相（页面 / 命令里的常量）；或写出对象根 `{info:[...]}` 形状；或 `resetSort` 没有二次确认。
源文档本条未单列「后果」段；推翻条件已逐字保留在「判据」段的「什么时候推翻」字段。
