# buy-reminder-dialog · 方法实现

> 来源：`buy-reminder-dialog.js`
> 方法数：3

## `handleClose`


```js
function () {
      this.$emit("close");
    }
```

## `jumpToBuy`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.getAccessToken();
              case 2:
                n = e.sent;
                a = t.buyQuery;
                i = t.umsHost;
                r = t.pszhuliHost;
                t.userService.toBuy({
                  accessToken: n,
                  umsHost: i,
                  pszhuliHost: r,
                  buyQuery: a
                });
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `e`


```js
e() {
        var n;
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.getAccessToken();
              case 2:
                n = e.sent;
                a = t.buyQuery;
                i = t.umsHost;
                r = t.pszhuliHost;
                t.userService.toBuy({
                  accessToken: n,
                  umsHost: i,
                  pszhuliHost: r,
                  buyQuery: a
                });
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }
```
