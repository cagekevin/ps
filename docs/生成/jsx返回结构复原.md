# jsx 返回结构复原（基于 `archive\源码还原\` 逆向产物）

> 日期：2026-10-22
> 目的：验证 `archive\源码还原\` 的逆向产物能否解封 `daily/架构日志/00-任务-总索引.md` 里被标 `blocked` 的验证类任务，
> 并把**能从源码复原的事实**落定。推断与实证分开标注，不猜字段。
>
> **一句话结论**：
> - 被 `tools/README.md` 标 ⛔ 的 11 个脚本**全部能跑**（输入都在，脚本里写死了旧目录名）。
> - 68 个 jsx 函数里 **20 个已复原到「字段 + 消费点」级别**（5 个 A 级可写类型 / 4 个 B 级 / 11 个 C 级），
>   另有 4 个 setter 已定论「返回值根本没被读」→ 共 24 个有结论。
> - **T-54 只能解封一半**（契约层可解封，"实测 fixture"层不能）；
>   **T-55 / T-56 可以解封**，且两者是**同一个封堵点**；
>   **T-57 可从 blocked 降为 todo**：`.kuc~.kus` 的读写两侧都在源码里（`app.v4.js:54756-54866`），只差内层载荷字段。

---

## 0. 口径与证据约定

### 0.1 路径简写

| 本文写法 | 实际路径 |
|---|---|
| `56d7.js:34559` | `D:\稿定设计助理-存档\archive\源码还原\webcrack输出\app\56d7.js` 第 34559 行 |
| `0425.js:3469` | 同上目录 `0425.js` 第 3469 行 |
| `组件/` | `D:\稿定设计助理-存档\archive\源码还原\组件\`（192 个 `.js`） |
| `函数源码/` | `D:\稿定设计助理-存档\archive\源码还原\函数源码\`（2466 个文件） |
| `docs/原版/02-组件文档/` | `D:\稿定设计助理-存档\app\docs\原版\02-组件文档\`（旧的 `BUILD-SPEC/`） |
| `jsx契约.md` | `app\docs\架构\jsx契约.md` |

**行号口径**：`webcrack输出/app/` 是**分模块**产物，行号按**单文件**计；它与 `deobfuscated.js`（整包一份，4227 行）
行号**不同源**，两者不能混引。本文一律引分模块文件。

### 0.2 「复原」到什么程度 —— 三级定义

| 级别 | 含义 | 判据 |
|---|---|---|
| **A 可写类型** | 字段名 + 类型 + 可选性都有源码依据 | 有字段读取点 **且** 有类型旁证（默认值 / 分支比较 / 真实数据样本） |
| **B 只能列字段** | 字段名确定，类型/可选性只能部分推断 | 有字段读取点，但无类型旁证 |
| **C 只有外壳** | 只知道 `{err,msg}` / `{code,message}`，或返回值根本没被读 | 无 `data` 读取点 |

### 0.3 证据类型标注

- **【实证】**：`文件:行号` 或真实数据文件内容，可核对。
- **【推断】**：由消费点反推、没有类型旁证的部分，逐条标出。
- 本文没有一处字段是"凭函数名猜"的；每条都能指到读取点。

---

## 1. 能力盘点：11 个脚本逐个判

### 1.1 结论表

实测方式见 §1.3；`exit=` 是真实退出码，产物是真实落盘目录。

| 脚本 | 状态 | exit | 实际产物（本次探针） | 卡在哪（若非 ✅） |
|---|---|---|---|---|
| `04-spec.cjs` | ✅ 能跑 | 0 | `02-组件/` 192 份 | 只需改路径（`04-spec.cjs:15-17`） |
| `04b-methods.cjs` | ✅ 能跑 | 0 | `02-组件/methods/` 164 份（自报 172，见 §1.5） | 只需改路径（`:15-17`） |
| `05-flows.cjs` | ✅ 能跑 | 0 | `03-交互链路/` 151 份（自报 158，见 §1.5） | 只需改路径（`:13-15`） |
| `06-store.cjs` | ✅ 能跑 | 0 | `04-store.md` 4938 B | 只需改路径（`:13-14`） |
| `08-jsx.cjs` | ✅ 能跑 | 0 | `06-jsx契约.md` 10626 B / 68 个函数 | 只需改路径（`:13-17`） |
| `10-deps.cjs` | ✅ 能跑 | 0 | `09-依赖关系.md` 26099 B + `.json` 63556 B | 只需改路径（`:18-21`） |
| `11-tree.cjs` | ✅ 能跑 | 0 | `11-组件树.md` 24474 B / 15 条路由 | 只需改路径（`:18-21`） |
| `12-dynamic.cjs` | ✅ 能跑 | 0 | `10-动态逻辑.md` 2598 B | 只需改路径（`:20-22`） |
| `13-reuse.cjs` | ✅ 能跑（**需上游产物在位**） | 0 | `12-组件复用度.md` 13255 B | 上游 `11-组件树.md` 必须在 `BUILD-SPEC/` 下（`:14-16`） |
| `98-audit.cjs` | ✅ 能跑 | 0 | `07-审计报告.md` 1949 B | 只需改路径（`:14-17`） |
| `99-build-spec.cjs` | ✅ 能跑 | 0 | `00-总览.md` 7232 B / 统计 516 文件 1.44 MB | 只需改路径（`:13`） |

**能跑 11 个，不能跑 0 个。**

### 1.2 被标 ⛔ 的真实原因（三类，都不是"输入不存在"）

README `tools/README.md:28-46` 把 9 个脚本标 ⛔，理由是"缺输入（需重建 webcrack 产物）"。
实测这三类原因完全不同：

**① 目录改名 —— 输入全在，只是脚本写死了旧名**

`tools/README.md:13-14` 声明 `03-源码还原/webcrack输出/app/` 与 `03-源码还原/组件/` **已删除、没进存档**。
实际这两个目录都在，只改了名：

| README 说的路径 | 实际存在 | 实测 |
|---|---|---|
| `03-源码还原/webcrack输出/app/` | `archive/源码还原/webcrack输出/app/` | 483 个文件（482 个分模块 `.js` + `bundle.json`） |
| `03-源码还原/组件/` | `archive/源码还原/组件/` | 192 个 `.js` |
| `03-源码还原/component-map.json` | `archive/源码还原/component-map.json` | 67696 B，193 条记录 |

【实证】`Get-ChildItem -Recurse` 计数 + `04-spec` 能读出 193 条 map 记录并写出 192 份规格。

**② 产物目录改名 —— 不是缺输入，是"不知道该往哪写"**

所有脚本写死 `OUT = path.join(ROOT, 'BUILD-SPEC', ...)`。`BUILD-SPEC/` 现在叫 `docs/原版/02-组件文档/`，
那里面 12 份产物**已经存在**（`00-总览.md`…`12-组件复用度.md`）。所以第二类问题不是"跑不了"，
而是"跑起来会把新产物写到 `D:\稿定设计助理-存档\BUILD-SPEC\` 这个不存在的目录下"。

**③ 真缺上游 —— 只有 `13-reuse` 一个，且它的上游本身能生成**

`13-reuse.cjs:14-16` 读 `BUILD-SPEC/11-组件树.md`。这个文件由 `11-tree` 产出；只要先跑 `11-tree`，
`13-reuse` 就有输入（本次实测 exit=0，见 §1.1）。

> README 里"需重建 webcrack 产物（`npx webcrack …`）"这条结论【不成立】：产物没丢，丢的是路径。

### 1.3 实测命令与产物路径

本次**没有改任何脚本、没有写存档**。做法：在 `%TEMP%` 建一个 `fs` 垫片，把两个写死的路径段
**只重映射到现存位置**，脚本本体逻辑一行未动：

| 重映射 | 从 | 到 |
|---|---|---|
| 输入 | `03-源码还原` | `archive/源码还原` |
| 产物 | `BUILD-SPEC` | `%TEMP%\<probe>\BUILD-SPEC`（临时目录） |

```powershell
# 探针根（临时目录，不在存档里）
$P = "$env:TEMP\probe"; $env:PROBE_OUT = "$P\out"
# 垫片源码见附录 A；它只重写 fs 的路径参数
node --require "$P\fs-shim\index.js" "$P\patched\04-spec.cjs"
```

产物路径（本次）：

```
%TEMP%\dsh-0IDpJ5\probe\out\BUILD-SPEC\
    ├─ 00-总览.md 04-store.md 06-jsx契约.md 07-审计报告.md
    ├─ 09-依赖关系.md/.json  10-动态逻辑.md  11-组件树.md  12-组件复用度.md
    ├─ 02-组件\            192 份
    ├─ 02-组件\methods\    164 份
    └─ 03-交互链路\        151 份
```

**若要"真跑"（写回仓库），每个脚本需要改的行**（只列不改，属于你的决定）：

| 脚本 | 需要改的常量 | 现值 → 应指向 |
|---|---|---|
| `04-spec.cjs` | `:15 SRC` `:16 MAP` `:17 OUT` | `archive/源码还原/组件`、`archive/源码还原/component-map.json`、`docs/原版/02-组件文档/02-组件` |
| `04b-methods.cjs` | `:15` `:16` `:17` | 同上（OUT 到 `02-组件/methods`） |
| `05-flows.cjs` | `:13` `:14` `:15` | OUT 到 `02-组件文档/03-交互链路` |
| `06-store.cjs` | `:13` `:14` | OUT 到 `02-组件文档/04-store.md` |
| `08-jsx.cjs` | `:13-16 DIRS` `:17 OUT` | OUT 到 `02-组件文档/06-jsx契约.md` |
| `10-deps.cjs` | `:18` `:19` `:20` `:21` | OUT 到 `02-组件文档/09-依赖关系.*` |
| `11-tree.cjs` | `:18` `:19` `:20` `:21` | OUT 到 `02-组件文档/11-组件树.md` |
| `12-dynamic.cjs` | `:20` `:21` `:22` | OUT 到 `02-组件文档/10-动态逻辑.md` |
| `13-reuse.cjs` | `:14` `:15` `:16` | SPEC 指向 `docs/原版/02-组件文档` |
| `98-audit.cjs` | `:14` `:15` `:16` `:17` | 同 map/组件/规格目录 |
| `99-build-spec.cjs` | `:13` | SPEC 指向 `docs/原版/02-组件文档` |

`tools/README.md` **我没有改，也不替你决定改不改**。§1.2 只陈述"声明与事实不符"及其行号。

### 1.4 复现性验证：重新生成的产物 vs 存档里已有的产物

把探针产物与 `docs/原版/02-组件文档/` 逐字节比对（SHA256）：

| 产物 | 探针 | 存档 | 结果 |
|---|---|---|---|
| `04-store.md` | 4938 | 4938 | **IDENTICAL** |
| `06-jsx契约.md` | 10626 | 10626 | **IDENTICAL** |
| `09-依赖关系.json` | 63556 | 63556 | **IDENTICAL** |
| `12-组件复用度.md` | 13255 | 13255 | **IDENTICAL** |
| `09-依赖关系.md` | 26099 | 26099 | 同长度、哈希不同 |
| `11-组件树.md` | 24474 | 24474 | 同长度、哈希不同 |
| `10-动态逻辑.md` | 2598 | 2598 | 同长度、哈希不同 |
| `00-总览.md` | 7232 | 7313 | 差 81 B |
| `07-审计报告.md` | 1949 | 1950 | 差 1 B |

【实证】"同长度哈希不同"的差异**只来自内嵌的生成时间戳**：

```
探针：> 生成时间：2026/10/22 15:10:08
存档：> 生成时间：2026/10/20 14:34:41
```

结论：**流水线完全可复现**；存档里那 12 份产物就是用这批脚本、从这批输入生成的。

### 1.5 顺带查到的 3 个既有缺陷（不在本次修复范围，只登记）

1. **`02-funcs.cjs` 确实不存在**：`run.cjs` 的 `STEPS` 里仍列着它（README `:29` 也这么写），
   但目录里没有该文件 → 一键跑会报"✗"。【实证】目录清单。
2. **`05-flows` / `04b-methods` 同名覆盖导致少写**：自报 158/172，落盘 151/164。
   根因是产物文件名用 `c.name`，而 `component-map.json` 193 条记录只有 **186 个唯一 `name`**
   （重名：`file`、`fileChilder`、`other-filters`、`Template`、`Set`、`font-manage` 等），互相覆盖。
   存档里的历史产物同样是 151/164 → 不是本次引入。
3. **`04-spec` 少 1 份**：`component-map.json` 里的 `Rename.js` 在 `组件/` 目录中**不存在**
   （`04-spec.cjs:122` 会打印"跳过（文件不存在）"），所以写 192 份；而存档里是 193 份
   （历史产物，那时 `Rename.js` 还在）。`98-audit` 的"识别 193 / 规格 192 / 缺 1"就是这件事。

---

## 2. 实证复原：jsx 返回结构

### 2.1 先说信封：**不是一套，是三套**

这是这次最重要的发现，直接决定类型怎么写。

| 信封 | 形态 | 谁在用 | 证据 |
|---|---|---|---|
| **A `{err,msg,data}`** | `err===0` 成功；`err!=1` 也当成功 | `zt_*` / `ys_*` / `Layer_*` / `overprint_*` 绝大多数 | `56d7.js:34562`（`n.err === 0`）、`32374`（`n.err != 1`） |
| **B `{code:"OK", message}`** | `code === "OK"` 成功，**没有 `err` 字段** | `ztgl_setFont`、`ztgl_read_text`、`ztgl_create_or_replace` | `41604`、`41660`、`41636` |
| **C 裸值** | 直接返回数组 / `"ok"` / `false` | `ztgl_initSystemList`（数组）、`Fs_selectFolder`（`false`） | `41551`（原样 return）、`2178`（`=== "ok"`） |

**同一个函数在两处用了两套信封**（必须在真机确认哪个是真的）：

```js
// 56d7.js:34051 —— 字体面板：按 A 信封读
return n.$cep.jsx("ztgl_setFont", [t.hjm[e], t.mz[e], t.zz[e]], "设置字体");
// 34054: if (i && i.err == 1) { n.$tips.show(i.msg) }

// 56d7.js:41601 —— 字体管理：按 B 信封读
return e.ensureCep().jsxNoCheck("ztgl_setFont", [a, i, r], "设置字体");
// 41604: if (!s || s.code === "OK") { ... } else { throw new Error(s.message) }
```

【实证】两段都是原版源码。若真机返回的是 A 信封，则 `41604` 分支 `s.code` 为 `undefined`，
`undefined === "OK"` 为假 → 会走进 `throw new Error(undefined)`。这一条**只能真机定**（见 §3 T-54）。

### 2.2 逐函数复原（20 个函数已定级 + 4 个发后不管）

> 所有 `.field` 都是消费点读取，行号为该行源码。类型来源：**默认值**（`data()` 里声明的初值）或
> **分支比较**或**真实数据样本**，逐条标。

#### 1) `zt_getFontSimpleInfo` —— A 级，可写 TS 类型（**最完整的一个**）

返回 `{err, msg?, data: FontSimpleInfo}`。

消费点：`56d7.js:34559`（唯一调用）→ `34561 n = e.sent` → `34562 if (n && n.err === 0)` → `34563 t.fontInfo = n.data`。

`data` 的字段全部有**读取点 + 默认值双重依据**（默认值在 `56d7.js:34101-34120` 的 `fontInfo: {…}` 里）：

| 字段 | 类型 | 可选 | 读取点 | 类型依据 |
|---|---|---|---|---|
| `family` | `string` | 必 | `34574`、`32475`、`32493` | 默认 `"请选择字体"`（`34118`） |
| `weight` | `string` | 必 | `34577`（`zz.indexOf`）、`34618`、`32510` | 默认 `"选择字重"`（`34103`） |
| `size` | `string` | 必 | `34579`、`32635`、`32655`、`34462-34463` | 默认 `"12"`（`34102`）；`34463` 还做 `t + " " + fontUnit` 字符串拼接 |
| `tracking` | `number` | 必 | `34365`、`32823`、`32841`、`34234`、`34300` | 默认 `0`（`34108`）；`34239` 对它 `parseFloat` |
| `leading` | `number` | 必 | `34564`、`34394`、`34428`、`34396` | 默认 `0`（`34107`） |
| `useAutoLeading` | `boolean` | 必 | `34564`（三元条件） | 默认 `false`（`34106`） |
| `autoKerning` | `"opticalKern" \| "manual" \| string` | 必 | `34565`、`34509-34514`、`32548` | 默认 `"manual"`；分支比较 `== "opticalKern"`（`34565`） |
| `capitalization` | `"Nrml" \| "allCaps" \| string` | 必 | `34501-34506`、`32588` | 默认 `"Nrml"`；分支 `== "allCaps"` |
| `justification` | `"left" \| "center" \| "right" \| string` | 必 | `34566`、`34568`、`34570` | 默认 `"left"`（`34119`）；三分支比较 |
| `fauxBold` | `boolean` | 必 | `34535`、`32564` | 默认 `false`（`34104`） |
| `fauxItalic` | `boolean` | 必 | `34523`、`32576` | 默认 `false`（`34105`） |
| `color` | `{ rgb: { r:number, g:number, b:number }, … }` | 必 | `34175`（`this.fontInfo.color.rgb`）、`34333` | 默认 `{rgb:{r:255,g:255,b:255}}`（`34111-34117`） |

```ts
/** 依据：56d7.js:34563 赋值 + 34101-34120 默认值 + 34564-34579 读取点 */
interface FontSimpleInfo {
  family: string
  weight: string
  size: string
  tracking: number
  leading: number
  useAutoLeading: boolean
  autoKerning: 'opticalKern' | 'manual' | (string & {})
  capitalization: 'Nrml' | 'allCaps' | (string & {})
  justification: 'left' | 'center' | 'right' | (string & {})
  fauxBold: boolean
  fauxItalic: boolean
  color: { rgb: { r: number; g: number; b: number }; hex?: string }
}
```

【推断】只有两处算推断，已标注：
- `color.hex`：`34101-34120` 的默认值里**没有** `hex`，但真实颜色样本有（见 §3.4 的 `sj_kuCol*.ini`）→ 标可选。
- `size`/`weight` 的"必填"是**推断**：默认值给了初值，但没有分支证明真机一定给。

#### 2) `ztgl_initSystemList` —— A 级（唯一有**实测**记录的函数）

两个消费点，**形状不同**，这一点很关键：

```js
// ① 56d7.js:2175 —— 按 C 信封「字符串 ok」判断
return n.jsxNoCheck("ztgl_initSystemList");
// 2178: if (a === "ok") { … } else { e(); return false }   ← 不返回 "ok" 就当失败
// 2195: i = D.a.readToObject(N.a.path.sysFontList)          ← 真正读的是磁盘缓存 SysFont2.json

// ② 56d7.js:41549 —— 原样透传，不判形状
return t.ensureCep().jsxNoCheck("ztgl_initSystemList", []);
// 41551: return e.abrupt("return", e.sent)
```

`jsx契约.md:22-28` 有**真机实测**记录：返回 `[{family, weights[], names[], postScriptNames[]}]`，共 259 条，四字段等长数组。

**实测与 ① 的 `=== "ok"` 矛盾** → ①那个分支在真机上永远走 else（`56d7.js:2182`）。
【实证】`jsx契约.md` 的实测日期 2026-10-20 + 本文 `56d7.js:2178`/`41551` 两段源码。

```ts
/** 依据：jsx契约.md:22-28 真机实测；56d7.js:41551 原样透传 */
type ZtglSystemFont = {
  family: string
  weights: string[]
  names: string[]
  postScriptNames: string[]
}
type ZtglInitSystemListResult = ZtglSystemFont[]   // 不是 "ok"
```

#### 3) `ys_AddStyle` —— B 级（**上一版挂错了库，已更正**：它进的是样式库，不是颜色库）

返回 `{err, msg?, data: 图层样式项}`。

```js
// 56d7.js:43582 addStyle
// 43596: a = e.data.getGroupId(t)
// 43603: return e.$cep.jsx("ys_AddStyle", [i]);   i = {delArr, groupId: a, envDir:"/SheJiZhuLi"}
// 43606: if (r.err != 1) { … } else { return e.$msg.showErr(r.msg) }
// 43612: e.data.addItem(t, r.data);               ← data 作为样式项整体入组
```

**先定它属于哪个库**（这条链决定形状，逐环可核）：

| 环节 | 行号 | 内容 |
|---|---|---|
| 样式页 render 绑定 | `56d7.js:41813` | `a("stylecom", { attrs: { data: t.style } })` |
| 页面组件注册 | `56d7.js:46648` | `name:"Style"` 的 `components: { …, stylecom: d_ }` |
| `d_` 的来源 | `56d7.js:43698-43699` | `h_ = Object(Y.a)(u_ …)`；`d_ = h_.exports` |
| `t.style` 是什么 | `56d7.js:47023` | `this.style = new E_(this.wh.getCurrentStylePath())` |
| `E_` 是什么 | `56d7.js:45348`、`45041` | `var E_ = L_;`，`L_` 的构造标签是 **"样式"**（默认组"样式默认分组"，`45040`） |
| **样式库项校验** | `56d7.js:45062` | `if (!t.isContainKey(r, ["name","id","layerId"])) { Ct.a.push(["styleErr2", r]); splice }` |
| 校验成功标记 | `56d7.js:45075` | `Ct.a.push("checkStyleOk", true)` |

对照 —— **颜色库是另一个类、另一个 jsx**：

- 颜色库 `X_`（`56d7.js:46163 var X_ = J_;`，构造标签 `46080 "颜色"`），项校验才是
  `["name","color"]` + `color{hex,c,m,y,k}`（`46101`），结束标记 `checkColorOk`（`46114`）；
- 颜色是 `ys_getForegroundColor` 加的（`42258`），见本节第 16 条。

**上一版的错误**：我把 `46101`（颜色库校验）当成了 `ys_AddStyle` 的依据，于是写出 `{name, color{…}}`。
按 `45062`，这样的项进样式库会**在下一次启动 `checkError()` 时被直接删掉**。

`id` / `layerId` 的用法（实证）：

```js
// 56d7.js:45247-45249 —— id 就是缩略图文件名主体
n.push(e + i.id + ".psd");            // 组：kuStyle/<组id>.psd
n.push(e + i.list[r].id + ".png");    // 项：kuStyle/<项id>.png
// 56d7.js:45089 —— 删除时按 layerId 记录待删
this.addDeleteStyleId(this.info[t].id, n[0].layerId);
```

```ts
/** B 级：字段确定（45062），类型与其余载荷只能留 unknown */
interface StyleLibraryItem {
  name: string
  id: string                       // 同时是 kuStyle/<id>.png 的文件名主体（45249）
  layerId: string | number         // 类型未证（45089 只体现"按它记录待删"）
  [k: string]: unknown             // 其余效果载荷面板侧不读，原样回传给 ps_ysBtnUseStyle（43576）
}
interface YsAddStyleResult { err: number; msg?: string; data: StyleLibraryItem }
```

【实证】字段：`45062`；库归属：`41813` → `46648` → `43699` → `47023` → `45348` → `45041`。
【未证】`layerId` 的类型；`data` 除三键外还带哪些效果载荷。

#### 4) `ys_getFontInfo` —— A-级（字段齐，类型靠隐含）

```js
// 56d7.js:43308（添加字体）
return e.$cep.jsx("ys_getFontInfo");
// 43311: if (a !== false)          ← 可能直接返回 false
// 43317: if (a.err != 1) … else showErr(a.msg)
// 43323: if (a.err != 0 || a.data.fonts.length != 0) …   ← data.fonts 是数组
// 43329: e.data.addItem(t, a.data)

// 56d7.js:35422（复制字体样式）
// 35425: if (a.err == 0) { e.copyFont = a.data }
// 35469: a = Object(ft.c)(e.copyFont); for (i in t) { a.fonts.forEach(o => o[i] = null) }  ← fonts 是数组
```

`fonts[]` 内元素字段（预览渲染直接读，`56d7.js:43025-43046`）：

| 字段 | 读取点 | 类型依据 |
|---|---|---|
| `fonts[0].size` | `43027`（`parseInt`） | 数字或数字串【实证读法】 |
| `fonts[0].color.rgb.r/.g/.b` | `43030` | number【实证】 |
| `fonts[0].family` | `43035`、`43044` | string【实证】 |
| `fonts[0].weight` | `43035` | string【实证】 |
| `fonts[0].scriptFamily` | `43035` | string【实证】 |
| `fonts[0].leading` | `43046` | number【实证】 |
| `fonts[0].tracking` | `43046` | number【实证】 |

**真实样本**（`sj_kuFon99854AFF9C441520.json`）：`{"name":"未命名","fonts":[{"scriptFamily":"DengXian","weight":"Regular","fontName":"DengXian","size":"20","horizontalScale":"100","verticalScale":"100",…}]}`
→ 注意样本里 `size` 是**字符串** `"20"`，与 `43027` 的 `parseInt` 相容。

```ts
interface YsGetFontInfoResult {
  err: number
  msg?: string
  data: {
    fonts: Array<{
      size: string | number
      family: string
      weight: string
      scriptFamily: string
      leading: number
      tracking: number
      color: { rgb: { r: number; g: number; b: number } }
      [k: string]: unknown        // 允许 copyFont 里把某些键置 null（35476）
    }>
  }
} | false                          // 43311
```

#### 5) `zt_getCurrentText` —— B 级（数组元素只证到 2 个字段）

```js
// 56d7.js:35314
return e.$cep.jsx("zt_getCurrentText");
// 35317: if (r.err != 1) … else showErr(r.msg)
// 35323: if (!(r.data.length > a))            ← data 是数组
// 35330: s = Object(T.a)(r.data)              ← 可迭代
// 35338-35339: c = o.value; c.text.length     ← 元素有 .text:string
// 35374: c.dst = Xv(p)                        ← 面板回填 .dst
// 35392: e.$cep.jsxHistory("zt_setTranslateText", [r.data, i.delete])  ← 整个数组回传
```

```ts
/** 依据：56d7.js:35314-35392 */
interface ZtGetCurrentTextResult {
  err: number; msg?: string
  data: Array<{ text: string; dst?: string; [k: string]: unknown }>
}
```

【推断】B 级：元素上除 `text`/`dst` 以外的字段没有任何读取点 → 只能用索引签名开路。

#### 6) `zt_getCurrentFontInfo` —— B 级（只证到 `data.family`）

```js
// 56d7.js:32371
return t.$cep.jsx("zt_getCurrentFontInfo");
// 32374: if (n.err != 1) … else showErr(n.msg)
// 32380: a = t.data.addFont(n.data);   t.$tips.show(a == "" ? "添加字体成功" : a)
```

`addFont` 的真实实现（`56d7.js:32170-32198`，注意**这是同步版**，不是 `43295` 那个异步版）：

```js
if (this.info.list.length >= 15) return "最多添加15个字体哦";
for (…) if (i.family == t.family) return "已存在同名字体";   // 32180 ← 读 t.family
t = n.findFontAllInfo(t);                                     // 32189
if (t === false) return "查找字体信息失败!";
```

`findFontAllInfo`（`32258-32281`）只读 `t.family`（`32267`），然后**回填** `zz/hjm/mz`（`32268-32270`）。

```ts
/** 依据：56d7.js:32380 → 32180/32267；其余字段无读取点 */
interface ZtGetCurrentFontInfoResult {
  err: number; msg?: string
  data: { family: string; [k: string]: unknown }   // B 级：只证到 family
}
```

#### 7) `zt_setFontColor` —— A-级（`data` 是颜色值本身）

```js
// 56d7.js:34329
return t.$cep.jsx("zt_setFontColor");
// 34332: if (n && n.err == 0) { t.fontInfo.color = n.data; }   ← data 直接当 color
```

```ts
interface ZtSetFontColorResult {
  err: number; msg?: string
  data: FontSimpleInfo['color']     // 见 34175 的 color.rgb 读法
}
```

#### 8) `ys_getGradientInfo` —— B 级

```js
// 56d7.js:42817
// 42820: if (a !== false) …             ← 可能 false
// 42826: if (a.err != 1) … else showErr(a.msg)
// 42832-42835: i = { name:"未命名", gradient: a.data }; e.data.addItem(t, i)
```

`gradient` 必须是对象（`44619`：`if (!t.isObject(i.gradient))` 就删项），内部键名**无读取点** → B 级。
真实样本：`sj_kuGra6A784C90B4183F79.ini`（52929 B，存在但本文未展开）。

#### 9) `zt_setFontName` —— C 级 + **特殊错误码**

```js
// 56d7.js:32401
return e.$cep.jsx("zt_setFontName", [a.hjm[t], a.mz[t], a.zz[t]]);
// 32404: if (i.err == 1) {
// 32405:   if (i.code == 1) { e.$msg.confirm("错误提醒","字体缺失，点击确定前往下载",…) }
// 32412:   else { e.$msg.showErr(i.msg) }
```

```ts
interface ZtSetFontNameResult {
  err: number
  msg?: string
  code?: number     // code===1 ⇒ 字体缺失（32405）
}                   // 无 data：C 级
```

#### 10~13) 纯 setter：C 级（信封 A，只读 `err`/`msg`）

| 函数 | 调用点 | 消费点 |
|---|---|---|
| `zt_setHorizontalCenters` | `35199` | `35202 if (i.err == 1) showErr(i.msg)` |
| `zt_verticalCenter` | `35234` | `35237 if (i.err == 1) showErr(i.msg)` |
| `zt_setFontSize` | `32044` | `32047 if (a.err == 1) e.$tips.show(a.msg)` |
| `zt_setFontWordSpacing` | `34362` | `34369 if (a.err == 1) showErr(a.msg)` |
| `layer_font_setLeading` | `34391`、`34426` | `34401`、`34468` 同上 |
| `ys_checkUseFont` | `43267` | `43270 if (i.err != 1) … else showErr(i.msg)`（`data` **未读**） |
| `zt_changeTextBranchMerge` | `30981` | `30984 if (a.err != 1) … else showErr(a.msg)` |

```ts
interface JsxEnvelopeOnly { err: number; msg?: string }   // 无 data
```

#### 14) `ztgl_read_text` —— **信封 B，且没有 `err`**

```js
// 56d7.js:41632
return e.ensureCep().jsxNoCheck("ztgl_read_text", []);
// 41634: a = n.sent;
// 41635-41638: try { t(a.text) } catch (i) { t("") }     ← 只读 a.text，异常兜空串
```

```ts
interface ZtglReadTextResult { text: string }   // 无 err / msg（C 级 + 裸字段）
```

【实证】`41636` 是唯一读取点；`41637` 的 `catch` 说明**非法形状靠抛错发现**，不是靠 `err`。

#### 15) `ztgl_create_or_replace` / `ztgl_setFont`（第二处）—— **信封 B**

```js
// 56d7.js:41657
return e.ensureCep().jsxNoCheck("ztgl_create_or_replace", [t]);
// 41660-41664: if (a.code === "OK") {…} else { throw new Error(a.message) }
```

```ts
interface ZtglCodeEnvelope { code: 'OK' | string; message?: string }
```

#### 16) `ys_getForegroundColor` —— A-级（**颜色库**的唯一入口，返回值不是信封）

```js
// 56d7.js:42258
return e.$cep.jsx("ys_getForegroundColor");
// 42261: if (a != null) { … } else { e.$tips.show("添加失败"); return }
// 42267: e.data.addItem(t, a);      ← 注意：整个返回值就是"颜色项"，不是 a.data
```

即：**没有 `{err,msg,data}` 信封**，`null` 表示失败（`42261`），成功时返回颜色库项本体。
它的落库校验是颜色库 `X_` 的 `checkError`：

```js
// 56d7.js:46101
if (!t.isContainKey(i, ["name","color"]) || !t.isObject(i.color) ||
    !t.isContainKey(i.color, ["hex","c","m","y","k"])) { … 删掉该项 … }
```

真实样本（`%APPDATA%\SheJiZhuLi\sj_kuColCB2946E8A25798FE.ini`，只读）：

```json
[{"name":"灰白","show":true,"list":[
  {"name":"未命名","color":{"hex":"302F34","c":81,"m":77,"y":69,"k":46,"isFill":true}},
  {"name":"未命名","color":{"hex":"333333","c":79,"m":74,"y":71,"k":45}}
]}]
```

```ts
/** 依据：56d7.js:42267 整体入组 + 46101 校验 + sj_kuCol*.ini 真实样本 */
interface ColorLibraryItem {
  name: string
  color: { hex: string; c: number; m: number; y: number; k: number; isFill?: boolean }
}
type YsGetForegroundColorResult = ColorLibraryItem | null
```

#### 附：4 个 setter 的返回值**根本没被读**（发后不管）

```js
// 56d7.js:34506  zt_setFontAllCaps
this.$cep.jsx("zt_setFontAllCaps", [this.fontInfo.capitalization == "allCaps"]);
// 34514  zt_setFontVision、34524  zt_setFauxItali、34535  zt_setFontAddBold —— 同样不接返回值
```

【实证】四个调用都**没有 `await`、没有赋值**，`this.$cep.jsx(...)` 的结果被丢弃。
→ 这四个函数的返回结构**对原版无意义**，我方也不需要类型（写 `void` 即可）。

### 2.3 与现有 `src/utils/jsx-result.ts` 的兼容性核查（只读，未改）

`app\src\utils\jsx-result.ts:39` —— `if (!('err' in record)) return { ok: true, data: raw }`。

后果【实证】：信封 B 的失败返回 `{code:"ERROR", message:"…"}` **没有 `err` 键** → 会被判成 `ok: true`，
错误被吞。受影响函数：`ztgl_setFont`（`41601` 那处）、`ztgl_read_text`、`ztgl_create_or_replace`。

这条不是"要不要改 src"的决定，本文只登记事实与行号（`jsx-result.ts:39` 对 `56d7.js:41604`/`41660`）。

### 2.4 68 个函数的机器粗分类（用于排优先级，非逐行核对）

方法：扫全部 482 个分模块文件里每个 `jsx(`/`jsxNoCheck(` 调用点，取返回变量（`X = …sent`）在
调用点后窗口内的 `.字段` 读取，把字段归为「只有信封字段」还是「有 data」。**明确标注：这是机器分类**，
`02-组件`/`11-组件树` 里的 `path/push/readToObject` 这类是窗口里别的变量串进来的噪声，以 §2.2 为准。

**已知两处机器误判（手工核对后纠正，以 §2.2 为准）：**
- `ys_getForegroundColor` 被判成 `C-未消费`，实际它 `42267` 直接 `addItem(t, a)` 把返回值**整体**入组（没有 `.字段` 访问，所以机器看不见）→ 应为 **A 级**（§2.2 第 16 条）；
- `ys_AddStyle` 被算进"有数据"是对的，但**归属于哪个库**机器判不出，必须靠调用链（§2.2 第 3 条）。

| 级别 | 数量 | 函数 |
|---|---|---|
| **B/A 有数据** | 19 | `zt_getFontSimpleInfo` `ztgl_initSystemList` `ys_AddStyle` `ys_getFontInfo` `zt_setFontColor` `zt_getCurrentText` `zt_getCurrentFontInfo` `ys_getGradientInfo` `ztgl_read_text` `overprint_getAllLayers` `overprint_getSelectedLayerByItemIndex` `cy_getPsdForFolder` `doc_openPsdAsDuplicate` `mb_getFolderList` `ps_mbImportPsd` `ps_mbAddPsdSplit` `exportCurrentLayerToImage` `dz_getActionList` `Layer_getTypeNumber` |
| **C 仅外壳**（`err/msg` 或 `code/message`） | 15 | `zt_setHorizontalCenters` `zt_verticalCenter` `zt_setFontSize` `zt_setFontWordSpacing` `layer_font_setFontSize` `layer_font_setLeading` `zt_setFontName` `zt_changeTextBranchMerge` `ys_checkUseFont` `ztgl_create_or_replace` `ztgl_setFont` `overprint_useOverprint` `tb_useOverprint` `ps_mbAddPsd` `zdy_checkMergeRectangles` |
| **C 未消费**（返回值不接 / 只发不读） | 34 | `Fs_*`×6 `File_*`×2 `Sys_setSystemEnvInfo` `Tool_set` `cmm_setLayerColor` `cy_batchOptimizeDoc` `cy_changeStyleColor` `cy_getImagePath` `cy_guideFunction` `cy_openDirectory` `cy_zoom` `f_getScriptEventId` `Layer_onIdSelectLayer` `Layer_placedLayerRelinkToFile` `mb_copyTemplatePsd` `mb_openTemplatePsd` `ps_exportGif` `tb_getOverprintInfo` `tb_openPsdFolder` `tb_setInfoToXmp` `testJsx` `ys_getForegroundColor` `ys_rgbToMyColor` `ys_setForegroundColor` `zdy_checkStatus` `zt_setFontAllCaps` `zt_setFontVision` `zt_setFauxItali` `zt_setFontAddBold` `zt_switchFontDirection` |
| 合计 | **68** | 19 + 15 + 34（人工复核后：B/A 记 20，C-未消费记 33） |

按 T-54 说的"字体面板 30 个 jsx 函数"这个范围，**字体域里有 13 个根本不需要返回结构**：

| 类型 | 函数 | 依据 |
|---|---|---|
| 发后不管（不接返回值） | `zt_setFontAllCaps` `zt_setFontVision` `zt_setFauxItali` `zt_setFontAddBold` | `34506`/`34514`/`34524`/`34535`，无 `await`、无赋值 |
| 只读 `err`/`msg`/`code` | `zt_setFontSize` `zt_setFontWordSpacing` `zt_setHorizontalCenters` `zt_verticalCenter` `zt_setFontName` `zt_changeTextBranchMerge` `ys_checkUseFont` `layer_font_setFontSize` `layer_font_setLeading` | §2.2 第 9~16 条 |

真正需要写类型的是 §2.2 里那 **5 个 A 级 + 4 个 B 级**。

### 2.5 复原方法（可复现）

1. `node tools/08-jsx.cjs`（改路径后）拿到 68 个函数名 + 调用点；
2. 对每个函数名在 `webcrack输出/app/*.js` 里找**全部**调用点，取返回变量（regenerator 里是 `X = e.sent`）；
3. 从调用点往后读**同一方法体**内 `X.field`，逐个记 `文件:行号`；
4. 缺类型的，去同一组件 `data()` 里找**字段默认值**（如 `56d7.js:34101-34120`）；
5. 有真实数据的，去 `%APPDATA%\SheJiZhuLi\` 找样本交叉验证（只读）。

脚本源码见附录 A（`win.cjs` / `kwctx.cjs` / `classify.cjs` / `mapcheck.cjs` / `fs-shim`）。

---

## 3. 解封结论

### 3.1 T-54（30 个 jsx 返回结构 fixture）—— **只能解封一半，明确分两半**

T-54 的判据是**两件事**（`daily/架构日志/债务.md:72`）：① `jsx契约.md` 每个函数有返回结构；② `src/mocks/` 有 fixture。

| 判据 | 能否解封 | 依据 |
|---|---|---|
| ① 返回结构 | **能，已部分做到** | §2.2 已定级 20 个，其中 **5 个 A 级可写类型**（`zt_getFontSimpleInfo`、`ztgl_initSystemList`、`ys_getFontInfo`、`zt_setFontColor`、`ys_getForegroundColor`），4 个 B 级只能列字段，11 个 C 级只有外壳 |
| ② fixture | **不能** | fixture 是"真实取值"，源码只给"字段集合"。`ztgl_initSystemList` 是唯一有真机实测的（`jsx契约.md:14`），其余没有 |

**还差什么，逐条定性：**

| 缺口 | 只能靠真机 | 再多读代码就能得到 |
|---|---|---|
| 剩余 48 个函数（68−20）的返回结构 | — | ✅ 同法可推（§2.5） |
| 字体/样式域"真正需要类型"的 9 个（5 A + 4 B） | — | ✅ 已完成（§2.2） |
| `ztgl_setFont` 到底是 A 信封还是 B 信封 | ✅ **只能真机**（`34051` vs `41601` 两处读法互斥） | — |
| `ztgl_read_text` 失败时返回什么（抛错？`{code}`？） | ✅ 只能真机（`41635` 用 try/catch 兜） | — |
| `size`/`weight`/`leading` 的**取值边界**（"12 pt" 还是 `12`？） | ✅ 只能真机 | — |
| 字体列表 fixture（如 `SysFont2.json` 259 条） | 磁盘上**已有真实产物**（54828 B），不是编造 | — |

**结论**：T-54 应拆成 **T-54a（返回结构：可解封，本次已完成 20/68，该要类型的 9 个已全部给出）** 和
**T-54b（实测 fixture：仍 blocked，等真机）**。合成一条会永远 blocked。

### 3.2 T-55（层级预设云同步）—— **能解封**，卡片写的"缺云服务端契约"不成立

阻塞理由（台账 `:73`）："缺云服务端「按文件上传/下载」契约"。
**实测：这份契约就在 `0425.js` 里**，端点、载荷、返回全都在。

`$sync.pushFile` 实现（`0425.js:3469-3579`）：

```js
// 3493-3510  组装 {addUsn, syncList[], fileData{guid: base64}}
// 3523       checkServeFileSyncStatus(syncList)        → POST "sync/status/check"   (0425.js:3384)
// 3542       uploadOssFile(item, fileData[guid])       → 得到 item.fileUrl          (0425.js:3688)
// 3552       postRequest("sync/file-list/part/add", { list: h })
// 3563-3565  → 返回 { syncInfo: { list, lastSyncTime, usn } }
```

同类端点（全部实测在源码里）：

| 端点 | 方法 | 出处 |
|---|---|---|
| `sync/file-list` | GET | `0425.js:3154`、`3292` |
| `sync/status/check` | POST | `0425.js:3384` |
| `sync/file-list/part/add` | POST | `0425.js:3552` |
| `sync/file-list/all/add` | POST | `0425.js:3658` |
| `sync/file-list/delete` | POST | `0425.js:4089` |
| OSS 分片上传 | POST | `74d8.js:23-24` → `https://syncserver.pszhuli.com/api/sjzl/upload`、`/api/sjzl/mergeChunks` |
| 基址 | — | `56d7.js:51476`（`baseURL = "https://syncserver.pszhuli.com" + "/api/…"`）；`56d7.js:9409` 的 `VUE_APP_BASE_SYNC_SERVER` |

下载侧也在：`pullFile`（`0425.js:3812`）、`pullFileByClientPath`（`3857`）、`pullAllFile`（`3959`）。

**还差什么：**

| 缺口 | 只能靠真机 | 多读代码可得 |
|---|---|---|
| 端点 / 载荷 / 返回结构 | — | ✅ 已复原（上表） |
| 鉴权（`userInfo.mail` + token、`token过期` 重试：`0425.js:3053-3068`） | ✅ 需要真实账号 | — |
| 生产服务端**实际行为**（限流、字段增减） | ✅ 只能真机 | — |
| 线上数据能否被我们用（合规/隔离） | ✅ 需你定 | — |

**结论**：T-55 可以解封到"**契约可写、命令可实现、单测可跑（mock HTTP）**"，
只剩"真连生产服务验证"这一步是真机依赖 —— 这不构成 `blocked`，应改成 `todo` 并拆出"未验"标记。

### 3.3 T-56（动作仓库云端上报）—— **能解封，且与 T-55 是同一封堵点**

台账（`:74`）说"缺服务端协议；`src/cloud/engine.ts` 现有接口不含「文件变更上报」"。
实测：`syncActionWarehouse` / `syncActionItem` **不是**两个独立协议，它们是
`syncChangeFileToServe` 事件的**参数值**，最终全部落到**同一个** `pushFile`：

```js
// 56d7.js:48341  emit("syncChangeFileToServe", "syncActionWarehouse", [n, e], "动作")
// 56d7.js:48347  emit("syncChangeFileToServe", "syncActionItem",      [t],    "动作分组")
// 56d7.js:48351  emit("syncChangeFileToServe", "syncActionWarehouse", [t],    "动作仓库")
//    ↓ 监听：56d7.js:8998  $appBus.on("syncChangeFileToServe", t.syncChangeFileToServe)
//    ↓ 56d7.js:9562       syncChangeFileToServe(t, e, n) → 3 秒防抖
//    ↓ 56d7.js:9587       pushChangeFileToServe(t, e)
//    ↓ 56d7.js:9596       n.$sync.pushFile(t, cb)      ← 与 T-55 完全相同的那条链路
```

也就是说：**T-55 与 T-56 缺的东西一字不差**（`0425.js` 的 `pushFile` 家族）。
"按文件推送"这件事本来就存在——`pushFiles`（`56d7.js:41673-41675`）就是按文件推的。

**结论**：T-56 随 T-55 一起解封；两条台账应合并或明确写"同依赖"。差的东西同 §3.2 末表。

### 3.4 T-57（样式页四类库文件格式）—— **可解封到「外框可实现」，上一版判重了**

台账（`:75`）要求："需要 `%APPDATA%\SheJiZhuLi\sj_kuStoreInfo.ini` 与各一个 `.kuc/.kug/.kuf/.kus`"。
逐项实测：

| 需要的东西 | 现在有没有 | 依据 |
|---|---|---|
| `sj_kuStoreInfo.ini` | ✅ **有**（533 B，已读到全文） | `%APPDATA%\SheJiZhuLi\sj_kuStoreInfo.ini` |
| 四类库文件本体（在用格式） | ✅ **有** | `sj_kuCol*.ini` 41580 B、`sj_kuGra*.ini` 185317 B、`sj_kuFon*.json` 7304 B、`sj_kuSty*.ini` 79 B |
| 导出/导入的**代码入口** | ✅ **有**（见下） | `app.v4.js:54710-54872`；`56d7.js:46740-46910` |
| `.kuc` / `.kug` / `.kuf` / `.kus` 各一个**真实样本** | ❌ 全盘 0 个 | `archive/` + `reference/` + `%APPDATA%` 全搜过 |

**先更正上一版的一句话**：我写过"`.kuc` 系在源码里 0 命中"，那是**按 `.kuc`（带点）搜的，搜法错了**。
按裸词查，四个扩展名都在 `app.v4.js` 里，且每类各有**追加 / 导出**两个入口（`56d7.js:46753-46910` 同一段）：

```js
// app.v4.js:54715 importMenu 内
function n(t, n, a) {                              // t=显示名, n=扩展名, a=库 key
  var i = D.a.openFile("追加" + t, [n], "*." + n); // 打开 *.kuc / *.kug / *.kuf / *.kus
  if (i === false) return e.$tips.show("取消操作");
  var r = e[a].importAdd(i);                       // e.col / e.gradient / e.font / e.style
  e.$tips.show(r ? "追加成功" : "追加失败");
}
// 54756-54774：追加颜色 n("颜色","kuc","col") / 追加渐变 n("渐变","kug","gradient")
//             追加字体 n("字体","kuf","font") / 追加图层样式 n("图层样式","kus","style")

// app.v4.js:54817 exportMenu 内
function n(t, n, a, i) {
  var r = D.a.saveFile("导出预设", [a], t + "-" + n + "." + a, n + "." + a);
  if (r === false) return e.$tips.show("取消操作");
  var s = e[i].export(r);                          // 写出 .kuc/.kug/.kuf/.kus
}
// 54848-54866：导出颜色 n(当前名,"颜色预设","kuc","col") 等四类
// 另：54727/54828 的 .kux = 整个"预设仓库"（e.wh.import / export / exportCurrent）
```

**格式的读写两侧都在源码里**（`e[a]` 就是 §2.2 定过的四个库类）：

| 扩展名 | 写侧 | 写出的内容 | 读侧 |
|---|---|---|---|
| `.kuc` 颜色 | `56d7.js:46134` | `JSON.stringify(this.info)` —— **纯 JSON，无图片** | `46139` → `readToArray` 逐项 push |
| `.kug` 渐变 | `56d7.js:44731` | `[{name, data:base64}]`：第 0 项=库文件，其后 = `getGradientImageFileNameArr()`（`44667`）的渐变预览图 | `44758` |
| `.kuf` 字体 | `56d7.js:46410` | `JSON.stringify(this.info)` —— **纯 JSON，无图片** | `46415` |
| `.kus` 样式 | `56d7.js:45255` | `[{name, data:base64}]`：第 0 项=库文件，其后 = `kuStyle/<组id>.psd` + `kuStyle/<项id>.png`（`45241-45253`） | `45282` |
| `.kux` 仓库 | `56d7.js:45605-45609` | `{ arrFileData:[{name,data:base64}], store:{index,list:[{name,show,color,gradient,font,style}]} }`；`import` 会先清空四个库再整体写入（`45627-45681`） | `45627` / `45683` |

导入侧还有一个必须照做的细节（否则 GUID 撞车）：`importAdd` 用 `getGUID()` **重写文件名**并做全局替换
（`44768-44782`：`n = n.replace(new RegExp(c,"g"), l)`），即导入的库项 id 会被重新分配。

**索引文件全文**（`sj_kuStoreInfo.ini`，533 B）—— 它就是"四类库"的清单：

```json
{"index":0,"list":[
 {"name":"kevin's","show":{"color":true,"gradient":true,"font":true,"style":true},
  "color":"sj_kuColCB2946E8A25798FE.ini",
  "gradient":"sj_kuGra6A784C90B4183F79.ini",
  "font":"sj_kuFon99854AFF9C441520.json",
  "style":"sj_kuStyC1F3475497B91DB2.ini"},
 {"name":"颜色+渐变库-设计助理预设","show":{"color":false,"gradient":true,"font":false,"style":false},
  "color":"sj_kuCol505E432E9FE55A58.ini","gradient":"sj_kuGraBC96482D8B7333F7.ini",
  "font":"sj_kuFon7B254EE2B191AFA7.json","style":"sj_kuStyB6404844AEB0F008.ini"}]}
```

四个库文件的真实结构（与 §2.2 的代码校验一一对上）：

| 库 | 真实样本结构 | 对应校验代码 |
|---|---|---|
| 颜色 | `[{name, show, list:[{name, color:{hex,c,m,y,k,isFill?}}]}]` | `56d7.js:46095`、`46101` |
| 渐变 | `[{name, show, list:[{name, gradient:{…}}]}]` | `56d7.js:44612`、`44618` |
| 字体 | `[{name, show, list:[{name, fonts:[{scriptFamily,weight,fontName,size,horizontalScale,verticalScale,…}]}]}]` | `56d7.js:46187`、`46193` |
| 样式 | `[{name, show, id, list:[{name, id, layerId}]}]`（分组层有样本，**项的样本为空**） | `56d7.js:45056`、`45062` |

`.kuc` 系**就是这四类的导出形态**（同一批 `e.col/e.gradient/e.font/e.style` 的 `export`/`importAdd`），
不再是"另一套格式"——上一版那个"扩展名对不上"的疑问由 `app.v4.js:54756-54866` 解开。

**结论（分层）：**

| 部分 | 判定 | 理由 |
|---|---|---|
| `sj_kuStoreInfo.ini` 格式 | **已复原** | 真实样本 + 代码校验 |
| `.kuc`（颜色）/ `.kuf`（字体） | **已复原到可实现** | 就是库 JSON 本体（`46134`/`46410`），样本齐全 |
| `.kug`（渐变）/ `.kus`（样式） | **已复原到可实现** | 外层容器 `[{name,data:base64}]` + 内层库 JSON；只有内嵌图（预览图/PSD）是二进制 |
| 导入时 GUID 重写规则 | **已复原** | `44768-44782` |
| 内层"渐变"库项、样式库项的载荷字段 | **仍缺** | 样本里 `list` 为空 / 只到分组层；面板侧不读这些字段（原样回传 jsx） |
| 真实 `.kuc~.kus` 文件样本 | **仍缺**（但不阻塞实现） | 只影响回归比对：可以用"导出→导入"自洽验证，不必等真机 |

**重评 T-57：从"无任何依据"→"契约与读写两侧都已定位，可写导入导出"。**
仍缺的只有**内层载荷字段**（渐变的 `gradient{}` 内部、样式项的效果字段）和一份真实样本做比对，
而这两样都属于"必须真机导一次"的东西——但**外框、文件名、GUID 规则、校验规则已经够了**。

所以 T-57 的正确状态：**可从 `blocked` 降为 `todo`（外框实现 + mock 样本可行）**，
剩一条子项"内层载荷字段待真机导出的样本"单独标 `UNVERIFIED`。
台账 `:75` 那句"需要 `sj_kuStoreInfo.ini` 与各一个 `.kuc/...`"里，前者**已经有了**，后者只用于比对。

### 3.5 汇总

| 条目 | 能否解封 | 解封到什么程度 | 最大障碍 | 性质 |
|---|---|---|---|---|
| **T-54** | 一半 | 20/68 函数已定级（5 个可写类型 / 4 个可列字段 / 11 个只有外壳 / 4 个发后不管） | 无 fixture、`ztgl_*` 信封判定互斥 | 结构=多读代码；fixture=**真机** |
| **T-55** | ✅ 能 | 端点/载荷/返回全复原，可实现+可 mock 单测 | 鉴权与生产服务行为 | 只剩**真机**验证 |
| **T-56** | ✅ 能 | 同 T-55（同一链路 `pushFile`） | 同上 | 只剩**真机**验证 |
| **T-57** | ✅ 能（外框） | 四类文件的外层/内层/导入导出/GUID 规则全复原，可实现 | 内层载荷字段与真实样本 | 外框=多读代码；载荷=**真机** |

**最大障碍（一句话）**：不是逆向产物不够，而是**"源码能给字段、给不了取值"**——
凡是要"真机跑一次才知道"的部分（信封互斥、取值边界、样式项/渐变项的内层载荷），读多少代码都补不上；
反过来，凡是被判 ⛔ 的脚本、被说"缺契约"的云同步、被说"无依据"的 `.kuc` 系格式，
其实**都在 `archive\源码还原\` 里躺着**。

---

## 附录 A：探针脚本（复现用，均只读）

### A.1 `fs-shim/index.js`（唯一"改"过的东西：只重写路径参数）

```js
const fs = require('fs');
const MAP_FROM = '03-源码还原';
const MAP_TO = 'D:/稿定设计助理-存档/archive/源码还原';
const SPEC_FROM = 'BUILD-SPEC';
const SPEC_TO = process.env.PROBE_OUT + '/BUILD-SPEC';

function remap(p) {
  if (typeof p !== 'string') return p;
  const j = p.indexOf(SPEC_FROM);
  if (j >= 0) return SPEC_TO + p.slice(j + SPEC_FROM.length);
  const i = p.indexOf(MAP_FROM);
  if (i >= 0) return MAP_TO + p.slice(i + MAP_FROM.length);
  return p;
}
const wrap = (fn) => function (p, ...r) { return fn.call(this, remap(p), ...r); };
const m = {}; Object.assign(m, fs);
for (const k of ['readFileSync','writeFileSync','appendFileSync','mkdirSync','existsSync',
                 'statSync','readdirSync','rmSync','unlinkSync','createWriteStream','copyFileSync'])
  if (typeof fs[k] === 'function') m[k] = wrap(fs[k]);
module.exports = m;
```

用法：把脚本源码里的 `require('fs')` 换成该垫片路径，产物写 `%TEMP%`。

### A.2 `win.cjs`（打印行号窗口，本次所有引用的来源）

```js
const fs = require('fs'), path = require('path');
const DIR = 'D:/稿定设计助理-存档/archive/源码还原/webcrack输出/app';
const [file, start, end] = [process.argv[2], +process.argv[3], +process.argv[4]];
const s = fs.readFileSync(path.join(DIR, file), 'utf8').split('\n');
for (let i = start; i <= Math.min(end, s.length); i++)
  console.log(String(i).padStart(6) + '| ' + s[i - 1]);
```

### A.3 `kwctx.cjs`（关键词 + 行号 + 上下文）

```js
const fs = require('fs');
const dir = 'D:/稿定设计助理-存档/archive/源码还原/webcrack输出/app';
const kw = process.argv[2];
const files = process.argv[3] ? [process.argv[3]]
  : fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'deobfuscated.js');
for (const f of files) {
  const s = fs.readFileSync(dir + '/' + f, 'utf8');
  let i = -1;
  while ((i = s.indexOf(kw, i + 1)) >= 0) {
    const ln = s.slice(0, i).split('\n').length;
    const ctx = s.slice(Math.max(0, i - 70), i + 70).replace(/\n/g, '⏎');
    console.log(f + ':' + ln + '  …' + ctx + '…');
  }
}
```

---

## 附录 B：本文未做的事（边界声明）

- 没有改 `tools/README.md`（也没替你决定改不改，事实与行号见 §1.2）。
- 没有改 `docs/生成/库文件格式契约.md`、`docs/页面/*`、`daily/架构日志/债务.md`、`docs/状态/进度.md`。
- 没有改 `src/`、`tests/`、`scripts/`、`package.json`；`reference/` 与 `archive/` 全程只读。
- 没有跑 build / deploy / install / `14-sprite.cjs`；没有做任何 git 操作。
- 没有在 PS 里跑任何 jsx —— 因此本文**没有新增一条"实测返回"**；唯一实测记录仍来自
  `jsx契约.md:14`（2026-10-20，`ztgl_initSystemList` = 数组）。
