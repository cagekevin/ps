# list-bottom · 方法实现

> 来源：`list-bottom.js`
> 方法数：2

## `handleSort`

参数：`t`

```js
function (t) {
      if (!this.disabled) {
        this.$emit("handleSort", t);
      }
    }
```

## `handleColumnChange`

参数：`t`

```js
function (t) {
      if (!this.disabled) {
        this.$emit("handleColumnChange", t);
      }
    }
```
