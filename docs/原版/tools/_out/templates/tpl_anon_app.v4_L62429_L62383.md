# 模板 · anon_app.v4_L62429

> 来源：`app.v4.js` render 函数 `hT`（行 62383）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="open-more-mian f-baseX app-padding" @click>
    <p class="mr8 open-more-text" @click />
    <div class=" f-space" @click />
    <svg class="icon svg-10 mr4" @click>
      <use />
    </svg>
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
        staticClass: "open-more-mian f-baseX app-padding",
        on: {
          click: t.clickHandle
        }
      }, [n("p", {
        staticClass: "mr8 open-more-text",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }, [t._v(t._s(t.text))]), t._t("tip"), n("div", {
        staticClass: " f-space",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }), n("svg", {
        staticClass: "icon svg-10 mr4",
        class: [t.value ? "" : "close"],
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
        }
      })])], 2), t.value ? t._t("default") : t._e()], 2);
    }
```