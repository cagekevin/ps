# activate-modal · 方法实现

> 来源：`activate-modal.js`
> 方法数：3

## `ok`


```js
function () {
      var t = this.value.replace(/\s*/g, "");
      if (t != "") {
        this.$emit("ok", this.value);
      } else {
        this.showErr = "激活码不能为空";
      }
    }
```

## `cancel`


```js
function () {
      this.close();
      this.$emit("cancel");
    }
```

## `close`


```js
function () {
      this.err = "";
      this.value = "";
      this.$emit("close");
    }
```
