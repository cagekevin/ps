# 模板 · font-manage

> 来源：`app.v4.js` render 函数 `sg`（行 43462）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <TabLayout class="font-manage" />
  <DTS @confirm />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", [n("TabLayout", {
        staticClass: "font-manage",
        attrs: {
          tabs: t.tabs
        },
        scopedSlots: t._u([{
          key: "menu",
          fn: function (e) {
            var a = e.closeMenu;
            return [n("FontManageMenu", {
              on: {
                "close-menu": a,
                "set-option-type": t.setOptionType
              }
            })];
          }
        }])
      }), n("DTS", {
        attrs: {
          "operate-type": t.operateType
        },
        on: {
          confirm: t.confirm,
          cancel: t.cancel
        }
      })], 1);
    }
```