# 模板 · anon_app.v4_L50604

> 来源：`app.v4.js` render 函数 `qC`（行 50495）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="export-wrap" @mousedown>
  <div />
</div>
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
      return n("div", {
        staticClass: "export-wrap",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [typeof t.data.info != "undefined" ? n("div", {
        attrs: {
          title: "按住ctrl拖拽位置"
        }
      }, t._l(t.data.info, function (e, a) {
        return n("div", {
          key: "ys-gradients" + a,
          staticClass: "app-padding mb4 drag-gradients-wrap",
          on: {
            mousedown: function (e) {
              return t.dragColorWrap(a, ".drag-gradients-wrap", ".Style-vueScroll");
            },
            mousemove: function (e) {
              return t.dragColorWrapDrop(a);
            }
          }
        }, [n("baseGroup", {
          attrs: {
            text: e.name,
            value: e.show
          },
          on: {
            menu: function (e) {
              return t.showGroupMenu(e, a);
            },
            change: function (e) {
              return t.setGroupShow(e, a);
            }
          }
        }, [n("div", {
          staticClass: "f-baseX f-br"
        }, [t._l(e.list, function (e, i) {
          return n("div", {
            key: "ys-gradients1" + i,
            staticClass: "drag-gradients",
            on: {
              mousedown: function (e) {
                e.stopPropagation();
                return t.drag(a, i, ".drag-gradients");
              },
              mousemove: function (e) {
                return t.drop(a, i);
              },
              click: function (n) {
                return t.useGradients(e);
              },
              contextmenu: function (e) {
                e.preventDefault();
                e.stopPropagation();
                return t.showItemMenu(e, a, i);
              }
            }
          }, [typeof e.gradient.fileName != "undefined" ? n("img", {
            staticClass: "color-block color-block-img mt5",
            attrs: {
              src: t.isMac + t.imgPath + e.gradient.fileName
            }
          }) : n("div", {
            staticClass: "color-block mt5",
            style: {
              backgroundImage: "linear-gradient(" + t.testArr[a][i] + ")"
            }
          })]);
        }), n("div", {
          staticClass: "f-center add mt5",
          attrs: {
            title: "添加渐变色，仅支持形状图层"
          },
          on: {
            click: function (e) {
              return t.addGradients(a);
            }
          }
        }, [n("svg", {
          staticClass: "icon cursor",
          attrs: {
            "aria-hidden": "true"
          },
          on: {
            click: [t.addPopup, function (e) {
              e.stopPropagation();
              return t.addGradients(a);
            }]
          }
        }, [n("use", {
          attrs: {
            "xlink:href": "#iconchuangjian"
          },
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.addGradients(a);
            }
          }
        })])])], 2)])], 1);
      }), 0) : t._e()]);
    }
```