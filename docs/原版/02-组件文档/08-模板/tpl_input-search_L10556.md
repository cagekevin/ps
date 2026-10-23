# 模板 · input-search

> 来源：`56d7.js` render 函数 `ei`（行 10556）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="list-bottom">
  <Dropdown>
    <span class="dropdown-btn" :class="{ disabled: t.disabled } }">
      <Icon type="descending" />
      排序
    </span>
    <Menu class="sort-menu" />
  </Dropdown>
  <ZoomInOut @change />
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
    staticClass: "list-bottom"
  }, [n("Dropdown", {
    attrs: {
      trigger: ["click"]
    }
  }, [n("span", {
    staticClass: "dropdown-btn",
    class: {
      disabled: t.disabled
    }
  }, [n("Icon", {
    attrs: {
      type: "descending"
    }
  }), t._v(" 排序 ")], 1), n("Menu", {
    staticClass: "sort-menu",
    attrs: {
      slot: "overlay"
    },
    slot: "overlay"
  }, t._l(t.sortOptions, function (e) {
    return n("MenuItem", {
      key: e.value,
      class: ["sort-menu-item", {
        disabled: t.disabled
      }, {
        "sort-menu-item--selected": t.sort === e.value
      }],
      nativeOn: {
        click: function (n) {
          n.stopPropagation();
          return t.handleSort({
            sort: e.value
          });
        }
      }
    }, [t._v(" " + t._s(e.name) + " ")]);
  }), 1)], 1), n("ZoomInOut", {
    attrs: {
      disabled: t.disabled,
      columns: t.columns
    },
    on: {
      change: t.handleColumnChange
    }
  })], 1);
}
```