# 模板 · font-manage-tag-input

> 来源：`app.v4.js` render 函数 `fk`（行 48139）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<TagManage />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("TagManage", {
        attrs: {
          font: t.currentFont,
          "user-tags": t.userTags,
          groups: t.groups
        },
        on: {
          "add-user-tag": t.addUserTag,
          "add-user-tag-to-font": t.addUserTagToFont,
          "filter-by-user-tag": t.filterByUserTag,
          "remove-user-tag": t.removeUserTag,
          "remove-user-tag-from-font": t.removeUserTagFromFont,
          "cancel-add-user-tag": t.cancelAddUserTag
        }
      });
    }
```