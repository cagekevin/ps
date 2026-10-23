# 模板 · anon_app.v4_L50012

> 来源：`app.v4.js` render 函数 `DC`（行 49887）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="export-wrap" @mousedown>
  <div class="describe f-baseX" v-show="showInfo != null">
    <div class="app-padding">
      <p class="mb5" />
      <p class="f-size12">
        #
      </p>
      <div class="f-baseX mt2">
        <p class="f-size12">
          C
        </p>
        <p class="ml5 f-size12">
          M
        </p>
        <p class="ml5 f-size12">
          Y
        </p>
        <p class="ml5 f-size12">
          K
        </p>
      </div>
    </div>
  </div>
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
      }, [n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.showInfo != null,
          expression: "showInfo != null"
        }],
        ref: "describe",
        staticClass: "describe f-baseX"
      }, [t.showInfo != null ? n("div", {
        staticClass: "app-padding"
      }, [t.showInfo.name != "未命名" ? n("p", {
        staticClass: "mb5"
      }, [t._v(t._s(t.showInfo.name))]) : t._e(), n("p", {
        staticClass: "f-size12"
      }, [t._v("#" + t._s(t.showInfo.color.hex))]), n("div", {
        staticClass: "f-baseX mt2"
      }, [n("p", {
        staticClass: "f-size12"
      }, [t._v("C" + t._s(t.showInfo.color.c))]), n("p", {
        staticClass: "ml5 f-size12"
      }, [t._v("M" + t._s(t.showInfo.color.m))]), n("p", {
        staticClass: "ml5 f-size12"
      }, [t._v("Y" + t._s(t.showInfo.color.y))]), n("p", {
        staticClass: "ml5 f-size12"
      }, [t._v("K" + t._s(t.showInfo.color.k))])])]) : t._e()]), typeof t.data.info != "undefined" ? n("div", {
        attrs: {
          title: "按住ctrl拖拽位置"
        }
      }, t._l(t.data.info, function (e, a) {
        return n("div", {
          key: "ys-color" + a,
          staticClass: "app-padding app-padding-wrap mb4 drag-color-wrap",
          on: {
            mousedown: function (e) {
              return t.dragColorWrap(a, ".drag-color-wrap", ".Style-vueScroll");
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
              return t.setGroupShowStatus(e, a);
            }
          }
        }, [n("div", {
          staticClass: "f-baseX f-br",
          attrs: {
            title: "shift+点击设置描边，alt+点击更改颜色，按住ctrl拖拽位置"
          }
        }, [t._l(e.list, function (e, i) {
          return n("div", {
            key: "ys-color1" + i,
            staticClass: "color-block mt6 drag-color",
            style: {
              backgroundColor: "#" + e.color.hex
            },
            on: {
              click: function (n) {
                return t.useColor(e.color, a, i);
              },
              contextmenu: function (e) {
                e.preventDefault();
                e.stopPropagation();
                return t.showItemMenu(e, a, i);
              },
              mouseenter: function (e) {
                return t.moveBlock(a, i, e);
              },
              mouseleave: function (e) {
                t.showInfo = null;
              },
              mousedown: function (e) {
                e.stopPropagation();
                return t.drag(a, i, ".drag-color");
              },
              mousemove: function (e) {
                return t.drop(a, i);
              }
            }
          });
        }), n("div", {
          staticClass: "add-svg f-center mt6",
          attrs: {
            title: "添加当前前景色"
          },
          on: {
            click: function (e) {
              return t.addColor(a);
            }
          }
        }, [n("baseSvg", {
          staticClass: "svg-14",
          attrs: {
            name: "#iconchuangjian"
          },
          on: {
            handle: function (e) {
              return t.addColor(a);
            }
          }
        })], 1)], 2)])], 1);
      }), 0) : t._e()]);
    }
```