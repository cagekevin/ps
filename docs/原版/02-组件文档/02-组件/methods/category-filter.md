# category-filter · 方法实现

> 来源：`category-filter.js`
> 方法数：2

## `toggleMore`


```js
function () {
      if (!this.disabled) {
        this.moreShow = !this.moreShow;
        this.$emit("categoreFilterMoreChange");
      }
    }
```

## `filter`

参数：`t`

```js
function (t) {
      this.$emit("filter", t);
    }
```
