# 模板 · anon_app.v4_L11405

> 来源：`app.v4.js` render 函数 `Bt`（行 11271）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<BuyReminderDialog @close />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("BuyReminderDialog", {
        attrs: {
          features: t.features,
          remainDay: t.trailOverdueDays,
          isTrialMember: t.isTrialMember,
          getAccessToken: t.getAccessToken,
          umsHost: t.umsHost,
          pszhuliHost: t.pszhuliHost,
          userService: t.userService
        },
        on: {
          close: t.handleClose
        },
        scopedSlots: t._u([{
          key: "default",
          fn: function (t) {
            var e = t.feature;
            return [n("Icon", {
              attrs: {
                type: e.icon
              }
            })];
          }
        }])
      });
    }
```