# 模板 · activate-modal

> 来源：`56d7.js` render 函数 `WO`（行 54058）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<CepModal />
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
    return n("CepModal", t._b({
      attrs: {
        title: "支付确认",
        "confirm-loading": t.confirmLoading,
        okText: "已完成支付",
        maskClosable: false
      },
      on: {
        ok: t.ok,
        cancel: t.close
      }
    }, "CepModal", t.$attrs, false), [n("div", {
      staticClass: "confirm-pay-modal_content"
    }, [t._v("请在新开网页中完成支付")])]);
  } else {
    return t._e();
  }
}
```