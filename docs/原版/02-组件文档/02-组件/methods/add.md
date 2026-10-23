# add · 方法实现

> 来源：`add.js`
> 方法数：8

## `fetchData`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("dz_getActionList");
              case 2:
                t.data = e.sent;
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `choose`

参数：`t`

```js
function (t) {
      this.current = t;
    }
```

## `onCheckAllChange`

参数：`t`

```js
function (t) {
      this.toggleAll(t.target.checked);
      this.indeterminate = false;
    }
```

## `toggleAll`

参数：`t`

```js
function (t) {
      var e = this.data[this.current].children;
      e.forEach(function (e) {
        e.isAdd = t;
      });
    }
```

## `onCheckChange`

参数：`t, e`

```js
function (t, e) {
      var n = this.data[this.current].children;
      n[e].isAdd = t.target.checked;
      var a = n.reduce(function (t, e) {
        if (e.isAdd) {
          return t + 1;
        } else {
          return t;
        }
      }, 0);
      this.indeterminate = a > 0 && a < n.length;
      this.checkAll = a > 0 && a === n.length;
    }
```

## `cancel`


```js
function () {
      this.$emit("cancel");
    }
```

## `confirm`


```js
function () {
      var t = [];
      this.data.forEach(function (e) {
        var n = e.name;
        e.children.forEach(function (e) {
          if (e.isAdd) {
            t.push({
              group: n,
              name: e.name
            });
          }
        });
      });
      this.$emit("confirm", t);
    }
```

## `e`


```js
e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("dz_getActionList");
              case 2:
                t.data = e.sent;
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }
```
