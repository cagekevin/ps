# 模板 · anon_app.v4_L11405

> 来源：`app.v4.js` render 函数 `Vt`（行 11302）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<CepModal @ok>
  <div class="buy-reminder-dialog-body">
    <div class="title-text" />
    <div class="title-text mb10" />
    <div class="fucntion_item">
      <div class="item_right">
        <div class="item_label" />
        <div class="item_decr" />
      </div>
    </div>
  </div>
</CepModal>
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
      return n("CepModal", {
        attrs: {
          maskClosable: false,
          okText: t.isTrialMember ? "立即升级会员" : "立即续费",
          cancelText: t.isTrialMember ? "继续试用" : "下次再说"
        },
        on: {
          ok: t.jumpToBuy,
          cancel: t.handleClose
        }
      }, [n("div", {
        staticClass: "buy-reminder-dialog-body",
        staticStyle: {
          width: "230px"
        }
      }, [n("div", {
        staticClass: "title-text"
      }, [t._v(t._s(t.isTrialMember ? "试用期" : "会员") + "仅剩" + t._s(t.remainDay) + "天")]), n("div", {
        staticClass: "title-text mb10"
      }, [t._v(t._s(t.isTrialMember ? "加入会员" : "立即续费") + "，即可享受")]), t._l(t.features, function (e) {
        return n("div", {
          key: e.icon,
          staticClass: "fucntion_item"
        }, [t._t("default", null, {
          feature: e
        }), n("div", {
          staticClass: "item_right"
        }, [n("div", {
          staticClass: "item_label"
        }, [t._v(t._s(e.label))]), n("div", {
          staticClass: "item_decr"
        }, [t._v(t._s(e.decr))])])], 2);
      })], 2)]);
    }
```