# 模板 · other-filters

> 来源：`app.v4.js` render 函数 `js`（行 21131）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Popover />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("Popover", t._g(t._b({
        attrs: {
          trigger: ["click"],
          arrowPointAtCenter: true,
          placement: "bottomRight"
        },
        scopedSlots: t._u([{
          key: "content",
          fn: function () {
            return [t._t("default")];
          },
          proxy: true
        }], null, true)
      }, "Popover", t.$attrs, false), t.$listeners), [n("button", {
        staticClass: "button",
        class: {
          disabled: t.disabled
        }
      }, [n("Icon", {
        staticClass: "icon-filter",
        attrs: {
          type: "filter"
        }
      }), t.selectedNum ? n("sup", {
        staticClass: "selected-num-container"
      }, [n("span", {
        staticClass: "selected-num"
      }, [t._v(t._s(t.selectedNum))])]) : t._e()], 1)]);
    }
```