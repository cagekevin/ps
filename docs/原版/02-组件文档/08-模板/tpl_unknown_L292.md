# 模板 · unknown

> 来源：`4360.js` render 函数 `w`（行 292）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="cep-idea-popup__mask" @click>
  <div class="cep-idea-popup__dialog" @click>
    <div class="cep-idea-popup__img">
      <img :src="t.image" />
    </div>
    <div class="cep-idea-popup__panel">
      <div class="cep-idea-popup__title">
      </div>
      <div class="gap" />
      <div class="cep-idea-popup__content" />
      <div class="gap" />
      <div class="cep-idea-popup__btns">
        <div class="cep-idea-popup__btn cancel-btn" @click>
        </div>
        <div class="cep-idea-popup__btn confirm-btn" @click>
        </div>
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
      staticClass: "cep-idea-popup__mask",
      class: t.mask ? "show-mask" : "",
      style: t.maskStyle,
      on: {
        click: t.clickMask
      }
    }, [n("div", {
      staticClass: "cep-idea-popup__dialog",
      style: t.dialogStyle,
      on: {
        click: function (t) {
          t.stopPropagation();
        }
      }
    }, [n("div", {
      staticClass: "cep-idea-popup__img"
    }, [n("img", {
      attrs: {
        src: t.image
      }
    })]), n("div", {
      staticClass: "cep-idea-popup__panel"
    }, [n("div", {
      staticClass: "cep-idea-popup__title"
    }, [t._v(" " + t._s(t.title) + " ")]), n("div", {
      staticClass: "gap",
      staticStyle: {
        height: "4px"
      }
    }), n("div", {
      staticClass: "cep-idea-popup__content"
    }, [t._v(t._s(t.content))]), t.cancelBtnText || t.confirmBtnText ? n("div", {
      staticClass: "gap",
      staticStyle: {
        height: "24px"
      }
    }) : t._e(), n("div", {
      staticClass: "cep-idea-popup__btns"
    }, [t.cancelBtnText ? n("div", {
      staticClass: "cep-idea-popup__btn cancel-btn",
      style: t.cancelBtnStyle,
      on: {
        click: t.cancel
      }
    }, [t._v(" " + t._s(t.cancelBtnText) + " ")]) : t._e(), t.confirmBtnText ? n("div", {
      staticClass: "cep-idea-popup__btn confirm-btn",
      style: t.confirmBtnStyle,
      on: {
        click: t.confirm
      }
    }, [t._v(" " + t._s(t.confirmBtnText) + " ")]) : t._e()])])])]);
  } else {
    return t._e();
  }
}
```