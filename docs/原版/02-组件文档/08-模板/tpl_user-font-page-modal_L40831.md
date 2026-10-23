# 模板 · user-font-page-modal

> 来源：`56d7.js` render 函数 `Gk`（行 40831）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__filter-panel" />
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
    staticClass: "font-manage__filter-panel"
  }, t._l(t.tagCategories, function (e, a) {
    return n("div", {
      key: a,
      class: ["font-manage__filter-panel--" + a]
    }, [n("div", {
      staticClass: "font-manage__filter-panel__category"
    }, [t._v(t._s(e.name))]), n("TagGroup", {
      attrs: {
        tags: e.tags
      },
      on: {
        "toggle-tag": t.toggleTagFilter
      },
      scopedSlots: t._u([e.extraTag ? {
        key: "extra-tag",
        fn: function () {
          return [n("Tag", {
            attrs: {
              tag: {
                id: 0,
                name: "全部",
                selected: false
              }
            },
            on: {
              "toggle-tag": function (e) {
                return t.cleanCategoryFilter(a);
              }
            }
          })];
        },
        proxy: true
      } : null], null, true)
    })], 1);
  }), 0);
}
```