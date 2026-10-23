# font-manage-filter-panel · 方法实现

> 来源：`font-manage-filter-panel.js`
> 方法数：2

## `toggleTagFilter`

参数：`t`

```js
function (t) {
      this.$emit("toggle-tag-filter", t);
    }
```

## `cleanCategoryFilter`

参数：`t`

```js
function (t) {
      this.$emit("clean-category-filter", t);
    }
```
