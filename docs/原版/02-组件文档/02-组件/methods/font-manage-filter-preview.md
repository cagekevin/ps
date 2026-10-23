# font-manage-filter-preview · 方法实现

> 来源：`font-manage-filter-preview.js`
> 方法数：2

## `closeTag`

参数：`t`

```js
function (t) {
      this.$emit("remove-tag-filter", t);
    }
```

## `toggleFilterPanel`


```js
function () {
      var t = this.$refs["filter-preview-header"].getBoundingClientRect();
      var e = t.bottom;
      this.$emit("toggle-filter-panel", {
        right: 8,
        top: e + 5
      });
    }
```
