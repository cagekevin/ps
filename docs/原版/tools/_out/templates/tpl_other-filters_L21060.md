# 模板 · other-filters

> 来源：`app.v4.js` render 函数 `Fs`（行 21060）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<FilterPopover class="filter">
  <div class="overlay-content">
    <dl class="list-container">
      <dt class="list-title">
        颜色
      </dt>
      <div class="color-list" />
    </dl>
    <dl class="list-container">
      <dt class="list-title">
        版式
      </dt>
      <div class="format-list" />
    </dl>
  </div>
</FilterPopover>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 2 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("FilterPopover", {
        staticClass: "filter",
        attrs: {
          selectedNum: t.selectedNum
        }
      }, [n("div", {
        staticClass: "overlay-content"
      }, [n("dl", {
        staticClass: "list-container"
      }, [n("dt", {
        staticClass: "list-title"
      }, [t._v("颜色")]), n("div", {
        staticClass: "color-list"
      }, t._l(t.colorOptions, function (e) {
        return n("dd", {
          key: e.value,
          staticClass: "color-item-wrapper",
          on: {
            click: function (n) {
              return t.filterColor({
                colors: e.value,
                name: e.name
              });
            }
          }
        }, [e.value ? n("i", {
          class: ["color-item", {
            "color-item-selected": t.colors === e.value
          }],
          style: {
            backgroundColor: e.color
          }
        }) : n("img", {
          class: ["color-item", {
            "color-item-selected": t.colors === e.value
          }],
          attrs: {
            src: "https://gd-filems.dancf.com/saas/6khzgo/40317/c1bdc2ca-c2bc-436c-937f-1165a231c79918382217.png"
          }
        })]);
      }), 0)]), n("dl", {
        staticClass: "list-container"
      }, [n("dt", {
        staticClass: "list-title"
      }, [t._v("版式")]), n("div", {
        staticClass: "format-list"
      }, t._l(t.formatOptions, function (e) {
        return n("dd", {
          key: e.value,
          staticClass: "format-option-item"
        }, [n("SelectButton", {
          staticClass: "format-button",
          attrs: {
            selected: t.ratios === e.value
          },
          nativeOn: {
            click: function (n) {
              return t.filterFormat({
                ratios: e.value,
                name: e.name
              });
            }
          }
        }, [t._v(" " + t._s(e.name) + " ")])], 1);
      }), 0)])])]);
    }
```