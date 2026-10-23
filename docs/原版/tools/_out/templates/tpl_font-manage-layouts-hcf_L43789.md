# 模板 · font-manage-layouts-hcf

> 来源：`app.v4.js` render 函数 `Ng`（行 43789）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<HCF />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("HCF", {
        scopedSlots: t._u([{
          key: "header",
          fn: function (e) {
            var a = e.toggleDrawer;
            var i = e.openModal;
            var r = e.openDialog;
            return [n("UserFontHeader", {
              on: {
                "toggle-filter-panel": function (e) {
                  return t.toggleFilterPanel(a);
                },
                "unset-current-font": function (e) {
                  return t.unsetCurrentFont(i);
                },
                "remove-user-tag": function (e) {
                  return t.removeUserTag(e, r);
                },
                "rename-user-tag": function (e) {
                  return t.renameUserTag(e, r);
                }
              }
            })];
          }
        }, {
          key: "content",
          fn: function (e) {
            var a = e.openModal;
            return [n("UserFontContent", {
              attrs: {
                openModal: a
              },
              on: {
                "set-current-font": function (e) {
                  return t.setCurrentFont(e, a);
                },
                "select-font": t.selectFont
              }
            })];
          }
        }, {
          key: "footer",
          fn: function () {
            return [n("UserFontFooter")];
          },
          proxy: true
        }, {
          key: "modal",
          fn: function (e) {
            var a = e.openDialog;
            var i = e.closeModal;
            return [n("UserFontModal", {
              attrs: {
                "current-font": t.currentFont,
                "close-modal": i
              },
              on: {
                "remove-user-tag": function (e) {
                  return t.removeUserTag(e, a);
                },
                "cancel-add-user-tag": function (e) {
                  return t.cancelAddUserTag(i);
                }
              }
            })];
          }
        }, {
          key: "drawer",
          fn: function () {
            return [n("UserFontDrawer")];
          },
          proxy: true
        }, {
          key: "dialog",
          fn: function (e) {
            var a = e.closeDialog;
            var i = e.context;
            return [n("UserFontDialog", {
              attrs: {
                type: i
              },
              on: {
                "confirm-remove": function (e) {
                  return t.confirmRemoveUserTag(a);
                },
                "cancel-remove": function (e) {
                  return t.cancelRemoveUserTag(a);
                },
                "confirm-rename": function (e) {
                  var n = e.value;
                  return t.confirmRenameUserTag(n, a);
                },
                "cancel-rename": function (e) {
                  return t.cancelRenameUserTag(a);
                }
              }
            })];
          }
        }])
      });
    }
```