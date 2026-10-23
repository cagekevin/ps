# 模板 · anon_app.v4_L4700

> 来源：`app.v4.js` render 函数 `a`（行 4660）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="base-check f-baseX" @click>
  <svg class="icon" @click>
    <use @click />
  </svg>
  <div @click />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "base-check f-baseX",
        on: {
          click: t.clickHandle
        }
      }, [t.value ? n("svg", {
        staticClass: "icon",
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
          "xlink:href": "#icongouxuankuang"
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      })]) : n("div", {
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.clickHandle.apply(null, arguments);
          }
        }
      }), t._t("default")], 2);
    }
```