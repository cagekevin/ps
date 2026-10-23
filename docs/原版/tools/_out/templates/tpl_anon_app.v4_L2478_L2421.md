# 模板 · anon_app.v4_L2478

> 来源：`app.v4.js` render 函数 `ee`（行 2421）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="open-more-mian" @click>
    <p class="mr8" @click>
    </p>
    <svg class="icon svg-9" @click>
      <use @click />
    </svg>
    <p class="ml8" @click />
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
        staticClass: "open-more-mian",
        class: [t.align == "rightCenter" ? "f-center" : "f-baseX"],
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }, [t.align != "left" ? n("p", {
        staticClass: "mr8",
        class: [t.align == "center" ? "f-space" : ""],
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }, [t._v(" " + t._s(t.text) + " ")]) : t._e(), n("svg", {
        staticClass: "icon svg-9",
        class: [t.value ? "" : "close", t.svgClass],
        attrs: {
          "aria-hidden": "true"
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#iconzhankaizhedie"
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      })]), t.align == "left" ? n("p", {
        staticClass: "ml8",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }, [t._v(t._s(t.text))]) : t._e()]), t.value ? t._t("default") : t._e()], 2);
    }
```