# fileChilder · 方法实现

> 来源：`fileChilder_2.js`
> 方法数：5

## `getFolderLineLength`

参数：`t`

```js
function (t) {
      var e = function t(e) {
        if (!e.showChildren) {
          return 0;
        }
        var n = e.children.reduce(function (e, n) {
          var a = e + (n.showChildren ? t(n) : 0);
          return a;
        }, e.children.length);
        return n;
      };
      var n = e(t);
      return n * 25 + "px";
    }
```

## `setShowChildren`

参数：`t`

```js
function (t) {
      t.showChildren = !t.showChildren;
      this.$emit("changeShowChildren");
    }
```

## `select`

参数：`t, e`

```js
function (t, e) {
      this.$emit("changeId", e.id);
    }
```

## `changeId`

参数：`t`

```js
function (t) {
      this.$emit("changeId", t);
    }
```

## `t`

参数：`e`

```js
t(e) {
        if (!e.showChildren) {
          return 0;
        }
        var n = e.children.reduce(function (e, n) {
          var a = e + (n.showChildren ? t(n) : 0);
          return a;
        }, e.children.length);
        return n;
      }
```
