# 模板 · font-menu

> 来源：`56d7.js` render 函数 `Bg`（行 35960）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__layouts__hcf">
  <div class="font-manage__layouts__hcf__header" />
  <div class="font-manage__layouts__hcf__content" />
  <div class="font-manage__layouts__hcf__footer" />
  <div class="font-manage__layouts__hcf__modal" />
  <div class="font-manage__layout__hcf__drawer">
    <div />
  </div>
  <div />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "font-manage__layouts__hcf"
  }, [n("div", {
    staticClass: "font-manage__layouts__hcf__header"
  }, [t._t("header", null, {
    toggleDrawer: t.toggleDrawer,
    openModal: t.openModal,
    openDialog: t.openDialog,
    context: t.context
  })], 2), n("div", {
    staticClass: "font-manage__layouts__hcf__content"
  }, [t._t("content", null, {
    openModal: t.openModal,
    context: t.context
  })], 2), n("div", {
    staticClass: "font-manage__layouts__hcf__footer"
  }, [t._t("footer")], 2), t.showModal ? n("div", {
    ref: "modal",
    staticClass: "font-manage__layouts__hcf__modal"
  }, [t._t("modal", null, {
    openDialog: t.openDialog,
    closeModal: t.closeModal,
    context: t.context
  })], 2) : t._e(), t.showDrawer ? n("div", {
    ref: "drawer",
    staticClass: "font-manage__layout__hcf__drawer"
  }, [n("div", [t._t("drawer")], 2)]) : t._e(), t.showDialog ? n("div", {
    ref: "dialog"
  }, [t._t("dialog", null, {
    openDialog: t.openDialog,
    closeDialog: t.closeDialog,
    context: t.context
  })], 2) : t._e()]);
}
```