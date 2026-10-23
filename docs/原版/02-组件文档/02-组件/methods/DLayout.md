# DLayout · 方法实现

> 来源：`DLayout.js`
> 方法数：3

## `getClientHeight`


```js
function () {
      this.clientHeight = this.containerHeight || document.body.clientHeight;
    }
```

## `handleScroll`

参数：`t`

```js
function (t) {
      this.$emit("scroll", t);
    }
```

## `loadMore`


```js
function () {
      this.$emit("loadMore");
    }
```
