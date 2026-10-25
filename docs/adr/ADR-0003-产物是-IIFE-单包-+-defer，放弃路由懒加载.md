# ADR-0003 · 产物是 IIFE 单包 + defer，放弃路由懒加载

- **状态**：生效
- **结论**：产物是 IIFE 单包 + defer，放弃路由懒加载：file:// 下 origin 为 null，chunk 按需加载不可靠。
- **日期**：2026-10-22（取自源文档状态索引「定于」列，未逐条 git log -S 复核）
- **裁定人**：UNVERIFIED（源文档未记每条裁定人）
- **触发**：CEP 走 file://，模块脚本被 CORS 拦

## 背景

源文档（`docs/架构/决策记录.md`）本条未单列「背景」段：旧约定与原因写在「决定 / 原因 / 由来」字段里，已随「判据」段逐字搬来。

## 判据（它凭什么成立 / 为什么不成立）

- **决定**：`format: 'iife'` + `inlineDynamicImports: true`，HTML 里 `<script defer>`。
- **原因**：CEP 走 `file://`，模块脚本被 CORS 拦（origin 是 null）；chunk 按需加载在 file:// 下不可靠。
- **代价**：所有页面打进一个包（当前 **1.13 MB**，`verify-dist` 实测，见 ADR-18），"改一个组件要重编译全部"——这正是我们想摆脱的原面板问题。
- **2026-10-23 修正**：原写「当前 580KB」。实测值是 **1.13 MB**（ADR-18 记「产物 1.13 MB，`verify-dist` 通过」）。本轮没有重跑 `npm run build`（build 即部署，铁律不擅自部署），数字取自 ADR-18 的实测记录。**判据（2MB 阈值 / 冷启动）未变。**
- **注意**：`defer` 不能去掉。脚本在 head 里，去掉 `type="module"` 后是阻塞脚本，会在 `<body>` 前执行，`#app` 不存在 → 面板全黑。
- **什么时候推翻**：如果包超过 2MB 或者冷启动明显变慢，再考虑本地 http 服务 + 真分包。

## CEP 12 环境能力边界（踩过的，别再试）

| 能力 | 状态 | 说明 |
|---|---|---|
| `localStorage` | ✅ | 按扩展隔离，可用 |
| `ResizeObserver` / `IntersectionObserver` | ✅ | 宽度响应、滚动加载都靠它 |
| CSS 变量 / `:focus-visible` / `@layer` | ✅ | Chromium 99 全支持 |
| Node（`--enable-nodejs`） | ✅ | `window.require`，但要配 `--mixed-context` |
| `@container` 容器查询 | ❌ | Chromium **105+**，CEP 12 是 99 → 宽度响应只能用 `useElementWidth` |
| ESM / 动态 `import()` | ❌ | `file://` 下 origin 是 null，被 CORS 拦 |
| 外部 `<use href="x.svg#id">` | ❌ | 同源限制，必须把 sprite 注入文档 |
| `fetch('file://...')` | ❌ | 同源策略，读文件走 `cep/` 的读原语 |
| `structuredClone` | ✅ | Chromium 98+ |

> 这份表就是"CEP 环境能力清单"，不再单独建文档，避免同一知识散落多处。

## 决议

决议即「判据」段各条判据本身；本条无独立例外或指向性补充。

## 后果


- 📌 **违反时的判据**：`vite.config.ts` 的 `format` 不是 `iife` / `inlineDynamicImports` 不为 true；或 HTML 里的脚本去掉 `defer`、改成 `type="module"`。
源文档本条未单列「后果」段；推翻条件已逐字保留在「判据」段的「什么时候推翻」字段。
