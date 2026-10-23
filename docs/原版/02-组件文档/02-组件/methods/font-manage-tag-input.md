# font-manage-tag-input · 方法实现

> 来源：`font-manage-tag-input.js`
> 方法数：5

## `onkeydown`

参数：`t`

```js
function (t) {
      if (t.key === "Enter" || t.code === "Enter") {
        this.$emit("add-user-tag", this.text);
      }
    }
```

## `oninput`


```js
function () {
      this.text = this.text.slice(0, 8);
      this.added = false;
      this.$emit("set-text", this.text);
    }
```

## `clearText`


```js
function () {
      this.text = "";
    }
```

## `addTag`


```js
function () {
      var t = this;
      this.$emit("add-user-tag", this.text);
      requestAnimationFrame(function () {
        return t.added = true;
      });
    }
```

## `requestAnimationFrame`

参数：`function (`

```js
requestAnimationFrame(function () {
        return t.added = true;
      }
```
