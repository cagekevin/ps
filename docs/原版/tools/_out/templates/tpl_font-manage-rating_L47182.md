# 模板 · font-manage-rating

> 来源：`app.v4.js` render 函数 `nx`（行 47182）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__rating" />
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
        staticClass: "font-manage__rating"
      }, t._l(t.nums, function (e) {
        return n("div", {
          key: e,
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.rating(e);
            },
            mouseenter: function (n) {
              return t.enter(e);
            },
            mouseleave: function (n) {
              return t.leave(e);
            }
          }
        }, [n("Icon", {
          class: {
            "font-manage__rating__icon--active": e <= t.score
          },
          attrs: {
            type: e <= t.score ? "star_fill" : "star"
          }
        })], 1);
      }), 0);
    }
```