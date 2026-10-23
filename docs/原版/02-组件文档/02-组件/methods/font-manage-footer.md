# font-manage-footer · 方法实现

> 来源：`font-manage-footer.js`
> 方法数：5

## `useText`

参数：`t`

```js
function (t) {
      this.$emit("use-text", t);
    }
```

## `setPreviewText`

参数：`t`

```js
function (t) {
      this.$emit("set-preview-text", t);
    }
```

## `setPreviewMode`

参数：`t`

```js
function (t) {
      this.$emit("set-preview-mode", t);
    }
```

## `togglePreviewTextPanel`


```js
function () {
      this.show = !this.show;
    }
```

## `closePreviewTextPanel`

参数：`t`

```js
function (t) {
      var e = this.$refs["preview-text"];
      if (e && !e.$el.contains(t.target)) {
        this.show = false;
      }
    }
```
