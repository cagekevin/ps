# 模板 · lib-layout

> 来源：`56d7.js` render 函数 `oc`（行 15735）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="nav" />
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
    staticClass: "nav"
  }, t._l(t.navList, function (e) {
    return n("div", {
      key: e.index,
      staticClass: "switch-text f-center",
      class: {
        switchSelect: t.switchIndex == e.index,
        disabled: t.disabled
      },
      attrs: {
        title: e.title
      },
      on: {
        click: function (n) {
          return t.setSwitchIndex(e.index);
        }
      }
    }, [t._v(" " + t._s(e.name) + " ")]);
  }), 0);
}
```