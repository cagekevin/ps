# font-manage-list-font-weight · 方法实现

> 来源：`font-manage-list-font-weight.js`
> 方法数：2

## `toggle`


```js
function () {
      this.open = !this.open;
    }
```

## `selectFontWeight`

参数：`t`

```js
function (t) {
      this.current = t;
      this.$emit("select-font-weight", t);
    }
```
