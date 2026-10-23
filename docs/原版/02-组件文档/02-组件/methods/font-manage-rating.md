# font-manage-rating · 方法实现

> 来源：`font-manage-rating.js`
> 方法数：3

## `enter`

参数：`t`

```js
function (t) {
      this.score = t;
    }
```

## `leave`


```js
function () {
      this.score = this.selected;
    }
```

## `rating`

参数：`t`

```js
function (t) {
      this.$emit("rating", t);
    }
```
