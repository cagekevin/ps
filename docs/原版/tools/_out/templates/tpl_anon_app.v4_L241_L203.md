# 模板 · anon_app.v4_L241

> 来源：`app.v4.js` render 函数 `a`（行 203）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<svg class="icon" @click>
  <use @click />
</svg>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("svg", {
        staticClass: "icon",
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
      })]);
    }
```