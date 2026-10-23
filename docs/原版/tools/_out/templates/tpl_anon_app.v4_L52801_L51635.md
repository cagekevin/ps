# 模板 · anon_app.v4_L52801

> 来源：`app.v4.js` render 函数 `f_`（行 51635）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<basePopup @close>
  <p class="col-black">
    提取的颜色
  </p>
  <div class="w100 theme-mt-row f-base" />
  <div class="w100 theme-mt-row">
    <button class="btn-2 mb0 theme-btn" @click>
      保存到颜色
    </button>
    <button class="btn-2 mr0 mb0 second-btn" @click>
      保存到色板
    </button>
  </div>
  <hr class="popup-hr" />
  <p class="col-black">
    提取的渐变色
  </p>
  <div class="w100 theme-mt-row f-base" />
  <button class="btn-1 theme-mt-row theme-btn" @click>
    保存渐变
  </button>
</basePopup>
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
      return n("basePopup", {
        on: {
          close: t.close
        }
      }, [n("p", {
        staticClass: "col-black"
      }, [t._v("提取的颜色")]), n("div", {
        staticClass: "w100 theme-mt-row f-base"
      }, t._l(t.arrCol, function (e, a) {
        return n("div", {
          key: "ys-ImgColor" + a,
          staticClass: "color-item",
          style: {
            background: e
          },
          attrs: {
            title: "左键应用，右键删除"
          },
          on: {
            click: function (e) {
              return t.setColor(a);
            },
            contextmenu: function (e) {
              e.preventDefault();
              e.stopPropagation();
              return t.deleteColor(a);
            }
          }
        });
      }), 0), n("div", {
        staticClass: "w100 theme-mt-row"
      }, [n("button", {
        staticClass: "btn-2 mb0 theme-btn",
        on: {
          click: function (e) {
            return t.saveColor();
          }
        }
      }, [t._v("保存到颜色")]), n("button", {
        staticClass: "btn-2 mr0 mb0 second-btn",
        on: {
          click: function (e) {
            return t.saveSeban();
          }
        }
      }, [t._v("保存到色板")])]), n("hr", {
        staticClass: "popup-hr"
      }), n("p", {
        staticClass: "col-black"
      }, [t._v("提取的渐变色")]), n("div", {
        staticClass: "w100 theme-mt-row f-base"
      }, t._l(t.grads, function (e, a) {
        return n("div", {
          key: "ys-ImgColor" + a,
          staticClass: "grad-item",
          style: t.grads[a],
          attrs: {
            title: "左键应用，右键删除"
          },
          on: {
            click: function (e) {
              return t.setGrad(a);
            },
            contextmenu: function (e) {
              e.preventDefault();
              e.stopPropagation();
              return t.deleteGran(a);
            }
          }
        });
      }), 0), n("button", {
        staticClass: "btn-1 theme-mt-row theme-btn",
        on: {
          click: function (e) {
            return t.saveGrad();
          }
        }
      }, [t._v("保存渐变")])]);
    }
```