# 模板 · anon_app.v4_L63565

> 来源：`app.v4.js` render 函数 `sI`（行 63490）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="cep-message__mask" @click>
  <div class="cep-message__dialog">
    <svg class="cep-message__close" @click>
      <path />
    </svg>
    <div class="cep-message__title">
      <svg class="cep-message__title__exclamation-icon">
        <path />
      </svg>
    </div>
    <div class="gap" />
    <div class="cep-message__content" />
    <div class="gap" />
    <div class="cep-message__btns">
      <div class="cep-message__btn cancel-btn" @click>
      </div>
      <div class="cep-message__btn confirm-btn" @click>
      </div>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      if (t.visible) {
        return n("div", {
          staticClass: "cep-message__mask",
          class: t.mask ? "show-mask" : "",
          style: t.maskStyle,
          on: {
            click: t.clickMask
          }
        }, [n("div", {
          staticClass: "cep-message__dialog",
          style: t.dialogStyle
        }, [t.closable ? n("svg", {
          staticClass: "cep-message__close",
          attrs: {
            width: "8",
            height: "8",
            viewBox: "0 0 8 8",
            fill: "#B3B3B3",
            xmlns: "http://www.w3.org/2000/svg"
          },
          on: {
            click: t.cancel
          }
        }, [n("path", {
          attrs: {
            d: "M5 4L8 7L7 8L4 5L1 8L0 7L3 4L0 1L1 0L4 3L7 0L8 1L5 4Z"
          }
        })]) : t._e(), n("div", {
          staticClass: "cep-message__title"
        }, [t.exclamation ? n("svg", {
          staticClass: "cep-message__title__exclamation-icon",
          attrs: {
            width: "16",
            height: "16",
            fill: "#fff",
            xmlns: "http://www.w3.org/2000/svg"
          }
        }, [n("path", {
          attrs: {
            d: "M11.382 2.747A6.557 6.557 0 008 1.834a6.527 6.527 0 00-3.365.913 6.561 6.561 0 00-2.388 2.388A6.527 6.527 0 001.334 8.5c0 1.207.304 2.33.913 3.366a6.438 6.438 0 002.372 2.387A6.557 6.557 0 008 15.167a6.557 6.557 0 003.382-.914 6.32 6.32 0 002.371-2.371 6.557 6.557 0 00.914-3.382 6.557 6.557 0 00-.914-3.381 6.319 6.319 0 00-2.371-2.372zM8 6.5a.667.667 0 110-1.333A.667.667 0 018 6.5zm.667.667v4h.667v.667H6.667v-.667h.667V7.834h-.667v-.667h2z"
          }
        })]) : t._e(), t._v(" " + t._s(t.title) + " ")]), n("div", {
          staticClass: "gap",
          staticStyle: {
            height: "17px"
          }
        }), n("div", {
          staticClass: "cep-message__content"
        }, [t._v(t._s(t.content))]), n("div", {
          staticClass: "gap",
          staticStyle: {
            height: "28px"
          }
        }), n("div", {
          staticClass: "cep-message__btns"
        }, [t.cancelBtnText ? n("div", {
          staticClass: "cep-message__btn cancel-btn",
          on: {
            click: t.cancel
          }
        }, [t._v(" " + t._s(t.cancelBtnText) + " ")]) : t._e(), t.confirmBtnText ? n("div", {
          staticClass: "cep-message__btn confirm-btn",
          on: {
            click: t.confirm
          }
        }, [t._v(" " + t._s(t.confirmBtnText) + " ")]) : t._e()])])]);
      } else {
        return t._e();
      }
    }
```