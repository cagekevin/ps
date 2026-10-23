# 模板 · anon_app.v4_L26198

> 来源：`app.v4.js` render 函数 `jl`（行 26172）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="score-v2 f-baseX" />
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
        staticClass: "score-v2 f-baseX"
      }, t._l(t.num, function (e, a) {
        return n("div", {
          key: a,
          staticClass: "score-svg-wrap f-center f-full"
        }, [n("Icon", {
          staticClass: "score-icon",
          class: [a < t.select ? "selected" : ""],
          attrs: {
            type: "star_fill"
          },
          nativeOn: {
            click: function (e) {
              e.stopPropagation();
              return t.change(a);
            }
          }
        })], 1);
      }), 0);
    }
```