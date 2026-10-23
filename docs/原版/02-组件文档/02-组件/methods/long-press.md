# long-press · 方法实现

> 来源：`long-press.js`
> 方法数：4

## `handleMousedown`


```js
function () {
      var t = this;
      this.isMouseDown = true;
      this.timer = setTimeout(function () {
        if (t.isMouseDown) {
          t.hasFiredLongPress = true;
          t.$emit("longPress");
        }
      }, 300);
    }
```

## `handleMouseup`


```js
function () {
      clearTimeout(this.timer);
      this.isMouseDown = false;
    }
```

## `handleClick`

参数：`t`

```js
function (t) {
      if (this.hasFiredLongPress) {
        this.hasFiredLongPress = false;
        t.stopPropagation();
        return;
      }
      this.$emit("click");
    }
```

## `setTimeout`

参数：`function (`

```js
setTimeout(function () {
        if (t.isMouseDown) {
          t.hasFiredLongPress = true;
          t.$emit("longPress");
        }
      }
```
