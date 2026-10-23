# 模板 · fileChilder

> 来源：`app.v4.js` render 函数 `Mc`（行 24745）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="file-childer-wrap" @click />
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
      return n("div", {
        staticClass: "file-childer-wrap",
        on: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }, t._l(t.forData, function (e, a) {
        return n("div", {
          key: "mb-fileChilder" + a,
          staticClass: "f-full",
          class: t.$store.state.notAllowed ? "notAllowed" : "",
          attrs: {
            title: "按住Ctrl+点击拖拽顺序"
          }
        }, [n("div", {
          staticClass: "folder f-baseX f-full",
          class: [t.mouseIndex == a ? "selectHover" : ""],
          on: {
            contextmenu: function (n) {
              n.preventDefault();
              n.stopPropagation();
              return t.showMenu(n, e, a);
            },
            mousemove: function (e) {
              return t.mousemoveIndexFun(e, a);
            },
            mouseout: function (e) {
              t.mouseIndex = null;
            },
            mousedown: function (e) {
              e.stopPropagation();
              return t.drag(e, a);
            }
          }
        }, [n("div", {
          staticClass: "f-full",
          style: {
            width: t.index * 20 - 10 + "px"
          }
        }), n("div", {
          staticClass: "folder_dropdown cursor",
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.setShowChildren(e);
            }
          }
        }, [n("GIcon", {
          staticStyle: {
            "font-size": "12px"
          },
          attrs: {
            type: e.showChildren ? "dropdown_open" : "dropdown"
          }
        }), a !== t.forData.length - 1 && e.showChildren ? n("div", {
          staticClass: "folder_dropdown_line",
          style: {
            height: t.getFolderLineLength(e)
          }
        }) : t._e()], 1), n("div", {
          staticClass: "folder_right-body",
          class: {
            "folder_right-body_high-light": t.data.folderId === e.id && e.id !== t.$temp.renameFolderId
          }
        }, [t.$temp.renameFolderId === e.id ? n("div", {
          staticClass: "folder_right-body_info",
          style: {
            width: t.getHighLightWidth(t.index)
          },
          on: {
            click: function (t) {
              t.stopPropagation();
            }
          }
        }, [n("GInput", {
          ref: "folderInput",
          refInFor: true,
          attrs: {
            value: t.edit.value,
            placeholder: "请输入新名称"
          },
          on: {
            change: t.changeEditInput,
            pressEnter: function (e) {
              return t.confirmRenameFolder("enter");
            },
            blur: function (e) {
              return t.confirmRenameFolder("blur");
            }
          }
        })], 1) : n("div", {
          staticClass: "folder_right-body_info cursor",
          style: {
            width: t.data.folderId === e.id ? t.getHighLightWidth(t.index) : "100%"
          },
          on: {
            click: function (n) {
              return t.select(a, e);
            }
          }
        }, [n("div", {
          staticClass: "folder_right-body_info_icon-container",
          on: {
            menu: function (n) {
              return t.showMenu(n, e, a);
            }
          }
        }, [n("GIcon", {
          class: ["svgColor" + e.iconColor],
          style: {
            fontSize: e.icon ? "18px" : "16px"
          },
          attrs: {
            type: e.icon ? "icon-test" + e.icon : e.showChildren ? "folder_open" : "folder"
          }
        })], 1), n("div", {
          staticClass: "folder_right-body_info_name f-space size",
          class: [t.$store.state.notAllowed ? "notAllowed" : ""]
        }, [t._v(" " + t._s(e.name) + " ")])])])]), t.edit.state === 2 && t.$temp.newFolderParentsId === e.id ? n("div", {
          staticClass: "folder f-baseX f-full"
        }, [n("div", {
          staticClass: "f-full",
          style: {
            width: (t.index + 1) * 20 - 10 + "px"
          }
        }), n("div", {
          staticClass: "folder_dropdown"
        }, [n("GIcon", {
          staticStyle: {
            "font-size": "12px"
          },
          attrs: {
            type: "dropdown"
          }
        })], 1), n("div", {
          staticClass: "folder_right-body"
        }, [n("div", {
          staticClass: "folder_right-body_info",
          style: {
            width: "calc(" + t.getHighLightWidth(t.index) + " - 12px)"
          },
          on: {
            click: function (t) {
              t.stopPropagation();
            }
          }
        }, [n("GInput", {
          ref: "folderInput",
          refInFor: true,
          attrs: {
            placeholder: "请输入文件夹名称"
          },
          on: {
            pressEnter: function (e) {
              return t.confirmAddFolder("enter");
            },
            blur: function (e) {
              return t.confirmAddFolder("blur");
            }
          },
          model: {
            value: t.edit.value,
            callback: function (e) {
              t.$set(t.edit, "value", e);
            },
            expression: "edit.value"
          }
        })], 1)])]) : t._e(), e.children.length > 0 ? n("fileChilder", t._g({
          directives: [{
            name: "show",
            rawName: "v-show",
            value: e.showChildren,
            expression: "site.showChildren"
          }],
          staticClass: "fileChilder",
          attrs: {
            fileNumber: t.fileNumber,
            index: t.index + 1,
            num: t.num == null ? a : t.num + "-" + a,
            forData: e.children,
            besideScrollInfo: t.besideScrollInfo
          }
        }, t.$listeners)) : t._e()], 1);
      }), 0);
    }
```