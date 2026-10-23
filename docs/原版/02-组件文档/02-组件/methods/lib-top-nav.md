# lib-top-nav · 方法实现

> 来源：`lib-top-nav.js`
> 方法数：1

## `setSwitchIndex`

参数：`t`

```js
function (t) {
      if (!this.disabled) {
        this.$emit("setSwitchIndex", t);
      }
    }
```
