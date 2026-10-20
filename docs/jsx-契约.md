# jsx 契约（实测记录）

> `BUILD-SPEC/06-jsx契约.md` 只有**调用侧参数**，没有返回结构。
> 这份文档记录**实测过的真实返回**，写新页面前先查这里，别猜。
>
> **规矩**：任何新函数，先在 PS 里跑一次，把结果记到这里 + 存 fixture，再写类型。
> 已经因为猜返回结构返工过 3 次。

## 一、已实测

| 函数 | 参数 | 返回 | 实测日期 | fixture |
|---|---|---|---|---|
| `Sys_setSystemEnvInfo` | `(json: string)` 环境变量 JSON | 无有效返回，调用成功即可 | 2026-10-20 | — |
| `ztgl_initSystemList` | 无 | **字体数组**（见下），不是 `"ok"` | 2026-10-20 | `src/mocks/fonts.json`（磁盘缓存形态） |
| `ztgl_setFont` | `(postScriptName, name, weight)` 三个字符串 | 无有效返回 | 2026-10-20 | — |
| `Layer_isSelectLayer` | 无 | 布尔 | 2026-10-20 | — |
| `Layer_getTypeNumber` | 无 | 数字（语义**未确认**，暂未使用） | 2026-10-20 | — |

### ztgl_initSystemList 的真实返回

```json
[{
  "family": "Noto Color Emoji SVG",
  "weights": ["Regular"],
  "names": ["Noto Color Emoji SVG"],
  "postScriptNames": ["NotoColorEmoji-SVG"]
}]
```

共 259 条。四个字段是**等长数组**，同索引对应一个字重。

**注意：磁盘缓存 `%APPDATA%\SheJiZhuLi\SysFont2.json` 是另一套键名**

```json
{ "length": 259, "arr": [{ "name": "...", "zz": [...], "mz": [...], "hjm": [...], "show": false }] }
```

映射关系：`family↔name`、`weights↔zz`、`names↔mz`、`postScriptNames↔hjm`。
`normalizeFont()` 负责统一，**不要在两套键名之间来回猜**。

## 二、未实测（用之前必须验）

| 函数 | 已知调用形态 | 待确认 |
|---|---|---|
| `dz_*`（动作页） | 见 `BUILD-SPEC/06-jsx契约.md` | 全部 |
| `ztgl_read_text` | 无参 | 返回文本内容？格式？ |
| `ztgl_create_or_replace` | `(t)` | 参数含义、返回 |
| `File_copy` / `Fs_*` | 文件路径 | 返回值、错误形态 |
| `ps_onJsx` | `('{"f":..,"arr":..}')` | 撤销组机制，是否需要 |

## 三、怎么实测

现在**没有探针页**，只能临时改代码 + 看控制台：

```ts
// 临时加在 src/cep/ps.ts
const raw = await evalScriptRaw('(function(){try{return JSON.stringify(XXX())}catch(e){return "ERR:"+e.message}})()')
console.log(raw)
```

抓到结果后：

1. 存一份到 `src/mocks/`
2. 更新 `src/cep/types.ts`
3. 在上表加一行

> 探针页 `#/__probe` 是已知欠债，见 `docs/进度.md`。做完之后这一节改成"打开探针页，粘贴调用，点保存"。

## 四、调用约定

- 参数拼接走 `jsxCall()`，字符串用单引号、对象转 JSON 再包单引号
- 异常统一 `ERR:<message>` 前缀回传，`jsxCall` 转成 `CepError`
- `$.evalFile` 必须是**顶层语句**，包进 IIFE 会导致函数定义落在局部作用域
- 大返回值（> 100KB）不要走 `evalScript` 字符串回传，写临时文件再用 Node 读
