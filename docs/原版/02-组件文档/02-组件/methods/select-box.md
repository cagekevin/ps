# select-box · 方法实现

> 来源：`select-box.js`
> 方法数：2

## `toggle`

参数：`t`

```js
function (t) {
      this.visibility = t;
      this.$emit("toggle", t);
    }
```

## `choose`

参数：`t`

```js
function (t) {
      this.current = t;
      this.toggle(false);
      this.$emit("choose", t);
    }
```
