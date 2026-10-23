# 模板 · anon_app.v4_L384

> 来源：`app.v4.js` render 函数 `s`（行 278）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="menu_cancel-area" @click v-show="showMenu" />
  <div class="menu" v-show="showMenu" :style="{ left: t.x, top: t.y } }" />
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
      return n("div", [n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.showMenu,
          expression: "showMenu"
        }],
        staticClass: "menu_cancel-area",
        on: {
          click: function (e) {
            return t.hide();
          },
          contextmenu: function (e) {
            return t.hide();
          }
        }
      }), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.showMenu,
          expression: "showMenu"
        }],
        staticClass: "menu",
        style: {
          left: t.x,
          top: t.y
        }
      }, t._l(t.data, function (e, a) {
        return n("div", {
          key: "com-menu" + a,
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }, [e.text == "fg" ? n("hr", {
          staticClass: "menu-hr"
        }) : n("div", {
          staticClass: "menu-item f-baseX",
          class: [typeof e.class != "undefined" ? e.class : ""],
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }, [e.select == 1 ? n("div", {
          staticClass: "menu-select",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }) : t._e(), e.svg ? n("div", {
          staticClass: "f-center menu-svg",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }, [n("svg", {
          staticClass: "icon",
          class: [typeof e.svgClass != "undefined" ? e.svgClass : ""],
          attrs: {
            "aria-hidden": "true"
          },
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }, [n("use", {
          attrs: {
            "xlink:href": e.svg
          },
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        })])]) : t._e(), n("p", {
          staticClass: "menu-text",
          class: [t.showIcon ? "mr6" : ""],
          staticStyle: {
            "white-space": "nowrap"
          },
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.handle(a, e);
            }
          }
        }, [t._v(" " + t._s(e.text) + " ")])])]);
      }), 0)]);
    }
```