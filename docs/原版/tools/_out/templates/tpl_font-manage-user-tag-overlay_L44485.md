# 模板 · font-manage-user-tag-overlay

> 来源：`app.v4.js` render 函数 `Tb`（行 44485）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__user-tag-filter">
  <div class="font-manage__user-tag-filter__header">
    <span>
      我的标签
    </span>
    <div>
      <Icon type="plus" />
      <span @click>
        <Icon type="chevron_down" />
      </span>
    </div>
  </div>
  <div class="font-manage__user-tag-filter__body" :class="{ "font-manage__user-tag-filter-hidden": t.show && !t.open } }">
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
        staticClass: "font-manage__user-tag-filter"
      }, [n("div", {
        staticClass: "font-manage__user-tag-filter__header"
      }, [n("span", [t._v("我的标签")]), n("div", [n("Icon", {
        attrs: {
          type: "plus"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.toggleTagManage.apply(null, arguments);
          }
        }
      }), t.show ? n("span", {
        class: [t.open ? "font-manage__user-tag-filter--open" : "font-manage__user-tag-filter--close"],
        on: {
          click: t.toggleUserTagContainer
        }
      }, [n("Icon", {
        attrs: {
          type: "chevron_down"
        }
      })], 1) : t._e()], 1)]), n("div", {
        ref: "user-tags",
        staticClass: "font-manage__user-tag-filter__body",
        class: {
          "font-manage__user-tag-filter-hidden": t.show && !t.open
        }
      }, [n("TagGroup", {
        attrs: {
          tags: t.tags,
          "has-context-menu": true
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
      })], 1)]);
    }
```