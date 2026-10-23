# font-manage-user-tag-overlay · 方法实现

> 来源：`font-manage-user-tag-overlay.js`
> 方法数：2

## `remove`


```js
function () {
      this.$emit("remove-tag");
      this.closeOverlay();
    }
```

## `rename`


```js
function () {
      this.$emit("rename-tag");
      this.closeOverlay();
    }
```
