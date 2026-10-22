# 设计助理 · 新面板（v5）

Vue 3 + TypeScript + Vite + Pinia，跑在 CEP 12（PS 2022+）里。
PS 能力层继续调原厂 jsxbin，不重写。

## 先看哪份文档

| 想知道 | 看 |
|---|---|
| 每页做到哪了 | `docs/进度.md` |
| 接下来做什么（唯一待办源） | `docs/台账.md` |
| 规范与约束 | `AGENTS.md` |

## 范围

**做**：字体、常用、自定义、样式、动作、重命名、字体管理、设置（8 个页面）。

**不做**：

| 功能 | 原因 |
|---|---|
| 叠印 / 批量套版（`/overprint`） | 已确认砍掉，路由和导航入口都已移除 |
| 模板库 / 素材库 / 专题（`/template` `/material` `/topics` `/topic`） | 云端内容，离线不可用 |

> 注：`Overprint.js` 这个文件名叫「叠印」，实际功能是**变量设置 + 批量套版**（`switchdata: ["变量设置", "批量套版"]`），
> 跟印刷的叠印无关。判断依据见 `../reference/02-组件文档/03-交互链路/Overprint.md`。

## 目录

```
src/
├─ cep/            唯一与 PS 通信的地方
│  ├─ eval-script.ts   evalScript → Promise（超时 / 错误码 / jsxCall 包装）
│  ├─ fs.ts            Node 文件读写（Node 不可用时退到 ExtendScript File）
│  ├─ ps.ts            领域封装（字体 / 图层）
│  ├─ env.ts           注入给 jsx 的环境变量、数据文件路径
│  ├─ mock.ts          浏览器假数据（数据来自真实 SysFont2.json）
│  └─ types.ts         与 jsx 交换的数据结构
├─ stores/         Pinia
├─ router/         15 条路由，对齐 ../reference/02-组件文档/11-组件树.md
├─ components/     通用组件：Icon / GButton / GInput / GDropdown / GMenu / GTooltip / NewSpin / BackTop
├─ assets/         icons-sprite.svg（189 个图标，从原面板抽出来的）
├─ layouts/        左侧导航 + 内容区
├─ pages/          一页一文件夹
├─ mocks/          抓下来的真实数据（fixtures）
└─ styles/
public/
├─ CSXS/manifest.xml   CEP 清单
└─ lib/all.decrypted.js  原厂 jsxbin（338KB，不要改，也不要让 Vite 处理）
```

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 纯浏览器开发，走 mock 数据，不碰 PS |
| `npm run dev:cep` | 把扩展目录指向 `localhost:5173` 再起 dev server，PS 里改代码即时生效 |
| `npm run build` | 样式守卫 + 类型检查 + 构建，**产物直接写进 CEP 扩展目录**（build 即部署） |
| `npm run deploy` | `check` + `build`，**唯一强制点**，进 PS 验收前跑这个 |
| `npm run build:fast` | 跳过类型检查，只构建 |
| `npm run typecheck` | 只跑 vue-tsc |
| `npm run lint` | ESLint（vue essential + TS，`--max-warnings 0`） |
| `npm run format` / `format:check` | Prettier（不管 `docs/`、`public/`、产物） |
| `npm run check` | 样式守卫 + 台账校验 + lint |
| `npm test` / `test:watch` | 单元 / 组件测试（vitest + jsdom，不启浏览器） |
| `npm run ledger` | 只校验 `docs/台账.md`（依赖、id、done 状态） |
| `npm run registry` | 新增横切能力后同步 `docs/横切能力.md` |
| `npm run style:fix` / `style:baseline` | 自动修样式违规 / 修完后收紧基线 |
| `npm run log:new` / `log:index` | 写日志（决策/踩坑/机制变更才写） |

构建输出目录默认 `%APPDATA%\Adobe\CEP\extensions\com.local.psz.panel.v5`，
可用环境变量 `PSZ_EXT_DIR` 覆盖。

## 首次安装

```powershell
npm install
npm run build
# 完全退出 PS 再打开，窗口 → 扩展功能 → 设计助理
```

调试模式必须开：

```powershell
reg query "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode   # 要是 1
```

## 三条约定

1. **所有 `evalScript` 必须经过 `cep/`**，不在页面里裸调。
2. **jsx 侧异常统一用 `ERR:` 前缀回传**，`jsxCall` 会转成 `CepError`。
3. **数据文件优先用 Node 读**；大返回值不要走 `evalScript` 字符串回传，写临时文件再读。

## 图标

原面板的图标不是字体也不是散图，是内嵌在 `app.*.js` 里的一段 SVG sprite
（`<symbol id="iconchuangjian" viewBox="0 0 1024 1024">`），模板里用
`<baseIcon name="#iconchuangjian">` 引用。

我们把它整段抽出来了，共 189 个（原文件里另有 52 个 `fol-icon-test*` 测试图标，已剔除）：

```powershell
cd ..\tools
node 14-sprite.cjs      # 重新生成 src/assets/icons-sprite.svg 和 src/components/icon/names.ts
```

用法：

```vue
<Icon name="#iconchuangjian" :size="14" />   <!-- 带不带 # 都行 -->
<GIcon name="iconxiala" size="xs" />
```

sprite 在 `main.ts` 里通过 `injectSprite()` 注入文档（file:// 下不能用外部引用）。
找图标名：打开面板 `#/__atoms`，那里有 189 个图标的搜索列表。

## 已知事实（踩过的坑）

- `ztgl_initSystemList()` 实测**直接返回字体数组**，字段是
  `family / weights / names / postScriptNames`。磁盘缓存 `SysFont2.json` 用的是另一套键名
  `name / zz / mz / hjm`，两者由 `normalizeFont` 统一。部分版本会返回 `"ok"` 并把数据写进文件，
  两种情况都兜住了。
- `$.evalFile` 必须作为**顶层语句**调用。包进 IIFE 后，jsxbin 定义的函数会落在局部作用域，
  函数返回即销毁，全局仍是 `undefined`（现象：日志显示加载成功，但 `typeof ztgl_initSystemList`
  是 `undefined`）。
- 不调 `Sys_setSystemEnvInfo` 会报「undefined 不是对象」。
- 每个 CEP 扩展的 ExtendScript 会话独立，必须自己 `$.evalFile`，借不到原面板已加载的 jsx。
- `all.decrypted.js` 解掉的是外层 AES + gzip，里面仍是 `@JSXBIN@` 字节码，不是可读源码。
