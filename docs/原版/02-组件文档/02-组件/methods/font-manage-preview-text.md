# font-manage-preview-text · 方法实现

> 来源：`font-manage-preview-text.js`
> 方法数：3

## `onkeydown`

参数：`t`

```js
function (t) {
      if (t.key === "Enter" || t.code === "Enter") {
        this.useText();
      }
    }
```

## `useText`


```js
function () {
      if (this.text) {
        this.$emit("use-text", this.text);
      }
    }
```

## `previewText`


```js
function () {
      this.$emit("set-preview-text", this.text);
    }
```
