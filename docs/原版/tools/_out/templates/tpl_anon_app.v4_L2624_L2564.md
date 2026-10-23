# 模板 · anon_app.v4_L2624

> 来源：`app.v4.js` render 函数 `fe`（行 2564）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="base-group-mian f-baseX" @click>
    <svg class="icon svg-9" @click>
      <use @contextmenu />
    </svg>
    <p class="ml8" @click>
    </p>
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
        staticClass: "base-group-mian f-baseX",
        on: {
          click: t.clickHandle,
          contextmenu: function (e) {
            e.preventDefault();
            return t.contextmenu(e);
          }
        }
      }, [n("svg", {
        staticClass: "icon svg-9",
        class: [t.value ? "" : "close"],
        attrs: {
          "aria-hidden": "true"
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          },
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.contextmenu(e);
          }
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#iconzhankaizhedie"
        },
        on: {
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.contextmenu(e);
          }
        }
      })]), n("p", {
        staticClass: "ml8",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          },
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.contextmenu(e);
          }
        }
      }, [t._v(" " + t._s(t.text) + " ")]), t._t("header")], 2), t.value ? t._t("default") : t._e()], 2);
    }
```