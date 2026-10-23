# 模板 · anon_app.v4_L29758

> 来源：`app.v4.js` render 函数 `Qh`（行 29682）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="app-padding mt5 show_sub_folder_box" @contextmenu>
  <div>
    <Myvuescroll class="sub_folder_list" :class="{ "max-heihgt160": t.data.folderInfo.children && t.data.folderInfo.children.leng" />
    <div class="more_subFolder" @click>
      <span />
      <GIcon :class="{ rotate_180deg: t.isOpenMoreFolder }" type="down" />
    </div>
  </div>
</div>
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
        staticClass: "app-padding mt5 show_sub_folder_box",
        on: {
          contextmenu: function (t) {
            t.stopPropagation();
            t.preventDefault();
          }
        }
      }, [n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.data.folderInfo && t.data.folderInfo.children && t.data.folderInfo.children.length > 0 && t.data.showType == -1,
          expression: "data.folderInfo && data.folderInfo.children && data.folderInfo.children.length > 0 && data.showType == -1"
        }]
      }, [n("Myvuescroll", {
        staticClass: "sub_folder_list",
        class: {
          "max-heihgt160": t.data.folderInfo.children && t.data.folderInfo.children.length > 4 && t.isOpenMoreFolder
        }
      }, t._l(t.data.folderInfo.children, function (e, a) {
        return n("div", {
          key: "mb-childerFol" + a,
          staticClass: "sub_folder_item",
          class: {
            percent25: t.columnNum > 2
          },
          on: {
            click: function (n) {
              return t.openFolder(e);
            }
          }
        }, [n("div", {
          staticClass: "folder_img_box"
        }, [n("div", {
          staticClass: "folder_img"
        }, [n("div", {
          staticClass: "bg_area"
        }), n("img", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: t.getFolderShowImg(e),
            expression: "getFolderShowImg(item)"
          }],
          attrs: {
            src: t.getFolderShowImg(e),
            alt: ""
          }
        })])]), n("div", {
          staticClass: "mt6 folder_info",
          attrs: {
            title: e.name + "(" + e.number + ")"
          }
        }, [n("span", [t._v(t._s(e.name))]), n("span", [t._v("(" + t._s(e.number) + ")")])])]);
      }), 0), t.data.folderInfo.children && t.data.folderInfo.children.length > 4 ? n("div", {
        staticClass: "more_subFolder",
        on: {
          click: function (e) {
            t.isOpenMoreFolder = !t.isOpenMoreFolder;
          }
        }
      }, [n("span", [t._v(t._s(t.isOpenMoreFolder ? "收起" : "更多"))]), n("GIcon", {
        class: {
          rotate_180deg: t.isOpenMoreFolder
        },
        attrs: {
          type: "down"
        }
      })], 1) : t._e()], 1)]);
    }
```