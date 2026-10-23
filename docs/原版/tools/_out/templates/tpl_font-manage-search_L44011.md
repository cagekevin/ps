# 模板 · font-manage-search

> 来源：`app.v4.js` render 函数 `Wg`（行 44011）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Header>
  <UserTagFilter />
</Header>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("Header", {
        attrs: {
          "search-text": t.searchText,
          "tag-filters": t.tagFilters,
          "tag-categories": t.tagCategories,
          count: t.total,
          "no-filter": t.noFilter
        },
        on: {
          "filter-by-text": t.filterByText,
          "remove-tag-filter": t.removeTagFilter,
          "toggle-filter-panel": t.toggleFilterPanel
        }
      }, [n("UserTagFilter", {
        attrs: {
          tags: t.userTags
        },
        on: {
          "filter-by-user-tag": t.filterByUserTag,
          "remove-user-tag": t.removeUserTag,
          "rename-user-tag": t.renameUserTag,
          "toggle-tag-manage": t.toggleTagManage
        }
      })], 1);
    }
```