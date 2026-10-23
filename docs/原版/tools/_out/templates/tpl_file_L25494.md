# 模板 · file

> 来源：`app.v4.js` render 函数 `Hc`（行 25494）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="file_number" :style="{ right: 0 - t.scrollLeft + "px" } }" />
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "file_number",
        style: {
          right: 0 - t.scrollLeft + "px"
        }
      }, t._l(t.numberList, function (e, a) {
        return n("div", {
          key: "fileNumber" + a,
          staticClass: "file_number_line"
        }, [n("div", {
          staticClass: "file_number_item"
        }, [t._v(" " + t._s(e) + " ")]), n("div", {
          staticClass: "file_number_block"
        })]);
      }), 0);
    }
```