# 模板 · user-font-page-modal

> 来源：`56d7.js` render 函数 `$k`（行 40816）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<FilterPanel />
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("FilterPanel", {
    attrs: {
      tagCategories: t.tagCategories
    },
    on: {
      "toggle-tag-filter": t.toggleTagFilter,
      "clean-category-filter": t.cleanCategoryFilter
    }
  });
}
```