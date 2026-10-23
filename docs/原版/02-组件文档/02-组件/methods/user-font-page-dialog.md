# user-font-page-dialog · 方法实现

> 来源：`user-font-page-dialog.js`
> 方法数：2

## `confirm`


```js
function () {
      this.$emit(`confirm-${this.type}`, {
        value: this.inputVal
      });
    }
```

## `cancel`


```js
function () {
      this.$emit(`cancel-${this.type}`);
    }
```
