# 模板 · lib-layout

> 来源：`app.v4.js` render 函数 `ec`（行 23610）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="lib-layout f-baseY">
  <div class="top-banner" />
  <div class="top-switch f-baseX">
    <div class="f-space" />
    <div class="relative guide-one-menu oldguide-one-menu">
      <Icon class="f-size16 ml5 menu-icon" :class="{ active: t.menuActive, disabled: t.disabled }" type="menu" />
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
        staticClass: "lib-layout f-baseY"
      }, [t.$scopedSlots.banner ? n("div", {
        staticClass: "top-banner"
      }, [t._t("banner")], 2) : t._e(), n("div", {
        staticClass: "top-switch f-baseX"
      }, [t._t("nav"), n("div", {
        staticClass: "f-space"
      }), n("div", {
        staticClass: "relative guide-one-menu oldguide-one-menu"
      }, [n("Icon", {
        staticClass: "f-size16 ml5 menu-icon",
        class: {
          active: t.menuActive,
          disabled: t.disabled
        },
        attrs: {
          type: "menu",
          title: "菜单"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.dropOpen();
          }
        }
      }), t._t("menu")], 2)], 2), t._t("default")], 2);
    }
```