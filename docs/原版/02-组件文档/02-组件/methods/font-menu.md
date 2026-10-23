# font-menu · 方法实现

> 来源：`font-menu.js`
> 方法数：6

## `importFont`


```js
function () {
      this.setOptionType(bg.Import);
      this.closeMenu();
    }
```

## `exportFont`


```js
function () {
      this.setOptionType(bg.Export);
      this.closeMenu();
    }
```

## `disclaimer`


```js
function () {
      this.setOptionType(bg.Disclaimer);
      this.closeMenu();
    }
```

## `setOptionType`

参数：`t`

```js
function (t) {
      this.$emit("set-option-type", t);
    }
```

## `closeMenu`


```js
function () {
      var t = this;
      setTimeout(function () {
        return t.$emit("close-menu");
      }, 20);
    }
```

## `setTimeout`

参数：`function (`

```js
setTimeout(function () {
        return t.$emit("close-menu");
      }
```
