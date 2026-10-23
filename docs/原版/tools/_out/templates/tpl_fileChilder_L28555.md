# 模板 · fileChilder

> 来源：`app.v4.js` render 函数 `Iu`（行 28555）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="file-childer-wrap" />
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
        staticClass: "file-childer-wrap"
      }, t._l(t.forData, function (e, a) {
        var i;
        return n("div", {
          key: "mb-folderChilder" + a,
          staticClass: "cursor",
          class: t.$store.state.notAllowed ? "notAllowed" : ""
        }, [n("div", {
          staticClass: "f-baseX mousehover",
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.select(a, e);
            }
          }
        }, [n("div", {
          style: {
            width: t.index * 20 - 20 + "px"
          }
        }), n("div", {
          staticClass: "folder_dropdown cursor"
        }, [n("span", {
          staticClass: "folder_arrow-wrapper",
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.setShowChildren(e);
            }
          }
        }, [n("GIcon", {
          staticClass: "folder_arrow",
          attrs: {
            type: e.showChildren ? "dropdown_open" : "dropdown"
          }
        })], 1), a !== t.forData.length - 1 && e.showChildren ? n("div", {
          staticClass: "folder_dropdown_line",
          style: {
            height: t.getFolderLineLength(e)
          }
        }) : t._e()]), n("div", {
          staticClass: "folder_right-body",
          class: {
            "folder_right-body_high-light": t.selectId === e.id || t.selectId && t.selectId.includes(e.id)
          }
        }, [n("GIcon", {
          staticClass: "folder_right-body_icon",
          class: (i = {}, i["svgColor" + e.iconColor] = e.icon, i),
          style: {
            fontSize: e.icon ? "18px" : "16px"
          },
          attrs: {
            type: e.icon ? "icon-test" + e.icon : e.showChildren ? "folder_open" : "folder"
          }
        }), n("p", {
          staticClass: "folder_right-body_name f-space ml10 cursor size overflow-text",
          class: [t.$store.state.notAllowed ? "notAllowed" : ""],
          style: {
            marginLeft: e.icon ? "5px" : ""
          }
        }, [t._v(" " + t._s(e.name) + " ")]), n("GIcon", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: Array.isArray(t.selectId) && t.selectId.includes(e.id),
            expression: "Array.isArray(selectId) && selectId.includes(site.id)"
          }],
          attrs: {
            type: "check_outline"
          }
        })], 1)]), e.children.length > 0 ? n("fileChilder", t._g({
          directives: [{
            name: "show",
            rawName: "v-show",
            value: e.showChildren,
            expression: "site.showChildren"
          }],
          staticClass: "fileChilder",
          attrs: {
            selectId: t.selectId,
            index: t.index + 1,
            num: t.num == null ? a : t.num + "-" + a,
            forData: e.children
          }
        }, t.$listeners)) : t._e()], 1);
      }), 0);
    }
```