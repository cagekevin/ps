# 模板 · anon_app.v4_L11405

> 来源：`app.v4.js` render 函数 `Vt`（行 2200）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="vue-scroll" @mouseenter />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        ref: "vueScroll",
        staticClass: "vue-scroll",
        class: [t.only, {
          "scroll-disabled": t.scrollDisabled
        }],
        on: {
          mouseenter: t.moveFun,
          mouseleave: t.leaveFun,
          mousewheel: function (e) {
            return t.test(e);
          },
          scroll: t.handlerBesideScroll
        }
      }, [t._t("default")], 2);
    }
```