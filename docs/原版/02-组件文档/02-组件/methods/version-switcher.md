# version-switcher · 方法实现

> 来源：`version-switcher.js`
> 方法数：5

## `changeVersion`


```js
function () {
      this.switchVersion(!this.checked);
    }
```

## `switchVersion`

参数：`t`

```js
function (t) {
      this.checked = t;
      this.open = !this.open;
    }
```

## `confirm`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.waiting) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                t.waiting = true;
                n = t.vsm.switchToVersionType(t.currentVersionType);
                e.prev = 4;
                e.next = 7;
                return t.switchTo(n);
              case 7:
                t.waiting = false;
                t.open = false;
                e.next = 17;
                break;
              case 11:
                e.prev = 11;
                e.t0 = e.catch(4);
                console.error("switch version failed: ", e.t0);
                G.a.warning("切换版本失败，请稍后尝试");
                t.waiting = false;
                t.open = false;
              case 17:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[4, 11]]);
      }))();
    }
```

## `cancel`


```js
function () {
      this.changeVersion();
    }
```

## `e`


```js
e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.waiting) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                t.waiting = true;
                n = t.vsm.switchToVersionType(t.currentVersionType);
                e.prev = 4;
                e.next = 7;
                return t.switchTo(n);
              case 7:
                t.waiting = false;
                t.open = false;
                e.next = 17;
                break;
              case 11:
                e.prev = 11;
                e.t0 = e.catch(4);
                console.error("switch version failed: ", e.t0);
                G.a.warning("切换版本失败，请稍后尝试");
                t.waiting = false;
                t.open = false;
              case 17:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[4, 11]]);
      }
```
