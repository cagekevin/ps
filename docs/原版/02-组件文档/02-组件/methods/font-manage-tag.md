# font-manage-tag · 方法实现

> 来源：`font-manage-tag.js`
> 方法数：3

## `openContextMenu`

参数：`t`

```js
function (t) {
      this.$emit("open-context-menu", Object(P.a)(Object(P.a)({}, this.tag), {}, {
        event: {
          left: t.clientX + 5,
          top: t.clientY + 5
        }
      }));
    }
```

## `toggle`


```js
function () {
      this.$emit("toggle-tag", Object(P.a)(Object(P.a)({}, this.tag), {}, {
        selected: !this.tag.selected
      }));
    }
```

## `close`


```js
function () {
      this.$emit("close-tag", this.tag);
    }
```
