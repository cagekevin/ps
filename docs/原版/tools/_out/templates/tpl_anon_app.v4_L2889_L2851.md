# 模板 · anon_app.v4_L2889

> 来源：`app.v4.js` render 函数 `Ne`（行 2851）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="base-dropdown-menu f-baseX" @click :style="{ padding: "0px " + t.padding, height: t.height }">
    <p class="f-space overflow-text" @click />
    <baseSvg class="f-full" @handle />
  </div>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "w100"
      }, [n("div", {
        staticClass: "base-dropdown-menu f-baseX",
        class: [t.whiteTheme ? "white-theme" : "", t.dark ? "bdm-drak" : ""],
        style: {
          padding: "0px " + t.padding,
          height: t.height
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.handle.apply(null, arguments);
          }
        }
      }, [n("p", {
        staticClass: "f-space overflow-text",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.handle.apply(null, arguments);
          }
        }
      }, [t._v(t._s(t.text))]), n("baseSvg", {
        staticClass: "f-full",
        attrs: {
          name: "#iconzhankaizhedie"
        },
        on: {
          handle: t.handle
        }
      })], 1)]);
    }
```