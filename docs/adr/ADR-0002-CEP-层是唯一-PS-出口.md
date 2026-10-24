# ADR-0002 · CEP 层是唯一 PS 出口

- **状态**：生效
- **结论**：页面禁止裸调 CEP；PS 出口全部收口在 src/cep/（transport 唯一 evalScript 出口 + jsx/<域> + events + fs，ps.ts 只读初始化）。
- **日期**：2026-10-22（取自源文档状态索引「定于」列，未逐条 git log -S 复核）
- **裁定人**：UNVERIFIED（源文档未记每条裁定人）
- **触发**：需要统一的超时、错误码、初始化顺序、mock 切换

## 背景

源文档（`docs/架构/决策记录.md`）本条未单列「背景」段：旧约定与原因写在「决定 / 原因 / 由来」字段里，已随「判据」段逐字搬来。

## 判据（它凭什么成立 / 为什么不成立）

- **决定**：页面禁止出现 `window.__adobe_cep__` / `evalScript` / `$.evalFile`。PS 出口全部在 `src/cep/`：`transport.ts`（唯一 `evalScriptRaw` / `__adobe_cep__` 出口）、`jsx/<域>.ts`（7 个域文件：`action` / `commonUse` / `font` / `layer` / `legacy` / `rename` / `style`）、`events.ts`（宿主事件）、`fs.ts`（文件）、`ps.ts`（只剩初始化与读）；写操作在 `commands/<域>.ts`。
- **2026-10-23 修正**：原写「全部走 `src/cep/ps.ts`」、代价写「加一个新 PS 能力要改 3 个文件（ps/types/mock）」。实际已按 ADR-16 / ADR-17 拆开：`ps.ts` 只剩 5 处 `export`（`initJsx` / `getFontList` / 一处 re-export 标签与星级 / `getRawActionList` / `getLayerState`，`git grep -c '^export ' src/cep/ps.ts` = 5），新增能力的三个文件是 `jsx/<域>.ts` + `jsx/types.ts` + `jsx/mock.ts`。**判据（页面禁止裸调 CEP）未变。**
- **原因**：需要统一的超时、错误码、初始化顺序、mock 切换。散落在页面里就没法保证。
- **代价**：加一个新 PS 能力要改 3 个文件（ps/types/mock）。
- **什么时候推翻**：不推翻。但要注意别为了一个页面的一次性调用就加 cep 函数。

## 决议

决议即「判据」段各条判据本身；本条无独立例外或指向性补充。

## 后果


- 📌 **违反时的判据**：`git grep -n "__adobe_cep__|evalScript|$.evalFile" src/pages src/components` 有命中（`src/cep/` 内部除外）；或出现第二个 `evalScriptRaw` 出口。
源文档本条未单列「后果」段；推翻条件已逐字保留在「判据」段的「什么时候推翻」字段。
