# 模板 · VirtualLayoutWF

> 来源：`app.v4.js` render 函数 `Zs`（行 21524）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div />
  <BackTop class="back-top">
    <span class="back-top-icon">
      <Icon type="thin_up" />
    </span>
  </BackTop>
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
        ref: "outer",
        class: t.$style.virtual,
        style: t.outerStyle,
        on: {
          "&scroll": function (e) {
            return t.onScroll.apply(null, arguments);
          }
        }
      }, [t._t("other"), n("div", {
        ref: "inner",
        class: t.$style.container,
        style: t.containerStyle
      }, t._l(t.displayItems, function (e) {
        var a;
        return n("div", {
          key: t.getItemOnlyKey(e),
          class: (a = {}, a[t.$style["cell-container"]] = true, a.materialActive = e.data.materialActive, a),
          style: t.getComputedStyle(e)
        }, [t._t("cell", null, {
          item: e.data
        })], 2);
      }), 0), t._t("bottom"), t.isNeedBackTop ? n("BackTop", {
        staticClass: "back-top",
        attrs: {
          target: t.getBackTopTarget
        }
      }, [n("span", {
        staticClass: "back-top-icon"
      }, [n("Icon", {
        attrs: {
          type: "thin_up"
        }
      })], 1)]) : t._e()], 2);
    }
```