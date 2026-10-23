# font-manage-search · 方法实现

> 来源：`font-manage-search.js`
> 方法数：2

## `search`


```js
function () {
      this.$emit("search", this.text);
    }
```

## `clearText`


```js
function () {
      this.text = "";
      this.$emit("search", this.text);
    }
```
