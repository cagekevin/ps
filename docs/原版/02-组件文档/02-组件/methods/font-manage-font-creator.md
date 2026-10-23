# font-manage-font-creator · 方法实现

> 来源：`font-manage-font-creator.js`
> 方法数：4

## `setText`

参数：`t`

```js
function (t) {
      this.text = t;
    }
```

## `addUserTag`


```js
function () {
      this.$emit("add-user-tag", {
        text: this.text,
        autoClose: true
      });
    }
```

## `cancel`


```js
function () {
      var t = this;
      this.$emit("cancel-add-user-tag");
      requestAnimationFrame(function () {
        return t.text = "";
      });
    }
```

## `requestAnimationFrame`

参数：`function (`

```js
requestAnimationFrame(function () {
        return t.text = "";
      }
```
