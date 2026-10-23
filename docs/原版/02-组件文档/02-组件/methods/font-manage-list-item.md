# font-manage-list-item · 方法实现

> 来源：`font-manage-list-item.js`
> 方法数：3

## `selectFont`


```js
function () {
      this.$emit("select-font", this.font);
    }
```

## `tagToFont`


```js
function () {
      this.$emit("tag-to-font", this.font);
    }
```

## `ratingToFont`

参数：`t`

```js
function (t) {
      this.$emit("rating-to-font", this.font, t);
    }
```
