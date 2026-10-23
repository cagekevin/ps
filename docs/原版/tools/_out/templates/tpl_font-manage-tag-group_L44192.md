# 模板 · font-manage-tag-group

> 来源：`app.v4.js` render 函数 `sb`（行 44192）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__tag-group">
  <div class="font-manage__tag-group__container">
    <Tag />
  </div>
  <div class="font-manage__tag-group__context-menu" :style="{ top: t.top, left: t.left, opacity: t.opacity } }" />
</div>
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
        ref: "tag-group",
        staticClass: "font-manage__tag-group"
      }, [n("div", {
        staticClass: "font-manage__tag-group__container"
      }, [t._t("extra-tag"), t._l(t.tags, function (e, a) {
        return n("Tag", {
          key: (e.category || "") + "" + e.id,
          attrs: {
            tag: e,
            closable: t.closable,
            selectable: t.selectable
          },
          on: {
            "open-context-menu": function (e) {
              return t.openContextMenu(e, a);
            },
            "toggle-tag": function (e) {
              return t.toggleTag(e, a);
            },
            "close-tag": function (e) {
              return t.closeTag(e, a);
            }
          }
        });
      })], 2), t.hasContextMenu && t.showContextMenu ? n("div", {
        ref: "context-menu",
        staticClass: "font-manage__tag-group__context-menu",
        style: {
          top: t.top,
          left: t.left,
          opacity: t.opacity
        }
      }, [t._t("default", null, {
        closeContextMenu: t.closeContextMenu
      })], 2) : t._e()]);
    }
```