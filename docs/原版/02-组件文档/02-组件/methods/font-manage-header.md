# font-manage-header · 方法实现

> 来源：`font-manage-header.js`
> 方法数：3

## `filterByText`

参数：`t`

```js
function (t) {
      this.$emit("filter-by-text", t);
    }
```

## `removeTagFilter`

参数：`t`

```js
function (t) {
      this.$emit("remove-tag-filter", t);
    }
```

## `toggleFilterPanel`

参数：`t`

```js
function (t) {
      this.$emit("toggle-filter-panel", t);
    }
```
