# 模板 · font-manage-tag-input

> 来源：`app.v4.js` render 函数 `Fk`（行 48351）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__tag-linker">
  <div class="font-manage__tag-linker__header">
    标签
  </div>
  <TagInput />
  <div class="font-manage__tag-linker__font">
    <div>
      已添加的标签(
    </div>
    <TagGroup />
  </div>
  <div>
    <div>
      全部(
    </div>
    <TagGroup />
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
        staticClass: "font-manage__tag-linker"
      }, [n("div", {
        staticClass: "font-manage__tag-linker__header"
      }, [t._v(" 标签 ")]), n("TagInput", {
        on: {
          "add-user-tag": t.addUserTag
        }
      }), n("div", {
        staticClass: "font-manage__tag-linker__font"
      }, [n("div", [t._v("已添加的标签(" + t._s(t.tags.length) + ")")]), n("TagGroup", {
        attrs: {
          tags: t.tags,
          closable: true,
          selectable: false
        },
        on: {
          "toggle-tag": t.toggleFontTag,
          "close-tag": t.removeUserTagFromFont
        }
      })], 1), n("div", [n("div", [t._v("全部(" + t._s(t.userTags.length) + ")")]), n("TagGroup", {
        attrs: {
          tags: t.userTags,
          "has-context-menu": true,
          selectable: false
        },
        on: {
          "toggle-tag": t.toggleTag,
          "open-context-menu": t.pinTag,
          "close-context-menu": t.unpinTag
        },
        scopedSlots: t._u([{
          key: "default",
          fn: function (e) {
            var a = e.closeContextMenu;
            return [n("UserTagOverlay", {
              attrs: {
                "close-overlay": a
              },
              on: {
                "remove-tag": t.removeTag,
                "rename-tag": t.renameTag
              }
            })];
          }
        }])
      })], 1)], 1);
    }
```