# 模板 · anon_app.v4_L26249

> 来源：`app.v4.js` render 函数 `Dl`（行 26225）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<button class="button-label-wrap f-center" @click>
  <div class="btn_tag_text" />
  <Icon class="icon" type="clear_outline" />
</button>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("button", {
        staticClass: "button-label-wrap f-center",
        on: {
          click: t.add
        }
      }, [n("div", {
        staticClass: "btn_tag_text"
      }, [t._t("default")], 2), t.isRemoveType ? n("Icon", {
        staticClass: "icon",
        attrs: {
          type: "clear_outline"
        },
        nativeOn: {
          click: function (e) {
            return t.remove.apply(null, arguments);
          }
        }
      }) : t._e()], 1);
    }
```