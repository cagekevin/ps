# 模板 · anon_app.v4_L11405

> 来源：`app.v4.js` render 函数 `Ut`（行 11341）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="cep-modal" @click :class="{ "has-offset": t.hasOffset, "no-mask": !t.mask }">
  <div class="cep-modal-content" @click :class="{ "has-offset": t.hasOffset }">
    <div class="cep-modal-header f-baseX">
      <span class="f-size13" />
      <Icon class="clear-icon" type="clear_outline" />
    </div>
    <div class="cep-modal-body" />
    <div class="cep-modal-footer">
      <GButton class="cep-modal-btn" @click />
      <GButton class="cep-modal-btn cep-modal-btn-confirm" @click type="primary">
      </GButton>
    </div>
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
        staticClass: "cep-modal",
        class: {
          "has-offset": t.hasOffset,
          "no-mask": !t.mask
        },
        on: {
          click: t.handleMaskClick
        }
      }, [n("div", {
        staticClass: "cep-modal-content",
        class: {
          "has-offset": t.hasOffset
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.handleModalContentClick.apply(null, arguments);
          }
        }
      }, [t._t("header", function () {
        return [n("div", {
          staticClass: "cep-modal-header f-baseX"
        }, [n("span", {
          staticClass: "f-size13"
        }, [t._v(t._s(t.title))]), t.closable ? n("Icon", {
          staticClass: "clear-icon",
          attrs: {
            type: "clear_outline"
          },
          nativeOn: {
            click: function (e) {
              return t.cancel.apply(null, arguments);
            }
          }
        }) : t._e()], 1)];
      }), n("div", {
        staticClass: "cep-modal-body"
      }, [t._t("default")], 2), t.footer ? n("div", {
        staticClass: "cep-modal-footer"
      }, [n("GButton", {
        staticClass: "cep-modal-btn",
        on: {
          click: t.cancel
        }
      }, [t._v(t._s(t.cancelText))]), n("GButton", {
        staticClass: "cep-modal-btn cep-modal-btn-confirm",
        attrs: {
          type: "primary",
          loading: t.confirmLoading
        },
        on: {
          click: t.ok
        }
      }, [t._v(" " + t._s(t.okText) + " ")])], 1) : t._e()], 2)]);
    }
```