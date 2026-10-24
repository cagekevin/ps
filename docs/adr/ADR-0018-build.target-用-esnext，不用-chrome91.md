# ADR-0018 · `build.target` 用 `esnext`，不用 chrome91

- **状态**：生效
- **结论**：build.target 用 esnext：esbuild 0.28.2 在 Windows 删不掉自己的临时目录，只有产物级 transpile 崩。
- **日期**：2026-10-22（取自源文档状态索引「定于」列，未逐条 git log -S 复核）
- **裁定人**：UNVERIFIED（源文档未记每条裁定人）
- **触发**：npm run build / deploy 在 Windows 上必失败（Access is denied）

## 背景

源文档（`docs/架构/决策记录.md`）本条未单列「背景」段：旧约定与原因写在「决定 / 原因 / 由来」字段里，已随「判据」段逐字搬来。

## 判据（它凭什么成立 / 为什么不成立）

- **现象**：`npm run build` / `npm run deploy` 在 Windows 上必失败，报
  `remove ...\Temp\esbuild-<hash>: Access is denied`（esbuild 0.28.2）。构建产物没出来，
  `verify-dist` 也就跑不到。
- **根因**：不是项目代码的问题，是**esbuild 0.28.2 在 Windows 上删不掉自己的临时目录**。
  报错发生在 Vite 的**产物级** `vite:esbuild-transpile` 那一步（大输入整包转译之后清理临时目录）。
  该插件**只在 `build.target !== 'esnext'` 时运行**——目标里有需要降级的语法它才介入。
- **证据**：
  - 报错原文：`[vite:esbuild-transpile] remove ...\Temp\esbuild-<hash>: Access is denied`（exit 非 0）。
  - 三个反证（都试过、都还报同样的错）：换 TEMP 盘符、换短路径、设 `ESBUILD_TMPDIR`；
    以及脱离 shell 用独立进程跑构建 —— 与调用方式无关。
  - 对照实验：**模块级 transform 正常**（dev / vitest 里 esbuild 跑得好好的），
    只有产物级 transpile 崩 —— 说明不是"esbuild 完全不能用"，而是"这一步的临时目录清理"必挂。
  - 决定性验证：把 `build.target` 提到 `'esnext'` 后构建成功，产物 1.13 MB，`verify-dist` 通过。
- **决定**：`vite.config.ts` 的 `build.target` 改为 `'esnext'`，跳过产物级 transpile。
- **代价**：产物不再向 chrome91 降级语法，现代语法（`?.`、`??`、类字段等）原样保留。
  CEP 12 = **Chromium 99**，这些语法都支持，风险可接受；但"支持 chrome91"这条保证没了。
- **被放弃的方案**：
  - 改 esbuild 版本（升/降级）——本轮不许动依赖，且没验证过哪个版本不犯这个毛病；
  - 给 Defender 加排除 / 改系统清理策略——改的是开发机环境，换台机器就复现，等于把问题藏起来；
  - 给 `node_modules/esbuild` 打补丁——离线重建就失效，属于"补丁式绿灯"，不做。
- **什么时候推翻**：换机器、或 esbuild 升级后再验证一次 `Access is denied` 是否消失；
  只要它不再复现，就应把 `target` 回到 `'chrome91'`，并复核 `verify-dist` 与真机面板。
  另外：如果 CEP 目标运行时降到 Chromium 99 以下（换 PS 版本），这条必须重新评估。

## 决议

决议即「判据」段各条判据本身；本条无独立例外或指向性补充。

## 后果


- 📌 **违反时的判据**：`vite.config.ts` 的 `build.target` 回到 `chrome91` 而 `Access is denied` 未在换机器 / 升级 esbuild 后复核过。
源文档本条未单列「后果」段；推翻条件已逐字保留在「判据」段的「什么时候推翻」字段。
