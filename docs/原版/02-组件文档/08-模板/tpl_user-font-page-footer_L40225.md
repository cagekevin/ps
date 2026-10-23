# 模板 · user-font-page-footer

> 来源：`56d7.js` render 函数 `mk`（行 40225）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__tag-manage">
  <TagLinker />
  <TagCreator />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    ref: "tag-manage",
    staticClass: "font-manage__tag-manage"
  }, [t.showFontLinker ? [n("TagLinker", {
    attrs: {
      font: t.font,
      "user-tags": t.userTags,
      groups: t.groups
    },
    on: {
      "add-user-tag": t.addUserTag,
      "filter-by-user-tag": t.filterByUserTag,
      "remove-user-tag-from-font": t.removeUserTagFromFont,
      "add-user-tag-to-font": t.addUserTagToFont,
      "remove-user-tag": t.removeUserTag,
      "rename-user-tag": t.renameUserTag
    }
  })] : [n("TagCreator", {
    on: {
      "add-user-tag": t.addUserTag,
      "cancel-add-user-tag": t.cancelAddUserTag
    }
  })]], 2);
}
```