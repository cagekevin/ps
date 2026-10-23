# 模板 · font-manage-tag-group

> 来源：`app.v4.js` render 函数 `Xg`（行 44041）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__header">
  <div class="font-manage__header__search">
    <Search @search />
    <FilterPreview />
  </div>
  <div class="font-manage__header__filter_count">
    <span>
      全部(
    </span>
  </div>
  <div class="font-manage__header__filter_count">
    <span>
      筛选结果(
    </span>
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
        staticClass: "font-manage__header"
      }, [n("div", {
        staticClass: "font-manage__header__search"
      }, [n("Search", {
        attrs: {
          "default-text": t.searchText
        },
        on: {
          search: t.filterByText
        }
      }), n("FilterPreview", {
        attrs: {
          tags: t.tagFilters
        },
        on: {
          "remove-tag-filter": t.removeTagFilter,
          "toggle-filter-panel": t.toggleFilterPanel
        }
      })], 1), t._t("default"), t.noFilter ? n("div", {
        staticClass: "font-manage__header__filter_count"
      }, [n("span", [t._v("全部(" + t._s(t.count) + ")")])]) : n("div", {
        staticClass: "font-manage__header__filter_count"
      }, [n("span", [t._v("筛选结果(" + t._s(t.count) + ")")])])], 2);
    }
```