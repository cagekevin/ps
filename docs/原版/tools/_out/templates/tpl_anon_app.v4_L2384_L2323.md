# 模板 · anon_app.v4_L2384

> 来源：`app.v4.js` render 函数 `qt`（行 2323）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="base-icon f-center" @click :style="{ width: t.width, height: t.height }">
  <svg class="icon" @click :style="{ width: t.svgWidth, height: t.svgWidth }">
    <use @click />
  </svg>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "base-icon f-center",
        class: [t.select ? "select" : ""],
        style: {
          width: t.width,
          height: t.height
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          },
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.menu.apply(null, arguments);
          }
        }
      }, [n("svg", {
        staticClass: "icon",
        class: [t.svgClass],
        style: {
          width: t.svgWidth,
          height: t.svgWidth
        },
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
            return t.menu.apply(null, arguments);
          }
        }
      }, [n("use", {
        attrs: {
          "xlink:href": t.name
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          },
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.menu.apply(null, arguments);
          }
        }
      })]), t._t("default")], 2);
    }
```